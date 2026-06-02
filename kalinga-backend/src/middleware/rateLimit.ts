import { Request, Response, NextFunction } from 'express';

interface RateLimitData {
  count: number;
  resetTime: number;
}

const ipCache = new Map<string, RateLimitData>();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 120;     // Max requests per window

// Periodic cleanup of expired entries to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipCache.entries()) {
    if (now > data.resetTime) {
      ipCache.delete(ip);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  // Use X-Forwarded-For if behind a proxy like Render, otherwise fallback to socket address
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  let limitData = ipCache.get(ip);

  if (!limitData || now > limitData.resetTime) {
    limitData = {
      count: 0,
      resetTime: now + WINDOW_MS,
    };
  }

  limitData.count++;
  ipCache.set(ip, limitData);

  // Set standard headers
  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS - limitData.count));
  res.setHeader('X-RateLimit-Reset', Math.ceil(limitData.resetTime / 1000));

  if (limitData.count > MAX_REQUESTS) {
    return res.status(429).json({
      error: 'Too many requests.',
      retryAfterSeconds: Math.ceil((limitData.resetTime - now) / 1000),
    });
  }

  next();
}
