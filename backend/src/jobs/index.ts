import cron from 'node-cron';
import prisma from '../config/database';
import logger from '../config/logger';

// Daily at 08:00 — Check expiring warranties
async function checkGaransi() {
  try {
    const now = new Date();
    const sevenDays = new Date(now);
    sevenDays.setDate(sevenDays.getDate() + 7);

    // Mark nearly expired
    const hampir = await prisma.garansi.updateMany({
      where: { status: 'aktif', endDate: { lte: sevenDays, gte: now } },
      data: { status: 'hampir' },
    });

    // Mark expired
    const expired = await prisma.garansi.updateMany({
      where: { status: { in: ['aktif', 'hampir'] }, endDate: { lt: now } },
      data: { status: 'expired' },
    });

    if (hampir.count > 0 || expired.count > 0) {
      logger.info(`[CRON] Garansi: ${hampir.count} hampir expired, ${expired.count} expired`);

      if (hampir.count > 0) {
        await prisma.notifikasi.create({
          data: { type: 'sistem', title: 'Garansi Hampir Expired', message: `${hampir.count} garansi akan expired dalam 7 hari`, link: '/garansi' },
        });
      }
    }
  } catch (err) {
    logger.error('[CRON] Garansi check failed:', err);
  }
}

// Daily at 09:00 — Check overdue payments
async function checkPaymentReminder() {
  try {
    const now = new Date();
    const overdue = await prisma.pembayaran.findMany({
      where: { status: { not: 'lunas' }, jatuhTempo: { lt: now } },
      include: { spk: { include: { pelanggan: true } } },
    });

    if (overdue.length > 0) {
      const totalSisa = overdue.reduce((s, p) => s + Number(p.sisaBayar), 0);
      await prisma.notifikasi.create({
        data: {
          type: 'pembayaran', title: 'Invoice Jatuh Tempo',
          message: `${overdue.length} invoice jatuh tempo — total Rp ${totalSisa.toLocaleString('id-ID')}`,
          link: '/pembayaran',
        },
      });
      logger.info(`[CRON] Payment: ${overdue.length} overdue invoices`);
    }
  } catch (err) {
    logger.error('[CRON] Payment reminder failed:', err);
  }
}

// Daily at 07:00 — Check low stock
async function checkStockAlert() {
  try {
    const lowStock = await prisma.$queryRaw<any[]>`SELECT id, name, stok, stokMinimum FROM sparepart WHERE stok <= stokMinimum AND stok > 0`;
    const outOfStock = await prisma.sparepart.count({ where: { stok: 0 } });

    if (lowStock.length > 0 || outOfStock > 0) {
      const items = lowStock.slice(0, 5).map((s: any) => s.name).join(', ');
      await prisma.notifikasi.create({
        data: {
          type: 'stok', title: 'Stok Menipis',
          message: `${lowStock.length} item menipis (${items}), ${outOfStock} item habis`,
          link: '/inventaris',
        },
      });
      logger.info(`[CRON] Stock: ${lowStock.length} low, ${outOfStock} out`);
    }
  } catch (err) {
    logger.error('[CRON] Stock check failed:', err);
  }
}

export function startCronJobs() {
  // Run daily at 07:00
  cron.schedule('0 7 * * *', checkStockAlert);
  // Run daily at 08:00
  cron.schedule('0 8 * * *', checkGaransi);
  // Run daily at 09:00
  cron.schedule('0 9 * * *', checkPaymentReminder);

  logger.info('⏰ Cron jobs started (stock 07:00, garansi 08:00, payment 09:00)');
}
