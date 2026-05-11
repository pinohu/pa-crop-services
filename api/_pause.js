export function isServicePaused() {
  return process.env.SERVICE_PAUSED !== 'false';
}

export function setPauseCors(req, res) {
  const origin = req.headers?.origin || '';
  const allowedOrigins = [
    'https://pacropservices.com',
    'https://www.pacropservices.com'
  ];
  if (allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key, X-API-Key');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

export function sendPausedResponse(res) {
  res.setHeader('Retry-After', '86400');
  return res.status(503).json({
    success: false,
    error: 'service_paused',
    message: 'PA CROP Services is temporarily paused while payment confirmation and account setup are reviewed. No new purchases, upgrades, or onboarding submissions are being accepted right now. Please contact hello@pacropservices.com or call 814-228-2822 for help with an existing account.'
  });
}
