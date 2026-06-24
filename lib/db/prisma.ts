import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

let prismaClient: PrismaClient;

if (typeof window === 'undefined') {
  // Database connection is only instantiated on the server side
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  const adapter = new PrismaPg(pool);
  
  prismaClient =
    globalForPrisma.prisma ||
    new PrismaClient({
      adapter,
      log: ['error'],
    });

  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaClient;
} else {
  // Placeholder for client compilation
  prismaClient = null as any;
}

export const prisma = prismaClient;
export default prisma;
