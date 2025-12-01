import express from 'express';

export interface RequestLog {
  timestamp: string;
  method: string;
  path: string;
  status: number;
  duration: number; // milliseconds
  userAgent: string;
  ip: string;
  error?: string;
}

const logs: RequestLog[] = [];
const MAX_LOGS = 1000; // Keep last 1000 requests

/**
 * Logging middleware to track request timing and errors
 */
export const loggingMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const startTime = Date.now();
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  // Override res.json to capture status
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  const logRequest = (status: number, error?: string) => {
    const duration = Date.now() - startTime;

    const log: RequestLog = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status,
      duration,
      userAgent: req.get('user-agent') || 'unknown',
      ip,
      error,
    };

    // Log slow requests or errors
    if (duration > 1000) {
      console.warn(
        `[SLOW] ${req.method} ${req.path} - ${duration}ms (${status})`
      );
    }
    if (status >= 400) {
      console.error(
        `[ERROR] ${req.method} ${req.path} - ${status} ${error || ''}`
      );
    }

    // Store in memory
    logs.push(log);
    if (logs.length > MAX_LOGS) {
      logs.shift();
    }
  };

  res.json = function (data: any) {
    logRequest(res.statusCode);
    return originalJson(data);
  };

  res.send = function (data: any) {
    logRequest(res.statusCode);
    return originalSend(data);
  };

  next();
};

/**
 * Get recent logs for debugging
 */
export const getRecentLogs = (limit: number = 50): RequestLog[] => {
  return logs.slice(-limit);
};

/**
 * Get slow requests from logs
 */
export const getSlowRequests = (threshold: number = 1000): RequestLog[] => {
  return logs.filter((log) => log.duration > threshold);
};

/**
 * Get error logs
 */
export const getErrorLogs = (limit: number = 50): RequestLog[] => {
  return logs.filter((log) => log.status >= 400).slice(-limit);
};

/**
 * Analytics endpoint to get request logs
 */
export const getAnalytics = () => {
  const totalRequests = logs.length;
  const avgDuration =
    totalRequests > 0
      ? logs.reduce((sum, log) => sum + log.duration, 0) / totalRequests
      : 0;
  const slowCount = logs.filter((log) => log.duration > 1000).length;
  const errorCount = logs.filter((log) => log.status >= 400).length;

  return {
    totalRequests,
    avgDuration: Math.round(avgDuration),
    slowRequests: slowCount,
    errors: errorCount,
    errorRate: ((errorCount / totalRequests) * 100).toFixed(2) + '%',
  };
};
