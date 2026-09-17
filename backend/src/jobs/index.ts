import cron from 'node-cron';
import db from '../config/db';
import logger from '../config/logger';
import { notifyReminderPembayaran } from '../modules/whatsapp/whatsapp.notification';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const execAsync = promisify(exec);

// ==========================================
// Daily at 07:00 — Check low stock
// ==========================================
async function checkStockAlert() {
  try {
    const lowStock = await db.query('SELECT id, name, stok, stokMinimum FROM sparepart WHERE stok <= stokMinimum AND stok > 0');
    const outOfStock = await db.queryVal<number>('SELECT COUNT(*) FROM sparepart WHERE stok = 0');

    if (lowStock.length > 0 || (outOfStock ?? 0) > 0) {
      const items = lowStock.slice(0, 5).map((s: any) => s.name).join(', ');
      await db.insert('notifikasi', {
        id: crypto.randomUUID(), // ensure UUID or auto increment? Let's assume auto increment, wait, it has no ID field defined here. Assuming auto inc.
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

// ==========================================
// Daily at 08:00 — Check expiring warranties & payment reminders
// ==========================================
async function checkGaransiAndPayments() {
  try {
    const now = new Date();
    const today = new Date();
    
    // 1. Garansi Check
    const sevenDays = new Date(now);
    sevenDays.setDate(sevenDays.getDate() + 7);

    const hampir = await db.execute("UPDATE garansi SET status = 'hampir' WHERE status = 'aktif' AND endDate <= ? AND endDate >= ?", [sevenDays, now]);
    const expired = await db.execute("UPDATE garansi SET status = 'expired' WHERE status IN ('aktif','hampir') AND endDate < ?", [now]);

    if (hampir.affectedRows > 0 || expired.affectedRows > 0) {
      logger.info(`[CRON] Garansi: ${hampir.affectedRows} hampir expired, ${expired.affectedRows} expired`);
      if (hampir.affectedRows > 0) {
        await db.insert('notifikasi', { type: 'sistem', title: 'Garansi Hampir Expired', message: `${hampir.affectedRows} garansi akan expired dalam 7 hari`, link: '/garansi' });
      }
    }

    // 2. Pembayaran Check (H-3 and overdue)
    const threeDaysAhead = new Date();
    threeDaysAhead.setDate(today.getDate() + 3);

    const dueSoon = await db.query(
      `SELECT pb.*, s.noWo FROM pembayaran pb
       JOIN work_orders s ON s.id = pb.woId
       WHERE pb.status IN ('belum_bayar','parsial') AND s.status != 'dibatalkan'
         AND pb.jatuhTempo <= ?`,
      [threeDaysAhead]);

    let overdueCount = 0;
    let overdueSisa = 0;

    for (const p of dueSoon) {
      // Create notification for overdue
      if (new Date(p.jatuhTempo) < now) {
        overdueCount++;
        overdueSisa += Number(p.sisaBayar);
      }

      // Send WhatsApp reminder
      const reminderKey = `wa_reminder_${p.id}`;
      const lastSent = await db.queryOne<any>('SELECT value FROM settings WHERE `key` = ?', [reminderKey]);
      const todayStr = new Date().toISOString().split('T')[0];
      
      if (lastSent?.value !== todayStr) {
        await notifyReminderPembayaran(p.id);
        await db.upsert('settings', { key: reminderKey, value: todayStr, group: 'cron' }, ['value']);
        logger.info(`[Cron] Sent scheduled payment reminder for Invoice ${p.noInvoice}`);
      }
    }

    if (overdueCount > 0) {
      await db.insert('notifikasi', {
        type: 'pembayaran', title: 'Invoice Jatuh Tempo',
        message: `${overdueCount} invoice jatuh tempo — total Rp ${overdueSisa.toLocaleString('id-ID')}`,
        link: '/pembayaran',
      });
      logger.info(`[CRON] Payment: ${overdueCount} overdue invoices`);
    }

    // 3. Overdue SPK Check
    const overdueSpks = await db.query(
      "SELECT noWo, estimasiSelesai FROM work_orders WHERE status IN ('antri','dikerjakan') AND estimasiSelesai <= ?",
      [today]);

    for (const spk of overdueSpks) {
      logger.info(`[Cron] Overdue SPK Detected: ${spk.noWo} was supposed to be done by ${spk.estimasiSelesai}`);
    }

    // 4. Auto-cancel expired bookings
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const expiredBookings = await db.query(
      `SELECT id FROM bookings WHERE status = 'baru' AND createdAt < ?`,
      [twentyFourHoursAgo]
    );

    for (const b of expiredBookings) {
      await db.update('bookings', {
        status: 'dibatalkan',
        catatan: 'Dibatalkan otomatis: tidak dikonfirmasi dalam 24 jam',
        updatedAt: new Date()
      }, 'id = ?', [b.id]);
      logger.info(`[Cron] Auto-cancelled expired booking #${b.id}`);
    }

  } catch (err: any) {
    logger.error(`[CRON] Garansi & Payment check failed: ${err.message}`);
  }
}

// ==========================================
// DATABASE BACKUP — Daily at 00:00 (midnight)
// ==========================================
async function runDatabaseBackup() {
  logger.info('[Cron] Starting daily database backup...');

  const backupDir = path.resolve(process.env.BACKUP_DIR || './backups');
  const dbHost = process.env.DB_HOST || '127.0.0.1';
  const dbPort = process.env.DB_PORT || '3306';
  const dbUser = process.env.DB_USERNAME || 'root';
  const dbPass = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_DATABASE || 'mmtracing';

  try {
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `${dbName}_${dateStr}.sql`;
    const filepath = path.join(backupDir, filename);
    const cnfPath = path.join(backupDir, '.my.cnf');

    // Create temporary .cnf file for secure password passing
    const cnfContent = `[client]\nuser=${dbUser}\npassword="${dbPass}"\nhost=${dbHost}\nport=${dbPort}\n`;
    fs.writeFileSync(cnfPath, cnfContent, { mode: 0o600 });

    const dumpCmd = `mysqldump --defaults-extra-file="${cnfPath}" ${dbName} --single-transaction --routines --triggers > "${filepath}"`;
    
    await execAsync(dumpCmd);
    fs.unlinkSync(cnfPath); // Clean up securely

    const stats = fs.statSync(filepath);
    if (stats.size < 100) {
      throw new Error(`Backup file too small (${stats.size} bytes), likely failed`);
    }

    logger.info(`[Cron] Database backup completed: ${filename} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

    // Clean up old backups (> 7 days)
    const files = fs.readdirSync(backupDir);
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    for (const file of files) {
      if (!file.endsWith('.sql')) continue;
      const filePath = path.join(backupDir, file);
      const fileStat = fs.statSync(filePath);
      if (fileStat.isFile() && fileStat.mtimeMs < sevenDaysAgo) {
        fs.unlinkSync(filePath);
        logger.info(`[Cron] Deleted old backup: ${file}`);
      }
    }

  } catch (err: any) {
    logger.error(`[Cron] Database backup FAILED: ${err.message}`);
  }
}

export function startCronJobs() {
  // Run daily at 00:00
  cron.schedule('0 0 * * *', runDatabaseBackup);
  // Run daily at 07:00
  cron.schedule('0 7 * * *', checkStockAlert);
  // Run daily at 08:00
  cron.schedule('0 8 * * *', checkGaransiAndPayments);

  logger.info('⏰ Cron jobs started (backup 00:00, stock 07:00, garansi & payment 08:00)');
}
