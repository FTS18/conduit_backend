import { PrismaClient } from '@prisma/client';

declare global {
  namespace NodeJS {
    interface Global {}
  }
}

// add prisma to the NodeJS global type
interface CustomNodeJsGlobal extends NodeJS.Global {
  prisma: PrismaClient;
}

// Prevent multiple instances of Prisma Client in development
declare const global: CustomNodeJsGlobal;

const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

if (process.env.NODE_ENV === 'development') {
  global.prisma = prisma;
}

// Configure connection pool for production
if (process.env.NODE_ENV === 'production') {
  // Connection string optimization happens at DATABASE_URL level
  // Example: postgresql://user:password@host:5432/db?schema=public&connection_limit=20&pool_timeout=10
}

export default prisma;
