import express from 'express';
import cors from 'cors';
import * as bodyParser from 'body-parser';
import routes from './app/routes/routes';
import HttpException from './app/models/http-exception.model';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma
const prisma = new PrismaClient();

const app = express();

/**
 * App Configuration
 */

app.use(cors({
  origin: [
    'http://localhost:4100', 
    'http://localhost:3000',
    'https://pecathon.vercel.app'
  ],
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
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
    next: express.NextFunction,
  ) => {
    // @ts-ignore
    if (err && err.name === 'UnauthorizedError') {
      return res.status(401).json({
        status: 'error',
        message: 'missing authorization credentials',
      });
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
      await prisma.user.count();
      console.info('Database tables verified');
    } catch (error) {
      console.info('Database tables missing, running migrations...');
      try {
        const { execSync } = require('child_process');
        execSync('npx prisma migrate deploy --schema=./src/prisma/schema.prisma', { stdio: 'inherit' });
        console.info('Migrations completed successfully');
      } catch (migrationError) {
        console.error('Migration failed:', migrationError.message);
      }
    }
  } catch (error) {
    console.error('Database connection failed:', error);
  }
});
