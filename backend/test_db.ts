import dotenv from 'dotenv';
dotenv.config();

console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

async function test() {
  try {
    await prisma.$connect();
    console.log('DB connection OK');
    const tables: any = await prisma.$queryRaw`SHOW TABLES`;
    console.log('Tables count:', tables.length);
  } catch (e: any) {
    console.error('DB connection FAILED:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
