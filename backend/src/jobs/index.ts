import cron from 'node-cron';
import db from '../config/db';
import logger from '../config/logger';

// Daily at 08:00 — Check expiring warranties
async function checkGaransi() {
  try {
    const now = new Date();
    const sevenDays = new Date(now);
    sevenDays.setDate(sevenDays.getDate() + 7);

    // Mark nearly expired
    const hampir = await db.execute("UPDATE garansi SET status = 'hampir' WHERE status = 'aktif' AND endDate <= ? AND endDate >= ?", [sevenDays, now]);

    // Mark expired
    const expired = await db.execute("UPDATE garansi SET status = 'expired' WHERE status IN ('aktif','hampir') AND endDate < ?", [now]);

    if (hampir.affectedRows > 0 || expired.affectedRows > 0) {
      logger.info(`[CRON] Garansi: ${hampir.affectedRows} hampir expired, ${expired.affectedRows} expired`);

      if (hampir.affectedRows > 0) {
        await db.insert('notifikasi', { type: 'sistem', title: 'Garansi Hampir Expired', message: `${hampir.affectedRows} garansi akan expired dalam 7 hari`, link: '/garansi' });
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
    const overdue = await db.query("SELECT sisaBayar FROM pembayaran WHERE status != 'lunas' AND jatuhTempo < ?", [now]);

    if (overdue.length > 0) {
      const totalSisa = overdue.reduce((s: number, p: any) => s + Number(p.sisaBayar), 0);
      await db.insert('notifikasi', {
        type: 'pembayaran', title: 'Invoice Jatuh Tempo',
        message: `${overdue.length} invoice jatuh tempo — total Rp ${totalSisa.toLocaleString('id-ID')}`,
        link: '/pembayaran',
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
    const lowStock = await db.query('SELECT id, name, stok, stokMinimum FROM sparepart WHERE stok <= stokMinimum AND stok > 0');
    const outOfStock = await db.queryVal<number>('SELECT COUNT(*) FROM sparepart WHERE stok = 0');

    if (lowStock.length > 0 || (outOfStock ?? 0) > 0) {
      const items = lowStock.slice(0, 5).map((s: any) => s.name).join(', ');
      await db.insert('notifikasi', {
        type: 'stok', title: 'Stok Menipis',
        message: `${lowStock.length} item menipis (${items}), ${outOfStock} item habis`,
        link: '/inventaris',
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
