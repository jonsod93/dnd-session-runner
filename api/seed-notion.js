import { put, list } from '@vercel/blob'

const BLOB_PATH = 'pois.json'
const NOTION_API = 'https://api.notion.com'
const NOTION_VERSION = '2022-06-28'
const BATCH_SIZE = 3
const MAX_PER_CALL = 15

// Vercel Hobby allows up to 60s with this config
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

// ── Blob helpers ──

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function notionFetchRaw(path) {
  return fetch(`${NOTION_API}/${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
  })
}

async function notionFetchWithRetry(path, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await notionFetchRaw(path)
    if (res.status === 429 && attempt < retries) {
      const retryAfter = parseInt(res.headers.get('retry-after') || '1', 10)
      await sleep(retryAfter * 1000)
      continue
    }
    return res
  }
}

async function fetchNotionCache(pageId) {
  const [propsRes, blocksRes] = await Promise.all([
    notionFetchWithRetry(`v1/pages/${pageId}`),
    notionFetchWithRetry(`v1/blocks/${pageId}/children?page_size=100`),
  ])

  if (!propsRes.ok) {
    if (propsRes.status === 404) return null
    throw new Error(`Notion page ${pageId} returned ${propsRes.status}`)
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

// ── Auth ──

function checkAuth(req) {
  const authHeader = req.headers['authorization'] || ''
  if (process.env.API_SECRET && authHeader === `Bearer ${process.env.API_SECRET}`) return true
  return false
}

// ── Handler ──
// Call repeatedly to seed all POIs. Each call processes up to MAX_PER_CALL
// un-cached POIs. Returns { remaining } so you know when it's done.
//
// Usage: curl -H "Authorization: Bearer $SECRET" .../api/seed-notion
// Keep calling until remaining === 0.

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!checkAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!process.env.NOTION_API_KEY) {
    return res.status(500).json({ error: 'NOTION_API_KEY not configured' })
  }

  try {
    const pois = (await readBlob()) ?? []
    const unseeded = pois.filter((p) => p.notionPageId && !p.notionCache)
    const toProcess = unseeded.slice(0, MAX_PER_CALL)

    if (toProcess.length === 0) {
      return res.status(200).json({
        message: 'All POIs are seeded',
        remaining: 0,
        total: pois.length,
        cached: pois.filter((p) => p.notionCache).length,
      })
    }

    const results = { updated: 0, failed: 0, errors: [] }

    for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
      const batch = toProcess.slice(i, i + BATCH_SIZE)
      const settled = await Promise.allSettled(
        batch.map(async (poi) => {
          const cached = await fetchNotionCache(poi.notionPageId)
          poi.notionCache = cached
        })
      )
      settled.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          results.updated++
        } else {
          const poi = batch[idx]
          console.error(`[seed-notion] Failed "${poi.name}":`, result.reason?.message)
          results.failed++
          results.errors.push({ name: poi.name, error: result.reason?.message })
        }
      })
    }

    await writeBlob(pois)

    const remaining = unseeded.length - results.updated
    console.log(`[seed-notion] Seeded ${results.updated}, failed ${results.failed}, remaining ${remaining}`)

    return res.status(200).json({
      ...results,
      remaining,
      total: pois.length,
      cached: pois.filter((p) => p.notionCache).length,
    })
  } catch (err) {
    console.error('[seed-notion] Fatal error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
