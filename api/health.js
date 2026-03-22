/**
 * GET /api/health
 * Simple health check — useful for uptime monitors and verifying the
 * serverless function layer is reachable.
 */
module.exports = (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
}
