/**
 * Proxy for Notion API requests.
 * Client sends the Notion sub-path via X-Notion-Path header.
 * e.g. X-Notion-Path: v1/databases/abc123/query
 */
export default async function handler(req, res) {
  const notionKey = process.env.NOTION_API_KEY
  if (!notionKey) {
    return res.status(500).json({ error: 'NOTION_API_KEY not configured' })
  }

  const notionPath = req.headers['x-notion-path']
  if (!notionPath) {
    return res.status(400).json({ error: 'Missing X-Notion-Path header' })
  }

  const url = `https://api.notion.com/${notionPath}`

  try {
    const fetchOptions = {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${notionKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
    }

    // Forward body for non-GET requests
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = JSON.stringify(req.body)
    }

    const response = await fetch(url, fetchOptions)
    const data = await response.json()

    res.status(response.status).json(data)
  } catch (err) {
    console.error('[api/notion] Proxy error:', err.message)
    res.status(500).json({ error: 'Notion API proxy error' })
  }
}
