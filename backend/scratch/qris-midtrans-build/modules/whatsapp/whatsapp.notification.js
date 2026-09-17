"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyWoCreated = notifyWoCreated;
exports.notifyProgressUpdate = notifyProgressUpdate;
exports.notifyWoSelesai = notifyWoSelesai;
exports.notifyReminderPembayaran = notifyReminderPembayaran;
exports.notifyWoKendala = notifyWoKendala;
exports.notifyGatePassReleased = notifyGatePassReleased;
exports.notifyWoBatal = notifyWoBatal;
exports.notifyBookingBaru = notifyBookingBaru;
exports.sendOtp = sendOtp;
const logger_1 = __importDefault(require("../../config/logger"));
const db_1 = __importDefault(require("../../config/db"));
const wa_queue_1 = require("./wa.queue");
/** Load templates from DB Setting table */
async function getTemplates() {
    try {
        const setting = await db_1.default.queryOne("SELECT value FROM settings WHERE `key` = 'templates'");
        if (!setting)
            return [];
        return JSON.parse(setting.value);
    }
    catch {
        return [];
    }
}
/** Find a specific active template by event name and SPK mode */
async function findTemplate(eventName, mode) {
    const templates = await getTemplates();
    // 1. Prioritaskan template yang sama persis dengan event DAN mode nya (misal: "modifikasi")
    let t = templates.find(t => t.event === eventName && t.mode === mode && t.active);
    // 2. Jika tidak ada, fallback ke template event yang sifatnya global (tak punya spesifik mode)
    if (!t) {
        t = templates.find(t => t.event === eventName && (!t.mode || t.mode === 'all') && t.active);
    }
    return t ? t.template : null;
}
/** Replace template placeholders with actual values */
function renderTemplate(template, vars) {
    let msg = template;
    for (const [key, value] of Object.entries(vars)) {
        msg = msg.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    return msg;
}
/** Generic send — logs errors silently, never throws */
async function trySend(phone, eventName, mode, vars) {
    if (!phone)
        return;
    try {
        const template = await findTemplate(eventName, mode);
        if (!template)
            return; // Template not found or not active
        const msg = renderTemplate(template, vars);
        // Normalize phone
        let jid = phone.replace(/[^0-9]/g, '');
        if (jid.startsWith('0'))
            jid = '62' + jid.slice(1);
        // Push ke queue BullMQ
        await wa_queue_1.waQueue.add('send-message', { jid, text: msg }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 }
        });
        logger_1.default.info(`[WA] Queued "${eventName}" to ${jid} (Mode: ${mode || 'global'})`);
    }
    catch (e) {
        logger_1.default.error(`[WA] Failed to queue "${eventName}" to ${phone}:`, e.message);
    }
}
// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
// PUBLIC NOTIFICATION FUNCTIONS — Called from business logic
// ══════════════════════════════════════════════════════════════
/** 1. Work Order Dibuat — called after WO creation */
async function notifyWoCreated(woId) {
    try {
        const wo = await db_1.default.queryOne('SELECT s.*, p.name AS pelangganName, p.phone AS pelangganPhone, k.name AS kendaraanName, k.plat AS kendaraanPlat FROM work_orders s LEFT JOIN pelanggan p ON p.id = s.pelangganId LEFT JOIN kendaraan k ON k.id = s.kendaraanId WHERE s.id = ?', [woId]);
        if (!wo)
            return;
        await trySend(wo.pelangganPhone, 'Work Order Dibuat', wo.mode, {
            nama: wo.pelangganName,
            kendaraan: wo.kendaraanName ? `${wo.kendaraanName} (${wo.kendaraanPlat})` : '-',
            no_wo: wo.noWo,
            no_spk: wo.noWo, // backward compatibility
            estimasi: wo.estimasiSelesai ? new Date(wo.estimasiSelesai).toLocaleDateString('id-ID') : 'Segera',
            minimum_dp: `Rp ${Number(wo.minimumDp || 0).toLocaleString('id-ID')}`,
            total: `Rp ${Number(wo.totalHarga || 0).toLocaleString('id-ID')}`,
        });
    }
    catch (e) {
        logger_1.default.error('[WA] notifyWoCreated error:', e.message);
    }
}
/** 2. Progress Update — called after progress change */
async function notifyProgressUpdate(woId) {
    try {
        const wo = await db_1.default.queryOne('SELECT s.*, p.name AS pelangganName, p.phone AS pelangganPhone, k.name AS kendaraanName, k.plat AS kendaraanPlat FROM work_orders s LEFT JOIN pelanggan p ON p.id = s.pelangganId LEFT JOIN kendaraan k ON k.id = s.kendaraanId WHERE s.id = ?', [woId]);
        if (!wo)
            return;
        const stages = await db_1.default.query('SELECT nama, status FROM wo_stages WHERE woId = ? ORDER BY urutan ASC', [woId]);
        const currentStage = stages.find((s) => s.status === 'in_progress') || stages.find((s) => s.status === 'done');
        await trySend(wo.pelangganPhone, 'Progress Update', wo.mode, {
            nama: wo.pelangganName,
            kendaraan: wo.kendaraanName ? `${wo.kendaraanName} (${wo.kendaraanPlat})` : '-',
            judul_proyek: wo.judulProyek || '-',
            progress: String(wo.progress),
            stage: currentStage?.nama || 'Pengerjaan Umum',
            no_wo: wo.noWo,
            no_spk: wo.noWo,
        });
    }
    catch (e) {
        logger_1.default.error('[WA] notifyProgressUpdate error:', e.message);
    }
}
/** 3. Selesai & Siap Ambil — called when WO status becomes 'selesai' */
async function notifyWoSelesai(woId) {
    try {
        const wo = await db_1.default.queryOne('SELECT s.*, p.name AS pelangganName, p.phone AS pelangganPhone, k.name AS kendaraanName, k.plat AS kendaraanPlat FROM work_orders s LEFT JOIN pelanggan p ON p.id = s.pelangganId LEFT JOIN kendaraan k ON k.id = s.kendaraanId WHERE s.id = ?', [woId]);
        if (!wo)
            return;
        const pembayaran = await db_1.default.queryOne('SELECT totalTagihan, sisaBayar FROM pembayaran WHERE woId = ? LIMIT 1', [woId]);
        const totalDisplay = pembayaran ? Number(pembayaran.totalTagihan) : Number(wo.totalHarga);
        await trySend(wo.pelangganPhone, 'Selesai & Siap Ambil', wo.mode, {
            nama: wo.pelangganName,
            kendaraan: wo.kendaraanName ? `${wo.kendaraanName} (${wo.kendaraanPlat})` : '-',
            judul_proyek: wo.judulProyek || '-',
            total: `Rp ${totalDisplay.toLocaleString('id-ID')}`,
            sisa: pembayaran ? `Rp ${Number(pembayaran.sisaBayar).toLocaleString('id-ID')}` : '-',
            no_wo: wo.noWo,
            no_spk: wo.noWo,
        });
    }
    catch (e) {
        logger_1.default.error('[WA] notifyWoSelesai error:', e.message);
    }
}
/** 4. Reminder Pembayaran — called when payment is partially paid */
async function notifyReminderPembayaran(pembayaranId) {
    try {
        const p = await db_1.default.queryOne('SELECT pb.*, s.mode, s.noWo, s.judulProyek, pl.name AS pelangganName, pl.phone AS pelangganPhone, k.name AS kendaraanName, k.plat AS kendaraanPlat FROM pembayaran pb JOIN work_orders s ON s.id = pb.woId LEFT JOIN pelanggan pl ON pl.id = s.pelangganId LEFT JOIN kendaraan k ON k.id = s.kendaraanId WHERE pb.id = ?', [pembayaranId]);
        if (!p)
            return;
        await trySend(p.pelangganPhone, 'Reminder Pembayaran', p.mode, {
            nama: p.pelangganName,
            kendaraan: p.kendaraanName ? `${p.kendaraanName} (${p.kendaraanPlat})` : '-',
            judul_proyek: p.judulProyek || '-',
            sisa: `Rp ${Number(p.sisaBayar).toLocaleString('id-ID')}`,
            invoice: p.noInvoice,
            no_wo: p.noWo,
            no_spk: p.noWo,
            public_id: p.publicId,
        });
    }
    catch (e) {
        logger_1.default.error('[WA] notifyReminderPembayaran error:', e.message);
    }
}
/** 5. Work Order Kendala — called when WO is pending due to technical issues */
async function notifyWoKendala(woId, approvalLink) {
    try {
        const wo = await db_1.default.queryOne('SELECT s.*, p.name AS pelangganName, p.phone AS pelangganPhone, k.name AS kendaraanName, k.plat AS kendaraanPlat FROM work_orders s LEFT JOIN pelanggan p ON p.id = s.pelangganId LEFT JOIN kendaraan k ON k.id = s.kendaraanId WHERE s.id = ?', [woId]);
        if (!wo)
            return;
        await trySend(wo.pelangganPhone, 'Work Order Kendala', wo.mode, {
            nama: wo.pelangganName,
            kendaraan: wo.kendaraanName ? `${wo.kendaraanName} (${wo.kendaraanPlat})` : '-',
            no_wo: wo.noWo,
            no_spk: wo.noWo,
            link_approval: approvalLink || '-',
        });
    }
    catch (e) {
        logger_1.default.error('[WA] notifyWoKendala error:', e.message);
    }
}
/** 6. Gate Pass & Garansi & Point — called when invoice LUNAS & WO Selesai */
async function notifyGatePassReleased(woId, invoiceNo) {
    try {
        const wo = await db_1.default.queryOne('SELECT s.*, p.name AS pelangganName, p.phone AS pelangganPhone, k.name AS kendaraanName, k.plat AS kendaraanPlat FROM work_orders s LEFT JOIN pelanggan p ON p.id = s.pelangganId LEFT JOIN kendaraan k ON k.id = s.kendaraanId WHERE s.id = ?', [woId]);
        if (!wo)
            return;
        const [pembayaran, garansi, pointsRow] = await Promise.all([
            db_1.default.queryOne('SELECT publicId FROM pembayaran WHERE woId = ? LIMIT 1', [woId]),
            db_1.default.queryOne('SELECT endDate FROM garansi WHERE woId = ? ORDER BY endDate DESC LIMIT 1', [woId]),
            db_1.default.queryVal("SELECT COALESCE(SUM(points),0) FROM loyalty_points WHERE refType = 'transaksi' AND refId = ? AND type = 'earn'", [woId]),
        ]);
        const points = pointsRow || 0;
        const endDate = garansi ? new Date(garansi.endDate).toLocaleDateString('id-ID') : '-';
        await trySend(wo.pelangganPhone, 'Lunas & Gate Pass', wo.mode, {
            nama: wo.pelangganName,
            kendaraan: wo.kendaraanName ? `${wo.kendaraanName} (${wo.kendaraanPlat})` : '-',
            judul_proyek: wo.judulProyek || '-',
            poin: String(points),
            batas_garansi: endDate,
            invoice: invoiceNo,
            no_wo: wo.noWo,
            no_spk: wo.noWo,
            public_id: pembayaran?.publicId || '',
        });
    }
    catch (e) {
        logger_1.default.error('[WA] notifyGatePassReleased error:', e.message);
    }
}
/** 7. Work Order Dibatalkan — called when WO cancelled */
async function notifyWoBatal(woId) {
    try {
        const wo = await db_1.default.queryOne('SELECT s.*, p.name AS pelangganName, p.phone AS pelangganPhone, k.name AS kendaraanName, k.plat AS kendaraanPlat FROM work_orders s LEFT JOIN pelanggan p ON p.id = s.pelangganId LEFT JOIN kendaraan k ON k.id = s.kendaraanId WHERE s.id = ?', [woId]);
        if (!wo)
            return;
        await trySend(wo.pelangganPhone, 'Work Order Dibatalkan', wo.mode, {
            nama: wo.pelangganName,
            kendaraan: wo.kendaraanName ? `${wo.kendaraanName} (${wo.kendaraanPlat})` : '-',
            no_wo: wo.noWo,
            no_spk: wo.noWo,
        });
    }
    catch (e) {
        logger_1.default.error('[WA] notifyWoBatal error:', e.message);
    }
}
/** 8. Booking Baru — called when new booking from landing page */
async function notifyBookingBaru(bookingId) {
    try {
        const booking = await db_1.default.queryOne('SELECT * FROM bookings WHERE id = ?', [bookingId]);
        if (!booking)
            return;
        // Get admin contact from settings or use fallback
        const adminPhone = await db_1.default.queryVal("SELECT value FROM settings WHERE `key` = 'admin_whatsapp' LIMIT 1");
        const phone = adminPhone || '6285742376636'; // Fallback ke WhatsApp bengkel
        const msg = `🔔 *Booking Baru MMT Racing*\n\n` +
            `📋 ID: #${booking.id}\n` +
            `👤 Nama: ${booking.nama}\n` +
            `📱 WhatsApp: ${booking.whatsapp}\n` +
            `🔧 Layanan: ${booking.layanan}\n` +
            `🏍️ Kendaraan: ${booking.jenisKendaraan}${booking.merkTipe ? ` (${booking.merkTipe})` : ''}\n` +
            `${booking.platNomor ? `🚗 Plat: ${booking.platNomor}\n` : ''}` +
            `${booking.tanggal ? `📅 Tanggal: ${new Date(booking.tanggal).toLocaleDateString('id-ID')}\n` : ''}` +
            `${booking.jamPreferensi ? `⏰ Jam: ${booking.jamPreferensi}\n` : ''}` +
            `${booking.keluhan ? `📝 Keluhan: ${booking.keluhan.substring(0, 100)}${booking.keluhan.length > 100 ? '...' : ''}\n` : ''}` +
            `\n👉 Login admin untuk konfirmasi: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/app/booking`;
        let jid = phone.replace(/[^0-9]/g, '');
        if (jid.startsWith('0'))
            jid = '62' + jid.slice(1);
        await wa_queue_1.waQueue.add('admin-notification', { jid, text: msg }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 }
        });
        logger_1.default.info(`[WA] Queued booking notification to admin ${jid}`);
    }
    catch (e) {
        logger_1.default.error('[WA] notifyBookingBaru error:', e.message);
    }
}
/** 9. Mengirim OTP Login — called when customer requests OTP */
async function sendOtp(phone, otp) {
    try {
        const msg = `*MMT Racing*\n\nKode OTP Anda adalah: *${otp}*\n\nBerlaku selama 5 menit. Jangan berikan kode ini kepada siapapun.`;
        let jid = phone.replace(/[^0-9]/g, '');
        if (jid.startsWith('0'))
            jid = '62' + jid.slice(1);
        await wa_queue_1.waQueue.add('send-message', { jid, text: msg }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 }
        });
        logger_1.default.info(`[WA] Queued OTP to ${jid}`);
    }
    catch (e) {
        logger_1.default.error('[WA] sendOtp error:', e.message);
    }
}
//# sourceMappingURL=whatsapp.notification.js.map