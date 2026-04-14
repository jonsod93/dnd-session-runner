// Notion database IDs
export const LOCATIONS_DB_ID = '1372674d-44b5-812e-b947-ee4c1e09cfaa'
export const SESSIONS_DB_ID = '1372674d-44b5-8137-8898-f2d955405fd9'
export const PEOPLE_DB_ID = '1372674d-44b5-81a5-a374-c0ee38a5ca16'
export const ORGANIZATIONS_DB_ID = '1372674d-44b5-812d-9a5e-da895d041d0c'
export const WORLD_MASTER_ID = '1382674d44b580d788daf4515b74772f'
export const INGREDIENTS_DB_ID = '1b82674d-44b5-8029-adc7-ee083f2dc165'
export const TRADE_ITEMS_DB_ID = '3312674d-44b5-80bf-bb57-cea20b6fc2f5'
export const ECONOMY_DB_ID = '1372674d-44b5-8162-8a92-cb056b34e6ae'

// Extract plain text from Notion rich_text array
export function richTextToPlain(richText) {
  if (!richText) return ''
  return richText.map((t) => t.plain_text ?? t.text?.content ?? '').join('')
}

// Extract a preview string from Notion page blocks (plain text, for tooltips)
export function blocksToPreview(blocks, maxLength = 400) {
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
  return result.length > maxLength ? result.slice(0, maxLength) + '…' : result
}

// Extract structured blocks for rich rendering (headings, paragraphs, lists, etc.)
// Returns [{ type: 'heading'|'paragraph'|'list-item'|'quote'|'callout'|'divider', text, level? }]
export function blocksToStructured(blocks) {
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
      if (text) {
        const children = block._children ? blocksToStructured(block._children) : []
        result.push({ type: 'toggle', text, children })
      }
    } else if (type === 'divider') {
      result.push({ type: 'divider' })
    }
  }
  return result
}

// Recursively fetch all blocks, expanding children of toggles, columns, etc.
export async function fetchBlocksRecursive(pageId, maxDepth = 3) {
  const topBlocks = await fetchPageBlocks(pageId)
  return flattenBlocks(topBlocks, maxDepth)
}

async function flattenBlocks(blocks, depthLeft) {
  const result = []
  for (const block of blocks) {
    if (block.has_children && depthLeft > 0) {
      const type = block.type
      // Expand toggles, toggleable headings, column_lists, columns, synced_block, and any other container
      const expandable = type === 'toggle' || type === 'column_list' || type === 'column' || type === 'synced_block'
        || type === 'heading_1' || type === 'heading_2' || type === 'heading_3'
      if (expandable) {
        try {
          const children = await fetchPageBlocks(block.id)
          const nested = await flattenBlocks(children, depthLeft - 1)
          if (type === 'toggle') {
            // Keep toggle children nested for collapsible rendering
            block._children = nested
          } else {
            // Flatten other containers (columns, synced_block, etc.)
            result.push(block)
            result.push(...nested)
            continue
          }
        } catch {
          // Skip blocks we can't fetch
        }
      }
    }
    result.push(block)
  }
  return result
}

// Extract property values from a Notion page object
export function extractPageProps(page) {
  const props = page.properties ?? {}
  const title = richTextToPlain(props.Name?.title)
  const blurb = props.Blurb?.rich_text ? richTextToPlain(props.Blurb.rich_text) : ''
  const types = (props.Type?.multi_select ?? []).map((t) => t.name)
  const tags = (props.Tags?.multi_select ?? []).map((t) => t.name)
  return { title, blurb, types, tags, id: page.id }
}

// Build Notion page URL from page ID
export function notionPageUrl(pageId) {
  return `https://www.notion.so/${pageId.replace(/-/g, '')}`
}

// Helper: call Notion API via our proxy
// In dev mode, Vite proxy handles /api/notion/* directly.
// In production, we use /api/notion with X-Notion-Path header.
async function notionFetch(notionPath, options = {}) {
  const isDev = import.meta.env.DEV
  if (isDev) {
    // Vite proxy rewrites /api/notion/* to api.notion.com/*
    return fetch(`/api/notion/${notionPath}`, options)
  }
  // Production: single serverless function with path in header
  return fetch('/api/notion', {
    ...options,
    headers: {
      ...options.headers,
      'X-Notion-Path': notionPath,
    },
  })
}

