import { put, list } from '@vercel/blob'

const BLOB_PATH = 'pois.json'
const NOTION_API = 'https://api.notion.com'
const NOTION_VERSION = '2022-06-28'

export const config = { maxDuration: 60 }

// ── Notion helpers (duplicated from src/utils/notionUtils.js for serverless) ──

function richTextToPlain(richText) {
  if (!richText) return ''
  return richText.map((t) => t.plain_text ?? t.text?.content ?? '').join('')
}

function extractPageProps(page) {
  const props = page.properties ?? {}
  const title = richTextToPlain(props.Name?.title)
  const blurb = props.Blurb?.rich_text ? richTextToPlain(props.Blurb.rich_text) : ''
  const types = (props.Type?.multi_select ?? []).map((t) => t.name)
  const tags = (props.Tags?.multi_select ?? []).map((t) => t.name)
  return { title, blurb, types, tags, id: page.id }
}

function blocksToPreview(blocks, maxLength = 400) {
  const lines = []
  for (const block of blocks) {
    if (lines.join('\n').length > maxLength) break
    const type = block.type
    if (type === 'paragraph' || type === 'bulleted_list_item' || type === 'numbered_list_item') {
      const text = richTextToPlain(block[type]?.rich_text)
      if (text) lines.push(text)
    } else if (type === 'heading_1' || type === 'heading_2' || type === 'heading_3') {
      const text = richTextToPlain(block[type]?.rich_text)
      if (text) lines.push(text)
    } else if (type === 'callout') {
      const text = richTextToPlain(block.callout?.rich_text)
      if (text) lines.push(text)
    } else if (type === 'quote') {
      const text = richTextToPlain(block.quote?.rich_text)
      if (text) lines.push(text)
    } else if (type === 'toggle') {
      const text = richTextToPlain(block.toggle?.rich_text)
      if (text) lines.push(text)
    }
  }
  const result = lines.join('\n')
  return result.length > maxLength ? result.slice(0, maxLength) + '\u2026' : result
}

// ── Blob helpers (same pattern as api/pois.js) ──

async function readBlob() {
  const { blobs } = await list({ prefix: BLOB_PATH })
  if (blobs.length === 0) return null
  const response = await fetch(blobs[0].url)
  return response.json()
}

async function writeBlob(data) {
  await put(BLOB_PATH, JSON.stringify(data), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
  })
}

// ── Notion API fetchers ──

async function notionFetch(path) {
  const res = await fetch(`${NOTION_API}/${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
  })
  return res
}

async function fetchNotionCache(pageId) {
  const [propsRes, blocksRes] = await Promise.all([
    notionFetch(`v1/pages/${pageId}`),
    notionFetch(`v1/blocks/${pageId}/children?page_size=100`),
  ])

  if (!propsRes.ok) {
    const status = propsRes.status
    if (status === 404) return null
    throw new Error(`Notion page ${pageId} returned ${status}`)
  }

  const props = extractPageProps(await propsRes.json())
  const blocksData = blocksRes.ok ? await blocksRes.json() : { results: [] }
  const content = blocksToPreview(blocksData.results ?? [])

  return {
    title: props.title,
    blurb: props.blurb,
    types: props.types,
    tags: props.tags,
    content,
    lastSynced: new Date().toISOString(),
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ── Auth ──

function checkAuth(req) {
  // Vercel Cron sends CRON_SECRET automatically
  const authHeader = req.headers['authorization'] || ''
  if (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) return true
  // Also accept API_SECRET for manual triggers
  if (process.env.API_SECRET && authHeader === `Bearer ${process.env.API_SECRET}`) return true
  return false
}

// ── Handler ──

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!checkAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const notionKey = process.env.NOTION_API_KEY
  if (!notionKey) {
    return res.status(500).json({ error: 'NOTION_API_KEY not configured' })
  }

  try {
    const pois = (await readBlob()) ?? []
    const toSync = pois.filter((p) => p.notionPageId)
    const results = { updated: 0, failed: 0, skipped: 0, errors: [] }

    for (let i = 0; i < toSync.length; i++) {
      const poi = toSync[i]
      try {
        const cached = await fetchNotionCache(poi.notionPageId)
        poi.notionCache = cached
        results.updated++
      } catch (err) {
        console.error(`[sync-notion] Failed to sync POI "${poi.name}" (${poi.notionPageId}):`, err.message)
        results.failed++
        results.errors.push({ name: poi.name, error: err.message })
      }

      // Rate limit: wait 350ms between POIs (Notion free tier: 3 req/s)
      if (i < toSync.length - 1) {
        await sleep(350)
      }
    }

    results.skipped = pois.length - toSync.length
    await writeBlob(pois)

    console.log(`[sync-notion] Done: ${results.updated} updated, ${results.failed} failed, ${results.skipped} skipped`)
    return res.status(200).json(results)
  } catch (err) {
    console.error('[sync-notion] Fatal error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
