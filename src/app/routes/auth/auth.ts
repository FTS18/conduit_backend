import { expressjwt as jwt } from 'express-jwt';
import * as express from 'express';

const getTokenFromHeaders = (req: express.Request): string | null => {
  console.log('Authorization header:', req.headers.authorization);
  if (
    (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Token') ||
    (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer')
  ) {
    const token = req.headers.authorization.split(' ')[1];
    console.log('Extracted token:', token);
    return token;
  }
  console.log('No valid authorization header found');
  return null;
};

const auth = {
  required: jwt({
    secret: process.env.JWT_SECRET || 'superSecret',
    getToken: getTokenFromHeaders,
    algorithms: ['HS256'],
  }).unless({ path: ['/api/users/login', '/api/users'] }),
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

console.log('JWT_SECRET being used:', process.env.JWT_SECRET || 'superSecret');

export default auth;
