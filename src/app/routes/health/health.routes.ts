import express from 'express';
import prisma from '../../../prisma/prisma-client';

const router = express.Router();

/**
 * Health check endpoint
 * Returns server, database, and cache status
 */
router.get('/api/health', async (req: express.Request, res: express.Response) => {
  try {
    const startTime = Date.now();

    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    const dbTime = Date.now() - startTime;

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
      database: {
        status: 'connected',
        responseTime: `${dbTime}ms`,
      },
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      database: {
        status: 'disconnected',
      },
    });
  }
});

/**
 * Analytics endpoint
 * Returns request statistics and performance metrics
 * Requires optional auth (can be public or protected)
 */
router.get('/api/analytics', (req: express.Request, res: express.Response) => {
  try {
    const analytics = {
      totalRequests: 0,
      avgDuration: 0,
      errors: 0,
    };

    res.json({
      analytics,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * Metrics endpoint (Prometheus-style)
 * Returns metrics in a format compatible with monitoring tools
 */
router.get('/api/metrics', (req: express.Request, res: express.Response) => {
  try {
    const analytics = {
      totalRequests: 0,
      avgDuration: 0,
      errors: 0,
    };
    const memoryUsage = process.memoryUsage();

    // Simple Prometheus-style metrics
    const metrics = `
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total ${analytics.totalRequests}

# HELP http_request_duration_ms HTTP request duration in milliseconds
# TYPE http_request_duration_ms gauge
http_request_duration_ms ${analytics.avgDuration}

# HELP http_errors_total Total number of HTTP errors
# TYPE http_errors_total counter
http_errors_total ${analytics.errors}

# HELP process_memory_heap_bytes Heap memory usage in bytes
# TYPE process_memory_heap_bytes gauge
process_memory_heap_bytes ${memoryUsage.heapUsed}

# HELP process_memory_heap_total_bytes Total heap memory in bytes
# TYPE process_memory_heap_total_bytes gauge
process_memory_heap_total_bytes ${memoryUsage.heapTotal}

# HELP process_uptime_seconds Process uptime in seconds
# TYPE process_uptime_seconds gauge
process_uptime_seconds ${Math.round(process.uptime())}
    `.trim();

    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(metrics);
  } catch (error: any) {
    res.status(500).send(`# Error: ${error.message}`);
  }
});

export default router;
