import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
try {
  const r1 = await prisma.$executeRawUnsafe(
    `UPDATE Registration SET status = 'CONFIRMED' WHERE status = 'REGISTERED'`
  );
  const r2 = await prisma.$executeRawUnsafe(
    `UPDATE Registration SET status = 'WAITLISTED' WHERE status = 'WAITLIST'`
  );
  console.log('Updated rows:', r1, r2);
} finally {
  await prisma.$disconnect();
}
