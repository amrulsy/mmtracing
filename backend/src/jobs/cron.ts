import cron from 'node-cron';
import prisma from '../config/database';
import { appEventEmitter } from '../shared/eventEmitter';
import { notifyReminderPembayaran } from '../modules/whatsapp/whatsapp.notification';

export const initBackgroundJobs = () => {
  console.log('[Cron] Initializing background jobs...');

  // Run automatically every day at 08:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('[Cron] Starting daily routine checks...');

    try {
      const today = new Date();
      const threeDaysAhead = new Date();
      threeDaysAhead.setDate(today.getDate() + 3);

      // 1. Check for Pending/Partially paid invoices due soon (H-3)
      const dueSoon = await prisma.pembayaran.findMany({
        where: {
          status: { in: ['belum_bayar', 'parsial'] },
          spk: { status: { not: 'dibatalkan' } },
          jatuhTempo: {
            lte: threeDaysAhead,
            gt: today
          }
        },
        include: {
          spk: { include: { pelanggan: true } }
        }
      });

      for (const p of dueSoon) {
        // Deduplication: hanya kirim reminder sekali per hari per invoice
        const reminderKey = `wa_reminder_${p.id}`;
        const lastSent = await prisma.setting.findUnique({ where: { key: reminderKey } });
        const today = new Date().toISOString().split('T')[0];
        if (lastSent?.value === today) {
          console.log(`[Cron] Reminder already sent today for Invoice ${p.noInvoice}, skipping.`);
          continue;
        }
        await notifyReminderPembayaran(p.id);
        await prisma.setting.upsert({
          where: { key: reminderKey },
          update: { value: today },
          create: { key: reminderKey, value: today, group: 'cron' },
        });
        console.log(`[Cron] Sent scheduled payment reminder for Invoice ${p.noInvoice}`);
      }

      // 2. Check for Overdue SPKs (estimasiSelesai already passed but status still 'dikerjakan' / 'antri')
      const overdueSpks = await prisma.spk.findMany({
        where: {
          status: { in: ['antri', 'dikerjakan'] },
          estimasiSelesai: { lte: today },
        }
      });

      for (const spk of overdueSpks) {
        console.log(`[Cron] Overdue SPK Detected: ${spk.noSpk} was supposed to be done by ${spk.estimasiSelesai}`);
        // Auto alert to super admin could be hooked here
      }

    } catch (e: any) {
      console.error('[Cron] Error running daily jobs:', e.message);
    }
  });

};
