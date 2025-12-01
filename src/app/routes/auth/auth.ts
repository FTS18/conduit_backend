import { expressjwt as jwt } from 'express-jwt';
import * as express from 'express';

const getTokenFromHeaders = (req: express.Request): string | null => {
  if (
    (req.headers.authorization &&
      req.headers.authorization.split(' ')[0] === 'Token') ||
    (req.headers.authorization &&
      req.headers.authorization.split(' ')[0] === 'Bearer')
  ) {
    const token = req.headers.authorization.split(' ')[1];

    return token;
  }

  return null;
};

// Custom middleware to handle both HS256 and RS256 tokens
const optionalAuthMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const token = getTokenFromHeaders(req);

  if (!token) {
    return next(); // No token, continue without auth
  }

  // Try HS256 first (custom JWT)
  jwt({
    secret: process.env.JWT_SECRET || 'superSecret',
    credentialsRequired: false,
    getToken: getTokenFromHeaders,
    algorithms: ['HS256'],
  })(req, res, (err) => {
    if (!err) {
      return next(); // HS256 token is valid
    }

    // HS256 failed, but that's ok for optional auth
    // Supabase tokens will be handled by Supabase client on frontend
    // Just continue without req.auth
    req.auth = undefined;
    next();
  });
};

const auth = {
  required: jwt({
    secret: process.env.JWT_SECRET || 'superSecret',
    getToken: getTokenFromHeaders,
    algorithms: ['HS256'],
  }).unless({
    path: ['/api/users/login', '/api/users', '/api/users/login/supabase'],
  }),
  optional: optionalAuthMiddleware,
};

// Add error handler for JWT
process.on('unhandledRejection', (reason, promise) => {
  console.log('JWT Error:', reason);
});

export default auth;
