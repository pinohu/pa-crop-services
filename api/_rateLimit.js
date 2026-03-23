// PA CROP Services — Rate Limiter Utility
// In-memory rate limiting for Vercel serverless functions
// Note: Each serverless instance has its own memory, so this provides
// burst protection within a single instance. For distributed rate limiting,
// upgrade to Vercel KV or Upstash Redis.

const rateLimitMap = new Map();

// Clean expired entries every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitMap) {
    if (now - data.windowStart > data.windowMs * 2) {
      rateLimitMap.delete(key);
    }
  }
}, 60000);

/**
 * Rate limit by IP address
 * @param {object} req - Vercel request object
 * @param {object} res - Vercel response object  
 * @param {number} maxRequests - Max requests per window (default 20)
 * @param {number} windowMs - Window in milliseconds (default 60000 = 1 min)
 * @returns {boolean} true if rate limited (caller should return), false if OK
 */
export function rateLimit(req, res, maxRequests = 20, windowMs = 60000) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
           || req.headers['x-real-ip']
           || req.socket?.remoteAddress
           || 'unknown';
  
  const key = `${ip}:${req.url?.split('?')[0] || 'unknown'}`;
  const now = Date.now();
  
  let data = rateLimitMap.get(key);
  
  if (!data || now - data.windowStart > windowMs) {
    data = { count: 1, windowStart: now, windowMs };
    rateLimitMap.set(key, data);
    return false;
  }
  
  data.count++;
  
  if (data.count > maxRequests) {
    const retryAfter = Math.ceil((data.windowStart + windowMs - now) / 1000);
    res.setHeader('Retry-After', String(retryAfter));
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', '0');
    res.status(429).json({ 
      error: 'Too many requests. Please try again later.',
      retryAfter 
    });
    return true;
  }
  
  res.setHeader('X-RateLimit-Limit', String(maxRequests));
  res.setHeader('X-RateLimit-Remaining', String(maxRequests - data.count));
  return false;
}