// Search the Locations database via the proxy
export async function searchLocations(query) {
  const res = await notionFetch(`v1/databases/${LOCATIONS_DB_ID}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filter: query
        ? {
            property: 'Name',
            title: { contains: query },
          }
        : undefined,
      page_size: 20,
      sorts: [{ property: 'Name', direction: 'ascending' }],
    }),
  })
  if (!res.ok) throw new Error(`Notion API error: ${res.status}`)
  const data = await res.json()
  return (data.results ?? []).map(extractPageProps)
}

// Fetch a single page's blocks
export async function fetchPageBlocks(pageId, pageSize = 100) {
  const res = await notionFetch(`v1/blocks/${pageId}/children?page_size=${pageSize}`)
  if (!res.ok) throw new Error(`Notion API error: ${res.status}`)
  const data = await res.json()
  return data.results ?? []
}

// Fetch a single page's properties
export async function fetchPageProps(pageId) {
  const res = await notionFetch(`v1/pages/${pageId}`)
  if (!res.ok) throw new Error(`Notion API error: ${res.status}`)
  return extractPageProps(await res.json())
}

// Extract relation property items (each has { id })
function extractRelations(prop) {
  if (!prop?.relation) return []
  return prop.relation.map((r) => ({ id: r.id, title: '' }))
}

// Fetch a page with full relation data resolved to titles
// Returns { ...extractPageProps, relations: { childLocations, npcs, organizations, ... } }
export async function fetchFullPage(pageId) {
  const res = await notionFetch(`v1/pages/${pageId}`)
  if (!res.ok) throw new Error(`Notion API error: ${res.status}`)
  const page = await res.json()
  const props = page.properties ?? {}
  const basic = extractPageProps(page)

  // Map Notion property names to our relation keys
  const RELATION_MAP = {
    'Child Locations': 'childLocations',
    'NPCs': 'npcs',
    'Orgs': 'organizations',
    'Peoples': 'peoples',
    'Quests': 'quests',
    'Items': 'items',
    'Killed Here': 'killedHere',
  }

  // Collect all relation IDs and resolve titles in parallel
  const relations = {}
  const toResolve = [] // [{ key, index, id }]

  for (const [propName, relKey] of Object.entries(RELATION_MAP)) {
    const items = extractRelations(props[propName])
    relations[relKey] = items
    items.forEach((item, idx) => {
      toResolve.push({ key: relKey, index: idx, id: item.id })
    })
  }

  // Resolve titles in batches (max 10 concurrent)
  if (toResolve.length > 0) {
    const batchSize = 10
    for (let i = 0; i < toResolve.length; i += batchSize) {
      const batch = toResolve.slice(i, i + batchSize)
      const results = await Promise.allSettled(
        batch.map(({ id }) =>
          notionFetch(`v1/pages/${id}`)
            .then((r) => r.ok ? r.json() : null)
            .then((p) => p ? richTextToPlain(p.properties?.Name?.title) || p.properties?.title?.title?.[0]?.plain_text || 'Untitled' : 'Untitled')
        )
      )
      batch.forEach(({ key, index }, j) => {
        const result = results[j]
        if (result.status === 'fulfilled') {
          relations[key][index].title = result.value
        }
      })
    }
  }

  return { ...basic, relations }
}

// Fetch all ingredients from the Ingredients database
// ── Cached Notion DB helpers for generators ──
// Cache TTL: 10 minutes. Serves from localStorage while fresh, then refreshes in background.
const CACHE_TTL = 10 * 60 * 1000

function getCached(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (!data) return null
    return { data, fresh: Date.now() - ts < CACHE_TTL }
  } catch { return null }
}

function setCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }))
  } catch { /* storage full, ignore */ }
}

export async function fetchIngredients() {
  const CACHE_KEY = 'gen-ingredients-v1'
  const cached = getCached(CACHE_KEY)

  // Return stale cache immediately but refresh in background
  if (cached && !cached.fresh) {
    fetchIngredientsFromNotion().then(items => setCache(CACHE_KEY, items)).catch(() => {})
    return cached.data
  }
  if (cached?.fresh) return cached.data

  const items = await fetchIngredientsFromNotion()
  setCache(CACHE_KEY, items)
  return items
}

async function fetchIngredientsFromNotion() {
  const res = await notionFetch(`v1/databases/${INGREDIENTS_DB_ID}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      page_size: 100,
      sorts: [{ property: 'Name', direction: 'ascending' }],
    }),
  })
  if (!res.ok) throw new Error(`Notion API error: ${res.status}`)
  const data = await res.json()
  return (data.results ?? []).map((page) => {
    const props = page.properties ?? {}
    return {
      name: richTextToPlain(props.Name?.title) || 'Unknown',
      rarity: props.Rarity?.select?.name || 'Common',
      location: (props.Location?.multi_select ?? []).map(s => s.name),
      description: richTextToPlain(props.Description?.rich_text) || '',
    }
  })
}

