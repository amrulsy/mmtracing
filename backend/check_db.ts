import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const spkCount = await prisma.spk.count();
  const pembayaranCount = await prisma.pembayaran.count();
  const latestSpk = await prisma.spk.findFirst({
    orderBy: { id: 'desc' },
    include: { pembayaran: true }
  });

  console.log('Total SPK:', spkCount);
  console.log('Total Pembayaran:', pembayaranCount);
  console.log('Latest SPK:', latestSpk?.noSpk, 'Has Pembayaran:', latestSpk?.pembayaran.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
