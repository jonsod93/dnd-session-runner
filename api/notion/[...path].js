/**
 * Catch-all proxy for Notion API requests.
 * Rewrites /api/notion/v1/... to https://api.notion.com/v1/...
 * and injects the Notion API key and version header.
 */
export default async function handler(req, res) {
  const notionKey = process.env.NOTION_API_KEY
  if (!notionKey) {
    return res.status(500).json({ error: 'NOTION_API_KEY not configured' })
  }

  // Build the Notion API URL from the catch-all path
  const path = req.query.path
  const notionPath = Array.isArray(path) ? path.join('/') : path
  const url = `https://api.notion.com/${notionPath}`

  try {
    // Forward the request to Notion
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