export async function fetchTradeItems() {
  const CACHE_KEY = 'gen-trade-items-v1'
  const cached = getCached(CACHE_KEY)

  if (cached && !cached.fresh) {
    fetchTradeItemsFromNotion().then(items => setCache(CACHE_KEY, items)).catch(() => {})
    return cached.data
  }
  if (cached?.fresh) return cached.data

  const items = await fetchTradeItemsFromNotion()
  setCache(CACHE_KEY, items)
  return items
}

async function fetchTradeItemsFromNotion() {
  const res = await notionFetch(`v1/databases/${TRADE_ITEMS_DB_ID}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      page_size: 100,
      sorts: [{ property: 'Name', direction: 'ascending' }],
    }),
  })
  if (!res.ok) throw new Error(`Notion API error: ${res.status}`)
  const data = await res.json()
  return (data.results ?? []).map((page) => {
    const props = page.properties ?? {}
    return {
      name: richTextToPlain(props.Name?.title) || 'Unknown',
      rarity: props.Rarity?.select?.name || 'Uncommon',
      type: props.Type?.select?.name || '',
      price: props['Price (gp)']?.number ?? 0,
      attunement: props.Attunement?.checkbox ?? false,
      description: richTextToPlain(props.Description?.rich_text) || '',
    }
  })
}

// ── Magic items (Economy DB) ──

export async function fetchMagicItems() {
  const CACHE_KEY = 'knowledge-magic-items-v1'
  const cached = getCached(CACHE_KEY)

  if (cached && !cached.fresh) {
    fetchMagicItemsFromNotion().then(items => setCache(CACHE_KEY, items)).catch(() => {})
    return cached.data
  }
  if (cached?.fresh) return cached.data

  const items = await fetchMagicItemsFromNotion()
  setCache(CACHE_KEY, items)
  return items
}

async function fetchMagicItemsFromNotion() {
  let allResults = []
  let startCursor = undefined
  let hasMore = true

  while (hasMore) {
    const body = {
      page_size: 100,
      filter: { property: 'World', relation: { contains: WORLD_MASTER_ID } },
      sorts: [{ property: 'Name', direction: 'ascending' }],
    }
    if (startCursor) body.start_cursor = startCursor

    const res = await notionFetch(`v1/databases/${ECONOMY_DB_ID}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Notion API error: ${res.status}`)
    const data = await res.json()
    allResults = allResults.concat(data.results ?? [])
    hasMore = data.has_more
    startCursor = data.next_cursor
  }

  return allResults.map((page) => {
    const props = page.properties ?? {}
    return {
      name: richTextToPlain(props.Name?.title) || 'Unknown',
      type: richTextToPlain(props.Type?.rich_text) || '',
      value: props.Value?.number ?? null,
      rarity: props.Rarity?.select?.name || 'Common',
      page: props.Page?.number ?? null,
      notes: richTextToPlain(props.Notes?.rich_text) || '',
    }
  })
}

// ── Generators: session search, page creation, block append ──

// Search the Sessions database
export async function searchSessions(query) {
  const res = await notionFetch(`v1/databases/${SESSIONS_DB_ID}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filter: query
        ? { property: 'Name', title: { contains: query } }
        : undefined,
      page_size: 15,
      sorts: [{ property: 'Session #', direction: 'descending' }],
    }),
  })
  if (!res.ok) throw new Error(`Notion API error: ${res.status}`)
  const data = await res.json()
  return (data.results ?? []).map((page) => {
    const props = page.properties ?? {}
    return {
      id: page.id,
      title: richTextToPlain(props.Name?.title),
      sessionNumber: props['Session #']?.number ?? null,
    }
  })
}

