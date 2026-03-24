// ══════════════════════════════════════════════════════════════
// LITPERPRO — Health Check Endpoint
// ══════════════════════════════════════════════════════════════

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-cache');
  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
}
