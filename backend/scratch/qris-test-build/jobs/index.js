"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCronJobs = startCronJobs;
const node_cron_1 = __importDefault(require("node-cron"));
const db_1 = __importDefault(require("../config/db"));
const logger_1 = __importDefault(require("../config/logger"));
const whatsapp_notification_1 = require("../modules/whatsapp/whatsapp.notification");
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
// ==========================================
// Daily at 07:00 — Check low stock
// ==========================================
async function checkStockAlert() {
    try {
        const lowStock = await db_1.default.query('SELECT id, name, stok, stokMinimum FROM sparepart WHERE stok <= stokMinimum AND stok > 0');
        const outOfStock = await db_1.default.queryVal('SELECT COUNT(*) FROM sparepart WHERE stok = 0');
        if (lowStock.length > 0 || (outOfStock ?? 0) > 0) {
            const items = lowStock.slice(0, 5).map((s) => s.name).join(', ');
            await db_1.default.insert('notifikasi', {
                id: crypto_1.default.randomUUID(), // ensure UUID or auto increment? Let's assume auto increment, wait, it has no ID field defined here. Assuming auto inc.
                type: 'stok', title: 'Stok Menipis',
                message: `${lowStock.length} item menipis (${items}), ${outOfStock} item habis`,
                link: '/inventaris',
            });
            logger_1.default.info(`[CRON] Stock: ${lowStock.length} low, ${outOfStock} out`);
        }
    }
    catch (err) {
        logger_1.default.error('[CRON] Stock check failed:', err);
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
        const hampir = await db_1.default.execute("UPDATE garansi SET status = 'hampir' WHERE status = 'aktif' AND endDate <= ? AND endDate >= ?", [sevenDays, now]);
        const expired = await db_1.default.execute("UPDATE garansi SET status = 'expired' WHERE status IN ('aktif','hampir') AND endDate < ?", [now]);
        if (hampir.affectedRows > 0 || expired.affectedRows > 0) {
            logger_1.default.info(`[CRON] Garansi: ${hampir.affectedRows} hampir expired, ${expired.affectedRows} expired`);
            if (hampir.affectedRows > 0) {
                await db_1.default.insert('notifikasi', { type: 'sistem', title: 'Garansi Hampir Expired', message: `${hampir.affectedRows} garansi akan expired dalam 7 hari`, link: '/garansi' });
            }
        }
        // 2. Pembayaran Check (H-3 and overdue)
        const threeDaysAhead = new Date();
        threeDaysAhead.setDate(today.getDate() + 3);
        const dueSoon = await db_1.default.query(`SELECT pb.*, s.noWo FROM pembayaran pb
       JOIN work_orders s ON s.id = pb.woId
       WHERE pb.status IN ('belum_bayar','parsial') AND s.status != 'dibatalkan'
         AND pb.jatuhTempo <= ?`, [threeDaysAhead]);
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
            const lastSent = await db_1.default.queryOne('SELECT value FROM settings WHERE `key` = ?', [reminderKey]);
            const todayStr = new Date().toISOString().split('T')[0];
            if (lastSent?.value !== todayStr) {
                await (0, whatsapp_notification_1.notifyReminderPembayaran)(p.id);
                await db_1.default.upsert('settings', { key: reminderKey, value: todayStr, group: 'cron' }, ['value']);
                logger_1.default.info(`[Cron] Sent scheduled payment reminder for Invoice ${p.noInvoice}`);
            }
        }
        if (overdueCount > 0) {
            await db_1.default.insert('notifikasi', {
                type: 'pembayaran', title: 'Invoice Jatuh Tempo',
                message: `${overdueCount} invoice jatuh tempo — total Rp ${overdueSisa.toLocaleString('id-ID')}`,
                link: '/pembayaran',
            });
            logger_1.default.info(`[CRON] Payment: ${overdueCount} overdue invoices`);
        }
        // 3. Overdue SPK Check
        const overdueSpks = await db_1.default.query("SELECT noWo, estimasiSelesai FROM work_orders WHERE status IN ('antri','dikerjakan') AND estimasiSelesai <= ?", [today]);
        for (const spk of overdueSpks) {
            logger_1.default.info(`[Cron] Overdue SPK Detected: ${spk.noWo} was supposed to be done by ${spk.estimasiSelesai}`);
        }
        // 4. Auto-cancel expired bookings
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const expiredBookings = await db_1.default.query(`SELECT id FROM bookings WHERE status = 'baru' AND createdAt < ?`, [twentyFourHoursAgo]);
        for (const b of expiredBookings) {
            await db_1.default.update('bookings', {
                status: 'dibatalkan',
                catatan: 'Dibatalkan otomatis: tidak dikonfirmasi dalam 24 jam',
                updatedAt: new Date()
            }, 'id = ?', [b.id]);
            logger_1.default.info(`[Cron] Auto-cancelled expired booking #${b.id}`);
        }
    }
    catch (err) {
        logger_1.default.error(`[CRON] Garansi & Payment check failed: ${err.message}`);
    }
}
// ==========================================
// DATABASE BACKUP — Daily at 00:00 (midnight)
// ==========================================
async function runDatabaseBackup() {
    logger_1.default.info('[Cron] Starting daily database backup...');
    const backupDir = path_1.default.resolve(process.env.BACKUP_DIR || './backups');
    const dbHost = process.env.DB_HOST || '127.0.0.1';
    const dbPort = process.env.DB_PORT || '3306';
    const dbUser = process.env.DB_USERNAME || 'root';
    const dbPass = process.env.DB_PASSWORD || '';
    const dbName = process.env.DB_DATABASE || 'mmtracing';
    try {
        if (!fs_1.default.existsSync(backupDir)) {
            fs_1.default.mkdirSync(backupDir, { recursive: true });
        }
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `${dbName}_${dateStr}.sql`;
        const filepath = path_1.default.join(backupDir, filename);
        const cnfPath = path_1.default.join(backupDir, '.my.cnf');
        // Create temporary .cnf file for secure password passing
        const cnfContent = `[client]\nuser=${dbUser}\npassword="${dbPass}"\nhost=${dbHost}\nport=${dbPort}\n`;
        fs_1.default.writeFileSync(cnfPath, cnfContent, { mode: 0o600 });
        const dumpCmd = `mysqldump --defaults-extra-file="${cnfPath}" ${dbName} --single-transaction --routines --triggers > "${filepath}"`;
        await execAsync(dumpCmd);
        fs_1.default.unlinkSync(cnfPath); // Clean up securely
        const stats = fs_1.default.statSync(filepath);
        if (stats.size < 100) {
            throw new Error(`Backup file too small (${stats.size} bytes), likely failed`);
        }
        logger_1.default.info(`[Cron] Database backup completed: ${filename} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        // Clean up old backups (> 7 days)
        const files = fs_1.default.readdirSync(backupDir);
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        for (const file of files) {
            if (!file.endsWith('.sql'))
                continue;
            const filePath = path_1.default.join(backupDir, file);
            const fileStat = fs_1.default.statSync(filePath);
            if (fileStat.isFile() && fileStat.mtimeMs < sevenDaysAgo) {
                fs_1.default.unlinkSync(filePath);
                logger_1.default.info(`[Cron] Deleted old backup: ${file}`);
            }
        }
    }
    catch (err) {
        logger_1.default.error(`[Cron] Database backup FAILED: ${err.message}`);
    }
}
function startCronJobs() {
    // Run daily at 00:00
    node_cron_1.default.schedule('0 0 * * *', runDatabaseBackup);
    // Run daily at 07:00
    node_cron_1.default.schedule('0 7 * * *', checkStockAlert);
    // Run daily at 08:00
    node_cron_1.default.schedule('0 8 * * *', checkGaransiAndPayments);
    logger_1.default.info('⏰ Cron jobs started (backup 00:00, stock 07:00, garansi & payment 08:00)');
}
//# sourceMappingURL=index.js.map