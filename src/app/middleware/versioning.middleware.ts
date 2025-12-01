import express from 'express';

/**
 * API Versioning middleware
 * Allows multiple API versions to coexist
 * Usage: /api/v1/articles, /api/v2/articles
 */

export const API_VERSIONS = {
  V1: 'v1',
  V2: 'v2',
  CURRENT: 'v2',
};

/**
 * Middleware to detect and set API version
 */
export const versioningMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  // Extract version from path: /api/v1/... or /api/v2/...
  const pathMatch = req.path.match(/^\/api\/(v\d+)\//);
  const version = pathMatch ? pathMatch[1] : API_VERSIONS.CURRENT;

  // Attach version to request object
  (req as any).apiVersion = version;

  // Add version header to response
  res.set('X-API-Version', version);

  next();
};

/**
 * Route versioning middleware - only allow specific versions
 */
export const requireVersion = (allowedVersions: string[]) => {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const version = (req as any).apiVersion || API_VERSIONS.CURRENT;

    if (!allowedVersions.includes(version)) {
      return res.status(400).json({
        status: 'error',
        message: `This endpoint is not available in API version ${version}. Supported versions: ${allowedVersions.join(
          ', '
        )}`,
        supportedVersions: allowedVersions,
      });
    }

    next();
  };
};

/**
 * Response versioning middleware - transform response based on API version
 */
export const transformResponseByVersion = (transformers: {
  [key: string]: (data: any) => any;
}) => {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const version = (req as any).apiVersion || API_VERSIONS.CURRENT;
    const transformer = transformers[version];

    if (!transformer) {
      return next();
    }

    // Override json method
    const originalJson = res.json.bind(res);

    res.json = function (data: any) {
      const transformed = transformer(data);
      return originalJson(transformed);
    };

    next();
  };
};

/**
 * Deprecation warning middleware
 */
export const deprecationWarning = (message: string) => {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    res.set('Deprecation', 'true');
    res.set(
      'Sunset',
      new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toUTCString()
    );
    res.set('Warning', `299 - "${message}"`);

    next();
  };
};