// Create a page in any Notion database
export async function createNotionPage(databaseId, properties) {
  const res = await notionFetch('v1/pages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Notion create failed (${res.status}): ${body}`)
  }
  return res.json()
}

// The purple "Generated content" heading block
const GENERATED_HEADING_BLOCK = {
  object: 'block',
  type: 'heading_2',
  heading_2: {
    rich_text: [{
      type: 'text',
      text: { content: 'Generated content this session' },
      annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'purple_background' },
    }],
    color: 'purple_background',
  },
}

// Append a mention to a session page under "Generated content this session"
// Inserts above the "Reference" heading, with a purple styled heading matching the red Reference style.
export async function appendSessionBlock(sessionPageId, mentionPageId) {
  const blocks = await fetchPageBlocks(sessionPageId)

  const bulletBlock = {
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [{ type: 'mention', mention: { type: 'page', page: { id: mentionPageId } } }],
    },
  }

  // Check if our heading already exists
  const generatedIdx = blocks.findIndex(
    (b) => b.type === 'heading_2' && richTextToPlain(b.heading_2?.rich_text) === 'Generated content this session'
  )

  if (generatedIdx !== -1) {
    // Heading exists - find last bullet after it to append after
    let afterBlockId = blocks[generatedIdx].id
    for (let i = generatedIdx + 1; i < blocks.length; i++) {
      if (blocks[i].type === 'bulleted_list_item') {
        afterBlockId = blocks[i].id
      } else {
        break
      }
    }
    const res = await notionFetch(`v1/blocks/${sessionPageId}/children`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ children: [bulletBlock], after: afterBlockId }),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Notion append failed (${res.status}): ${body}`)
    }
    return
  }

  // Heading doesn't exist - find the "Reference" heading and insert before it
  const referenceIdx = blocks.findIndex(
    (b) => b.type === 'heading_2' && richTextToPlain(b.heading_2?.rich_text) === 'Reference'
  )

  if (referenceIdx > 0) {
    // Insert after the block before "Reference"
    const beforeRefBlockId = blocks[referenceIdx - 1].id
    const res = await notionFetch(`v1/blocks/${sessionPageId}/children`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        children: [GENERATED_HEADING_BLOCK, bulletBlock],
        after: beforeRefBlockId,
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Notion append failed (${res.status}): ${body}`)
    }
  } else {
    // No Reference heading found - append at the end
    const res = await notionFetch(`v1/blocks/${sessionPageId}/children`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ children: [GENERATED_HEADING_BLOCK, bulletBlock] }),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Notion append failed (${res.status}): ${body}`)
    }
  }
}

// ── Property builders for different entity types ──

export function buildPersonProperties(name, blurb, relations = {}) {
  return {
    Name: { title: [{ text: { content: name } }] },
    ...(blurb ? { Blurb: { rich_text: [{ text: { content: blurb } }] } } : {}),
    World: { relation: [{ id: WORLD_MASTER_ID }] },
    ...(relations.locationId ? { Locations: { relation: [{ id: relations.locationId }] } } : {}),
    ...(relations.orgId ? { Orgs: { relation: [{ id: relations.orgId }] } } : {}),
  }
}

export function buildLocationProperties(name, type, blurb) {
  return {
    Name: { title: [{ text: { content: name } }] },
    Type: { multi_select: [{ name: type }] },
    ...(blurb ? { Blurb: { rich_text: [{ text: { content: blurb } }] } } : {}),
    World: { relation: [{ id: WORLD_MASTER_ID }] },
  }
}

export function buildOrgProperties(name, notes) {
  return {
    Name: { title: [{ text: { content: name } }] },
    ...(notes ? { Notes: { rich_text: [{ text: { content: notes } }] } } : {}),
    World: { relation: [{ id: WORLD_MASTER_ID }] },
  }
}
