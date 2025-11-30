import { expressjwt as jwt } from 'express-jwt';
import * as express from 'express';

const getTokenFromHeaders = (req: express.Request): string | null => {

  if (
    (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Token') ||
    (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer')
  ) {
    const token = req.headers.authorization.split(' ')[1];

    return token;
  }

  return null;
};

const auth = {
  required: jwt({
    secret: process.env.JWT_SECRET || 'superSecret',
    getToken: getTokenFromHeaders,
    algorithms: ['HS256'],
  }).unless({ path: ['/api/users/login', '/api/users', '/api/users/login/supabase'] }),
  optional: jwt({
    secret: process.env.JWT_SECRET || 'superSecret',
    credentialsRequired: false,
    getToken: getTokenFromHeaders,
    algorithms: ['HS256'],
  }),
};

// Add error handler for JWT
process.on('unhandledRejection', (reason, promise) => {
  console.log('JWT Error:', reason);
});



export default auth;
