const path = require('path')
const fs = require('fs')

/**
 * GET /api/creatures
 * Returns the contents of src/data/improved-initiative.json.
 * Update that file with your Improved Initiative export to reflect new data
 * across all connected clients on next request.
 */
module.exports = (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const filePath = path.join(process.cwd(), 'improved-initiative.json')
    const raw = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(raw)

    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json(data)
  } catch (err) {
    console.error('[api/creatures] Failed to read data file:', err.message)
    res.status(500).json({ error: 'Could not load creature data' })
  }
}
