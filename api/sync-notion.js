import { put, list } from '@vercel/blob'

const BLOB_PATH = 'pois.json'
const NOTION_API = 'https://api.notion.com'
const NOTION_VERSION = '2022-06-28'
const LOCATIONS_DB_ID = '1372674d-44b5-812e-b947-ee4c1e09cfaa'

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

function blocksToStructured(blocks) {
  const result = []
  for (const block of blocks) {
    const type = block.type
    if (type === 'heading_1' || type === 'heading_2' || type === 'heading_3') {
      const text = richTextToPlain(block[type]?.rich_text)
      if (text) result.push({ type: 'heading', text, level: parseInt(type.slice(-1)) })
    } else if (type === 'paragraph') {
      const text = richTextToPlain(block.paragraph?.rich_text)
      if (text) result.push({ type: 'paragraph', text })
    } else if (type === 'bulleted_list_item' || type === 'numbered_list_item') {
      const text = richTextToPlain(block[type]?.rich_text)
      if (text) result.push({ type: 'list-item', text })
    } else if (type === 'callout') {
      const text = richTextToPlain(block.callout?.rich_text)
      if (text) result.push({ type: 'callout', text })
    } else if (type === 'quote') {
      const text = richTextToPlain(block.quote?.rich_text)
      if (text) result.push({ type: 'quote', text })
    } else if (type === 'toggle') {
      const text = richTextToPlain(block.toggle?.rich_text)
      if (text) result.push({ type: 'heading', text, level: 3 })
    } else if (type === 'divider') {
      result.push({ type: 'divider' })
    }
  }
  return result
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function notionFetchRaw(path, options = {}) {
  const res = await fetch(`${NOTION_API}/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  return res
}

async function notionFetchWithRetry(path, options = {}, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await notionFetchRaw(path, options)
    if (res.status === 429 && attempt < retries) {
      const retryAfter = parseInt(res.headers.get('retry-after') || '1', 10)
      await sleep(retryAfter * 1000)
      continue
    }
    return res
  }
}

async function fetchPageBlocks(blockId) {
  const res = await notionFetchWithRetry(`v1/blocks/${blockId}/children?page_size=100`)
  if (!res.ok) throw new Error(`Notion blocks ${blockId} returned ${res.status}`)
  const data = await res.json()
  return data.results ?? []
}

async function flattenBlocks(blocks, depthLeft) {
  const result = []
  for (const block of blocks) {
    result.push(block)
    if (block.has_children && depthLeft > 0) {
      const type = block.type
      const expandable = type === 'toggle' || type === 'column_list' || type === 'column' || type === 'synced_block'
        || type === 'heading_1' || type === 'heading_2' || type === 'heading_3'
      if (expandable) {
        try {
          const children = await fetchPageBlocks(block.id)
          const nested = await flattenBlocks(children, depthLeft - 1)
          result.push(...nested)
        } catch {
          // Skip blocks we can't fetch
        }
      }
    }
  }
  return result
}

async function fetchNotionCache(pageId) {
  const propsRes = await notionFetchWithRetry(`v1/pages/${pageId}`)

  if (!propsRes.ok) {
    const status = propsRes.status
    if (status === 404) {
      return { title: '', blurb: '', types: [], tags: [], content: '', fullBlocks: [], lastSynced: new Date().toISOString(), notFound: true }
    }
    throw new Error(`Notion page ${pageId} returned ${status}`)
  }

  const props = extractPageProps(await propsRes.json())

  // Fetch top-level blocks, then recursively expand children
  const topBlocks = await fetchPageBlocks(pageId)
  const allBlocks = await flattenBlocks(topBlocks, 3)
  const content = blocksToPreview(allBlocks)
  const fullBlocks = blocksToStructured(allBlocks)

  return {
    title: props.title,
    blurb: props.blurb,
    types: props.types,
    tags: props.tags,
    content,
    fullBlocks,
    lastSynced: new Date().toISOString(),
  }
}

// ── Auth ──

function checkAuth(req) {
  const authHeader = req.headers['authorization'] || ''
  if (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) return true
  if (process.env.API_SECRET && authHeader === `Bearer ${process.env.API_SECRET}`) return true
  return false
}

// ── Handler (incremental sync) ──

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
    const poiByNotionId = new Map()
    for (const poi of pois) {
      if (poi.notionPageId) poiByNotionId.set(poi.notionPageId, poi)
    }

    if (poiByNotionId.size === 0) {
      return res.status(200).json({ updated: 0, message: 'No POIs with Notion pages' })
    }

    // Find the oldest lastSynced across all cached POIs (fallback: 24h ago)
    let sinceDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    for (const poi of poiByNotionId.values()) {
      if (poi.notionCache?.lastSynced && poi.notionCache.lastSynced < sinceDate) {
        sinceDate = poi.notionCache.lastSynced
      }
    }

    // Query Notion Locations database for pages edited after sinceDate
    const queryRes = await notionFetchWithRetry(`v1/databases/${LOCATIONS_DB_ID}/query`, {
      method: 'POST',
      body: JSON.stringify({
        filter: {
          timestamp: 'last_edited_time',
          last_edited_time: { after: sinceDate },
        },
        page_size: 100,
      }),
    })

    if (!queryRes.ok) {
      throw new Error(`Notion database query failed: ${queryRes.status}`)
    }

    const queryData = await queryRes.json()
    const changedPages = queryData.results ?? []

    // Filter to only pages that match our POIs
    const toUpdate = changedPages.filter((page) => poiByNotionId.has(page.id))
    const results = { updated: 0, failed: 0, checked: changedPages.length, total: poiByNotionId.size, errors: [] }

    // Process changed POIs in batches of 3
    const BATCH_SIZE = 3
    for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
      const batch = toUpdate.slice(i, i + BATCH_SIZE)
      const settled = await Promise.allSettled(
        batch.map(async (page) => {
          const poi = poiByNotionId.get(page.id)
          const cached = await fetchNotionCache(page.id)
          poi.notionCache = cached
        })
      )
      settled.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          results.updated++
        } else {
          const page = batch[idx]
          const poi = poiByNotionId.get(page.id)
          console.error(`[sync-notion] Failed "${poi.name}":`, result.reason?.message)
          results.failed++
          results.errors.push({ name: poi.name, error: result.reason?.message })
        }
      })
    }

    if (results.updated > 0) {
      await writeBlob(pois)
    }

    console.log(`[sync-notion] Done: ${results.checked} changed in Notion, ${results.updated} POIs updated, ${results.failed} failed`)
    return res.status(200).json(results)
  } catch (err) {
    console.error('[sync-notion] Fatal error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
