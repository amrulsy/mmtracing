import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function generateInvoiceNo(): string {
  const now = new Date();
  const y = String(now.getFullYear()).slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 100)).padStart(2, '0');
  return `INV-${y}${m}${d}-${rand}`;
}

async function main() {
  const spks = await prisma.spk.findMany({
    include: { _count: { select: { pembayaran: true } } }
  });

  let createdCount = 0;
  for (const spk of spks) {
    if (spk._count.pembayaran === 0) {
      const sisaBayar = spk.totalHarga.toNumber() - spk.totalBayar.toNumber();
      
      await prisma.pembayaran.create({
        data: {
          noInvoice: generateInvoiceNo(),
          spkId: spk.id,
          totalTagihan: spk.totalHarga,
          totalBayar: spk.totalBayar,
          sisaBayar: Math.max(0, sisaBayar),
          status: sisaBayar <= 0 ? (spk.totalHarga.toNumber() > 0 ? 'lunas' : 'belum_bayar') : (spk.totalBayar.toNumber() > 0 ? 'parsial' : 'belum_bayar'),
          tanggal: spk.createdAt
        }
      });
      createdCount++;
    }
  }

  console.log(`Berhasil backfill ${createdCount} invoice untuk SPK lama.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
