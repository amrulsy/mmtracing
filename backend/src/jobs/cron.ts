import cron from 'node-cron';
import db from '../config/db';
import { appEventEmitter } from '../shared/eventEmitter';
import { notifyReminderPembayaran } from '../modules/whatsapp/whatsapp.notification';
import logger from '../config/logger';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export const initBackgroundJobs = () => {
  console.log('[Cron] Initializing background jobs...');

  // Run automatically every day at 08:00 AM — Payment reminders & overdue SPK
  cron.schedule('0 8 * * *', async () => {
    console.log('[Cron] Starting daily routine checks...');

    try {
      const today = new Date();
      const threeDaysAhead = new Date();
      threeDaysAhead.setDate(today.getDate() + 3);

      // 1. Check for Pending/Partially paid invoices due soon (H-3)
      const dueSoon = await db.query(
        `SELECT pb.*, s.noSpk FROM pembayaran pb
         JOIN spk s ON s.id = pb.spkId
         WHERE pb.status IN ('belum_bayar','parsial') AND s.status != 'dibatalkan'
           AND pb.jatuhTempo <= ? AND pb.jatuhTempo > ?`,
        [threeDaysAhead, today]);

      for (const p of dueSoon) {
        // Deduplication: hanya kirim reminder sekali per hari per invoice
        const reminderKey = `wa_reminder_${p.id}`;
        const lastSent = await db.queryOne<any>('SELECT value FROM setting WHERE `key` = ?', [reminderKey]);
        const todayStr = new Date().toISOString().split('T')[0];
        if (lastSent?.value === todayStr) {
          console.log(`[Cron] Reminder already sent today for Invoice ${p.noInvoice}, skipping.`);
          continue;
        }
        await notifyReminderPembayaran(p.id);
        await db.upsert('setting', { key: reminderKey, value: todayStr, group: 'cron' }, ['value']);
        console.log(`[Cron] Sent scheduled payment reminder for Invoice ${p.noInvoice}`);
      }

      // 2. Check for Overdue SPKs (estimasiSelesai already passed but status still 'dikerjakan' / 'antri')
      const overdueSpks = await db.query(
        "SELECT noSpk, estimasiSelesai FROM spk WHERE status IN ('antri','dikerjakan') AND estimasiSelesai <= ?",
        [today]);

      for (const spk of overdueSpks) {
        console.log(`[Cron] Overdue SPK Detected: ${spk.noSpk} was supposed to be done by ${spk.estimasiSelesai}`);
        // Auto alert to super admin could be hooked here
      }

    } catch (e: any) {
      console.error('[Cron] Error running daily jobs:', e.message);
    }
  });

  // ==========================================
  // DATABASE BACKUP — Daily at 00:00 (midnight)
  // ==========================================
  cron.schedule('0 0 * * *', async () => {
    logger.info('[Cron] Starting daily database backup...');

    const backupDir = path.resolve(process.env.BACKUP_DIR || './backups');
    const dbHost = process.env.DB_HOST || '127.0.0.1';
    const dbPort = process.env.DB_PORT || '3306';
    const dbUser = process.env.DB_USERNAME || 'root';
    const dbPass = process.env.DB_PASSWORD || '';
    const dbName = process.env.DB_DATABASE || 'mmtracing';

    try {
      // Ensure backup directory exists
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const filename = `${dbName}_${dateStr}.sql`;
      const filepath = path.join(backupDir, filename);

      // Run mysqldump
      const dumpCmd = `mysqldump -h ${dbHost} -P ${dbPort} -u ${dbUser} ${dbPass ? `-p${dbPass}` : ''} ${dbName} --single-transaction --routines --triggers > "${filepath}"`;
      
      await execAsync(dumpCmd);

      // Verify file was created and has content
      const stats = fs.statSync(filepath);
      if (stats.size < 100) {
        throw new Error(`Backup file too small (${stats.size} bytes), likely failed`);
      }

      logger.info(`[Cron] Database backup completed: ${filename} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

      // Clean up old backups (> 7 days)
      const files = fs.readdirSync(backupDir);
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(backupDir, file);
        const fileStat = fs.statSync(filePath);
        if (fileStat.isFile() && fileStat.mtimeMs < sevenDaysAgo) {
          fs.unlinkSync(filePath);
          logger.info(`[Cron] Deleted old backup: ${file}`);
        }
      }

    } catch (err: any) {
      logger.error(`[Cron] Database backup FAILED: ${err.message}`, { error: err.stack });
    }
  });

};

