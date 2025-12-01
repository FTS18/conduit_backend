import express from 'express';
import cors from 'cors';
import compression from 'compression';
import * as bodyParser from 'body-parser';
import routes from './app/routes/routes';
import HttpException from './app/models/http-exception.model';
import { PrismaClient } from '@prisma/client';
import { rateLimit } from './app/middleware/rate-limit.middleware';
import {
  sanitizeInputMiddleware,
  validateContentLength,
} from './app/middleware/sanitize.middleware';
import { loggingMiddleware } from './app/middleware/logging.middleware';

// Initialize Prisma
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

const app = express();

/**
 * Request Cache Middleware - Cache GET requests for 60 seconds
 * With automatic cleanup to prevent memory leaks
 */
const requestCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 60000; // 60 seconds
const MAX_CACHE_ENTRIES = 1000; // Prevent unbounded memory growth

const cacheMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  if (req.method !== 'GET') {
    return next();
  }

  const cacheKey = `${req.path}?${new URLSearchParams(
    req.query as any
  ).toString()}`;
  const cachedResponse = requestCache.get(cacheKey);

  if (
    cachedResponse &&
    Date.now() - cachedResponse.timestamp < CACHE_DURATION
  ) {
    res.set('X-Cache', 'HIT');
    return res.json(cachedResponse.data);
  }

  // Store original json method
  const originalJson = res.json.bind(res);

  // Override json to cache responses
  res.json = function (data: any) {
    // Enforce max cache size - remove oldest entries if limit reached
    if (requestCache.size >= MAX_CACHE_ENTRIES) {
      let oldestKey = '';
      let oldestTime = Date.now();
      requestCache.forEach((value, key) => {
        if (value.timestamp < oldestTime) {
          oldestTime = value.timestamp;
          oldestKey = key;
        }
      });
      if (oldestKey) requestCache.delete(oldestKey);
    }
    requestCache.set(cacheKey, { data, timestamp: Date.now() });
    res.set('X-Cache', 'MISS');
    return originalJson(data);
  };

  next();
};

// Cleanup expired cache entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];

  requestCache.forEach((value, key) => {
    if (now - value.timestamp > CACHE_DURATION) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach((key) => requestCache.delete(key));
  if (keysToDelete.length > 0) {
    console.info(`[CACHE] Cleaned up ${keysToDelete.length} expired entries`);
  }
}, 5 * 60 * 1000); // 5 minutes

/**
 * App Configuration
 */

app.use(compression()); // Enable gzip compression
app.use(loggingMiddleware); // Track request timing and errors
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per window
  })
); // Apply rate limiting
app.use(validateContentLength(1048576)); // 1MB max payload
app.use(sanitizeInputMiddleware); // Prevent XSS attacks

// Optimized CORS configuration to reduce preflight requests
app.use(
  cors({
    origin: [
      'http://localhost:4100',
      'http://localhost:3000',
      'https://pecathon.vercel.app',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['X-Total-Count', 'X-Cache', 'X-API-Version', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: 86400, // Cache preflight for 24 hours
    preflightContinue: false, // Return 200 for preflight
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Add cache headers to improve client-side caching
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Cache GET requests
  if (req.method === 'GET') {
    res.set('Cache-Control', 'public, max-age=60, must-revalidate');
  } else {
    // Don't cache mutations
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  next();
});

app.use(cacheMiddleware); // Apply caching middleware
app.use(routes);

// Serves images
app.use(express.static(__dirname + '/assets'));

app.get('/', (req: express.Request, res: express.Response) => {
  res.json({ status: 'API is running on /api' });
});

/* eslint-disable */
app.use(
  (
    err: Error | HttpException,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    // @ts-ignore
    if (err && err.name === 'UnauthorizedError') {
      // Only return 401 if auth was required
      // For optional auth, just continue
      // @ts-ignore
      if (err.code === 'credentials_required') {
        return res.status(401).json({
          status: 'error',
          message: 'missing authorization credentials',
        });
      }
      // For optional auth, skip the error and continue
      return next();
      // @ts-ignore
    } else if (err && err.errorCode) {
      // @ts-ignore
      res.status(err.errorCode).json(err.message);
    } else if (err) {
      res.status(500).json(err.message);
    }
  },
);

/**
 * Server activation
 */

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  try {
    await prisma.$connect();
    console.info(`server up on port ${PORT}`);
    console.info('Database connected successfully');

    // Check if tables exist and create them if needed
    try {
      const userCount = await prisma.user.count();
      console.info('Database tables verified');

      // Always seed if fewer than 4 users exist
      if (userCount < 4) {
        console.info(`Only ${userCount} users found, seeding dummy data...`);
        try {
          const { execSync } = require('child_process');
          execSync('npx prisma db seed', { stdio: 'inherit' });
          console.info('Dummy data seeded successfully');
        } catch (seedError) {
          console.error('Seeding failed:', seedError.message);
        }
      } else {
        console.info(`Found ${userCount} users in database`);
      }
    } catch (error) {
      console.info('Database tables missing, creating schema...');
      try {
        const { execSync } = require('child_process');
        execSync(
          'npx prisma db push --schema=./src/prisma/schema.prisma --accept-data-loss',
          { stdio: 'inherit' }
        );
        console.info('Database schema created successfully');

        // Seed dummy data
        console.info('Seeding dummy data...');
        execSync('npx prisma db seed', { stdio: 'inherit' });
        console.info('Dummy data seeded successfully');
      } catch (pushError) {
        console.error('Schema creation failed:', pushError.message);
      }
    }
  } catch (error) {
    console.error('Database connection failed:', error);
  }
});
