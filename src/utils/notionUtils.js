// Notion database ID for Locations
export const LOCATIONS_DB_ID = '1372674d-44b5-812e-b947-ee4c1e09cfaa'

// Extract plain text from Notion rich_text array
export function richTextToPlain(richText) {
  if (!richText) return ''
  return richText.map((t) => t.plain_text ?? t.text?.content ?? '').join('')
}

// Extract a preview string from Notion page blocks
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
    }
  }
  const result = lines.join('\n')
  return result.length > maxLength ? result.slice(0, maxLength) + '…' : result
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

// Search the Locations database via the proxy
export async function searchLocations(query) {
  const res = await fetch(`/api/notion/v1/databases/${LOCATIONS_DB_ID}/query`, {
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

// Fetch a single page's blocks for preview
export async function fetchPageBlocks(pageId) {
  const res = await fetch(`/api/notion/v1/blocks/${pageId}/children?page_size=30`)
  if (!res.ok) throw new Error(`Notion API error: ${res.status}`)
  const data = await res.json()
  return data.results ?? []
}

// Fetch a single page's properties
export async function fetchPageProps(pageId) {
  const res = await fetch(`/api/notion/v1/pages/${pageId}`)
  if (!res.ok) throw new Error(`Notion API error: ${res.status}`)
  return extractPageProps(await res.json())
}
