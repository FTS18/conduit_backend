import express from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (req: express.Request) => string; // Function to generate rate limit key
}

export const rateLimit = (config: RateLimitConfig) => {
  const { windowMs, maxRequests, keyGenerator } = config;
  const defaultKeyGenerator = (req: express.Request) =>
    req.ip || req.socket.remoteAddress || 'unknown';

  const getKey = keyGenerator || defaultKeyGenerator;

  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const key = getKey(req);
    const now = Date.now();

    // Clean up old entries
    if (store[key] && now > store[key].resetTime) {
      delete store[key];
    }

    // Initialize or increment counter
    if (!store[key]) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
    } else {
      store[key].count++;
    }

    // Set rate limit headers
    res.set('X-RateLimit-Limit', String(maxRequests));
    res.set('X-RateLimit-Remaining', String(Math.max(0, maxRequests - store[key].count)));
    res.set(
      'X-RateLimit-Reset',
      String(Math.ceil(store[key].resetTime / 1000))
    );

    if (store[key].count > maxRequests) {
      return res.status(429).json({
        status: 'too_many_requests',
        message: `Rate limit exceeded. Max ${maxRequests} requests per ${Math.round(windowMs / 1000)} seconds.`,
        retryAfter: Math.ceil((store[key].resetTime - now) / 1000),
      });
    }

    next();
  };
};

// Cleanup old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const key in store) {
    if (now > store[key].resetTime) {
      delete store[key];
    }
  }
}, 5 * 60 * 1000);
