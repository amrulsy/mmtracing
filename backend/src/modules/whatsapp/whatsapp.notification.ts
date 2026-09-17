import logger from '../../config/logger';
import db from '../../config/db';
import { whatsappService } from './whatsapp.service';
import { waQueue } from './wa.queue';

/**
 * WhatsApp Notification Helper
 * Reads active templates from DB (group: 'whatsapp') and sends messages
 * for specific business events. Failures are silently logged (non-blocking).
 */

interface TemplateItem {
  event: string;
  mode?: string; // 'repair', 'modifikasi', 'bubut', or undefined
  template: string;
  active: boolean;
}

// The legacy database may not yet contain the columns used to scope portal
// notifications to a customer and a work order. Add them lazily so a newly
// created WO can immediately appear in the portal without a manual deploy
// step. The flag prevents an ALTER TABLE on every notification.
let notificationSchemaReady = false;
let notificationSchemaUnavailable = false;

export async function ensureNotificationSchema(): Promise<boolean> {
  if (notificationSchemaReady) return true;
  if (notificationSchemaUnavailable) return false;
  try {
    const columns = await db.query<{ columnName: string }>(
      `SELECT COLUMN_NAME AS columnName
       FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = 'notifikasi'
         AND column_name IN ('pelangganId', 'woId')`
    );
    const existing = new Set(columns.map((column) => column.columnName));
    if (!existing.has('pelangganId')) {
      await db.execute('ALTER TABLE `notifikasi` ADD COLUMN `pelangganId` INT NULL');
    }
    if (!existing.has('woId')) {
      await db.execute('ALTER TABLE `notifikasi` ADD COLUMN `woId` INT NULL');
    }
    notificationSchemaReady = true;
    return true;
  } catch (e: any) {
    notificationSchemaUnavailable = true;
    logger.error(`[Portal] Skema notifikasi belum siap: ${e?.message || e}`);
    return false;
  }
}

async function createPortalNotification(woId: number, type: string, title: string, message: string, link?: string) {
  try {
    if (!(await ensureNotificationSchema())) return;
    const wo = await db.queryOne<{ pelangganId: number }>('SELECT pelangganId FROM work_orders WHERE id = ?', [woId]);
    if (!wo?.pelangganId) return;
    await db.insert('notifikasi', { pelangganId: wo.pelangganId, woId, type, title, message, link: link || `/portal/work-order/${woId}`, isRead: false, createdAt: new Date() });
  } catch (e: any) {
    logger.error(`[Portal] Gagal membuat notifikasi pelanggan: ${e?.message || e}`);
  }
}

async function createCustomerPortalNotification(pelangganId: number | null | undefined, type: string, title: string, message: string, link: string) {
  try {
    if (!pelangganId || !(await ensureNotificationSchema())) return;
    await db.insert('notifikasi', { pelangganId, type, title, message, link, isRead: false, createdAt: new Date() });
  } catch (e: any) {
    logger.error(`[Portal] Gagal membuat notifikasi booking: ${e?.message || e}`);
  }
}

async function findCustomerByPhone(phone: string | null | undefined): Promise<number | null> {
  if (!phone) return null;
  const digits = String(phone).replace(/[^0-9]/g, '');
  const local = digits.startsWith('62') ? `0${digits.slice(2)}` : digits;
  const intl = digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
  const customer = await db.queryOne<{ id: number }>('SELECT id FROM pelanggan WHERE phone IN (?, ?) LIMIT 1', [local, intl]);
  return customer?.id || null;
}

/** Load templates from DB Setting table */
async function getTemplates(): Promise<TemplateItem[]> {
  try {
    const setting = await db.queryOne<any>("SELECT value FROM settings WHERE `key` = 'templates'");
    if (!setting) return [];
    return JSON.parse(setting.value);
  } catch {
    return [];
  }
}

/** Find a specific active template by event name and SPK mode */
async function findTemplate(eventName: string, mode?: string): Promise<string | null> {
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
function renderTemplate(template: string, vars: Record<string, string>): string {
  let msg = template;
  for (const [key, value] of Object.entries(vars)) {
    msg = msg.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return msg;
}

/** Generic send — logs errors silently, never throws */
async function trySend(phone: string | null | undefined, eventName: string, mode: string | undefined, vars: Record<string, string>, fallback?: string) {
  if (!phone) return;
  try {
    const template = await findTemplate(eventName, mode);
    if (!template && !fallback) return; // Template not found or not active
    let msg = template ? renderTemplate(template, vars) : fallback!;
    if (vars.link_lacak && !msg.includes(vars.link_lacak)) msg += `\n\nLacak WO: ${vars.link_lacak}`;
    if (vars.link_kwitansi && !msg.includes(vars.link_kwitansi)) msg += `\n\nKwitansi Digital: ${vars.link_kwitansi}`;
    
    // Normalize phone
    let jid = phone.replace(/[^0-9]/g, '');
    if (jid.startsWith('0')) jid = '62' + jid.slice(1);
    
    // Push ke queue BullMQ
    await waQueue.add('send-message', { jid, text: msg }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 }
    });
    logger.info(`[WA] Queued "${eventName}" to ${jid} (Mode: ${mode || 'global'})`);
  } catch (e: any) {
    logger.error(`[WA] Failed to queue "${eventName}" to ${phone}:`, e.message);
  }
}

// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
// PUBLIC NOTIFICATION FUNCTIONS — Called from business logic
// ══════════════════════════════════════════════════════════════

/** 1. Work Order Dibuat — called after WO creation */
export async function notifyWoCreated(woId: number) {
  try {
    const wo = await db.queryOne<any>('SELECT s.*, p.name AS pelangganName, p.phone AS pelangganPhone, k.name AS kendaraanName, k.plat AS kendaraanPlat FROM work_orders s LEFT JOIN pelanggan p ON p.id = s.pelangganId LEFT JOIN kendaraan k ON k.id = s.kendaraanId WHERE s.id = ?', [woId]);
    if (!wo) return;
    const payment = await db.queryOne<any>('SELECT accessPin FROM pembayaran WHERE woId = ? LIMIT 1', [woId]);
    const trackingUrl = payment?.accessPin
      ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/track?noWo=${encodeURIComponent(wo.noWo)}&accessPin=${encodeURIComponent(payment.accessPin)}`
      : `${process.env.FRONTEND_URL || 'http://localhost:3000'}/track`;
    await trySend(wo.pelangganPhone, 'Work Order Dibuat', wo.mode, {
      nama: wo.pelangganName,
      kendaraan: wo.kendaraanName ? `${wo.kendaraanName} (${wo.kendaraanPlat})` : '-',
      no_wo: wo.noWo,
      no_spk: wo.noWo, // backward compatibility
      link_lacak: trackingUrl,
      estimasi: wo.estimasiSelesai ? new Date(wo.estimasiSelesai).toLocaleDateString('id-ID') : 'Segera',
      minimum_dp: `Rp ${Number(wo.minimumDp || 0).toLocaleString('id-ID')}`,
      total: `Rp ${Number(wo.totalHarga || 0).toLocaleString('id-ID')}`,
    }, `Halo ${wo.pelangganName || 'Pelanggan'}, Work Order ${wo.noWo} untuk ${wo.kendaraanName || 'kendaraan Anda'} sudah dibuat dan masuk antrean pengerjaan.\n\nLacak WO: ${trackingUrl}`);
    await createPortalNotification(woId, 'work_order', 'Work Order dibuat', `WO ${wo.noWo} sudah dibuat dan masuk antrean pengerjaan.`);
  } catch (e: any) {
    logger.error('[WA] notifyWoCreated error:', e.message);
  }
}

/** 2. Progress Update — called after progress change */
export async function notifyProgressUpdate(woId: number) {
  try {
    const wo = await db.queryOne<any>('SELECT s.*, p.name AS pelangganName, p.phone AS pelangganPhone, k.name AS kendaraanName, k.plat AS kendaraanPlat FROM work_orders s LEFT JOIN pelanggan p ON p.id = s.pelangganId LEFT JOIN kendaraan k ON k.id = s.kendaraanId WHERE s.id = ?', [woId]);
    if (!wo) return;
    const stages = await db.query('SELECT nama, status FROM wo_stages WHERE woId = ? ORDER BY urutan ASC', [woId]);
    const currentStage = stages.find((s: any) => s.status === 'in_progress') || stages.find((s: any) => s.status === 'done');
    await trySend(wo.pelangganPhone, 'Progress Update', wo.mode, {
      nama: wo.pelangganName,
      kendaraan: wo.kendaraanName ? `${wo.kendaraanName} (${wo.kendaraanPlat})` : '-',
      judul_proyek: wo.judulProyek || '-',
      progress: String(wo.progress),
      stage: currentStage?.nama || 'Pengerjaan Umum',
      no_wo: wo.noWo,
      no_spk: wo.noWo,
    });
    await createPortalNotification(woId, 'progress', 'Progress pengerjaan diperbarui', `Progress WO ${wo.noWo} saat ini ${wo.progress}%.`);
  } catch (e: any) {
    logger.error('[WA] notifyProgressUpdate error:', e.message);
  }
}

/** 3. Selesai & Siap Ambil — called when WO status becomes 'selesai' */
export async function notifyWoSelesai(woId: number) {
  try {
    const wo = await db.queryOne<any>('SELECT s.*, p.name AS pelangganName, p.phone AS pelangganPhone, k.name AS kendaraanName, k.plat AS kendaraanPlat FROM work_orders s LEFT JOIN pelanggan p ON p.id = s.pelangganId LEFT JOIN kendaraan k ON k.id = s.kendaraanId WHERE s.id = ?', [woId]);
    if (!wo) return;
    const pembayaran = await db.queryOne<any>('SELECT totalTagihan, sisaBayar, publicId, accessPin FROM pembayaran WHERE woId = ? LIMIT 1', [woId]);
    const totalDisplay = pembayaran ? Number(pembayaran.totalTagihan) : Number(wo.totalHarga);
    const trackingUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/track?noWo=${encodeURIComponent(wo.noWo)}${pembayaran?.accessPin ? `&accessPin=${encodeURIComponent(pembayaran.accessPin)}` : ''}`;
    const receiptUrl = pembayaran?.publicId ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pub/pembayaran/${encodeURIComponent(pembayaran.publicId)}/kwitansi${pembayaran.accessPin ? `?pin=${encodeURIComponent(pembayaran.accessPin)}` : ''}` : '';
    await trySend(wo.pelangganPhone, 'Selesai & Siap Ambil', wo.mode, {
      nama: wo.pelangganName,
      kendaraan: wo.kendaraanName ? `${wo.kendaraanName} (${wo.kendaraanPlat})` : '-',
      judul_proyek: wo.judulProyek || '-',
      total: `Rp ${totalDisplay.toLocaleString('id-ID')}`,
      sisa: pembayaran ? `Rp ${Number(pembayaran.sisaBayar).toLocaleString('id-ID')}` : '-',
      no_wo: wo.noWo,
      no_spk: wo.noWo,
      link_lacak: trackingUrl,
      link_kwitansi: receiptUrl,
    }, `Halo ${wo.pelangganName || 'Pelanggan'}, pengerjaan Work Order ${wo.noWo} sudah selesai dan siap diambil.\n\nTotal tagihan: Rp ${totalDisplay.toLocaleString('id-ID')}\nSisa pembayaran: ${pembayaran ? `Rp ${Number(pembayaran.sisaBayar).toLocaleString('id-ID')}` : '-'}\n\nLacak WO: ${trackingUrl}${receiptUrl ? `\nKwitansi Digital: ${receiptUrl}` : ''}`);
    await createPortalNotification(woId, 'work_order', 'Pengerjaan selesai', `WO ${wo.noWo} telah selesai dikerjakan.`);
  } catch (e: any) {
    logger.error('[WA] notifyWoSelesai error:', e.message);
  }
}

/** 4. Reminder Pembayaran — called when payment is partially paid */
export async function notifyReminderPembayaran(pembayaranId: number) {
  try {
    const p = await db.queryOne<any>('SELECT pb.*, s.mode, s.noWo, s.judulProyek, pl.name AS pelangganName, pl.phone AS pelangganPhone, k.name AS kendaraanName, k.plat AS kendaraanPlat FROM pembayaran pb JOIN work_orders s ON s.id = pb.woId LEFT JOIN pelanggan pl ON pl.id = s.pelangganId LEFT JOIN kendaraan k ON k.id = s.kendaraanId WHERE pb.id = ?', [pembayaranId]);
    if (!p) return;
    const receiptUrl = p.publicId ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pub/pembayaran/${encodeURIComponent(p.publicId)}/kwitansi${p.accessPin ? `?pin=${encodeURIComponent(p.accessPin)}` : ''}` : '';
    await trySend(p.pelangganPhone, 'Reminder Pembayaran', p.mode, {
      nama: p.pelangganName,
      kendaraan: p.kendaraanName ? `${p.kendaraanName} (${p.kendaraanPlat})` : '-',
      judul_proyek: p.judulProyek || '-',
      sisa: `Rp ${Number(p.sisaBayar).toLocaleString('id-ID')}`,
      invoice: p.noInvoice,
      no_wo: p.noWo,
      no_spk: p.noWo,
      public_id: p.publicId,
      link_kwitansi: receiptUrl,
    }, `Halo ${p.pelangganName || 'Pelanggan'}, pembayaran untuk invoice ${p.noInvoice || '-'} sudah kami terima sebesar Rp ${Number(p.totalBayar || 0).toLocaleString('id-ID')}.\n\nSisa pembayaran: Rp ${Number(p.sisaBayar || 0).toLocaleString('id-ID')}.\nSilakan hubungi bengkel bila membutuhkan rincian.${receiptUrl ? `\n\nKwitansi Digital: ${receiptUrl}` : ''}`);
    const receiptLink = p.publicId ? `/pub/pembayaran/${encodeURIComponent(p.publicId)}/kwitansi${p.accessPin ? `?pin=${encodeURIComponent(p.accessPin)}` : ''}` : `/portal/pembayaran#pembayaran-${pembayaranId}`;
    await createPortalNotification(p.woId, 'pembayaran', 'Sisa pembayaran', `Masih ada sisa pembayaran untuk invoice ${p.noInvoice}.`, receiptLink);
  } catch (e: any) {
    logger.error('[WA] notifyReminderPembayaran error:', e.message);
  }
}

/** 5. Work Order Kendala — called when WO is pending due to technical issues */
export async function notifyWoKendala(woId: number, approvalLink?: string) {
  try {
    const wo = await db.queryOne<any>('SELECT s.*, p.name AS pelangganName, p.phone AS pelangganPhone, k.name AS kendaraanName, k.plat AS kendaraanPlat FROM work_orders s LEFT JOIN pelanggan p ON p.id = s.pelangganId LEFT JOIN kendaraan k ON k.id = s.kendaraanId WHERE s.id = ?', [woId]);
    if (!wo) return;
    await trySend(wo.pelangganPhone, 'Work Order Kendala', wo.mode, {
      nama: wo.pelangganName,
      kendaraan: wo.kendaraanName ? `${wo.kendaraanName} (${wo.kendaraanPlat})` : '-',
      no_wo: wo.noWo,
      no_spk: wo.noWo,
      link_approval: approvalLink || '-',
    });
    await createPortalNotification(woId, 'work_order', 'Pengerjaan memerlukan persetujuan', `WO ${wo.noWo} memiliki kendala yang memerlukan persetujuan Anda.`, `/portal/work-order/${woId}`);
  } catch (e: any) {
    logger.error('[WA] notifyWoKendala error:', e.message);
  }
}

/** 6. Gate Pass & Garansi & Point — called when invoice LUNAS & WO Selesai */
export async function notifyGatePassReleased(woId: number, invoiceNo: string) {
  try {
    const wo = await db.queryOne<any>('SELECT s.*, p.name AS pelangganName, p.phone AS pelangganPhone, k.name AS kendaraanName, k.plat AS kendaraanPlat FROM work_orders s LEFT JOIN pelanggan p ON p.id = s.pelangganId LEFT JOIN kendaraan k ON k.id = s.kendaraanId WHERE s.id = ?', [woId]);
    if (!wo) return;

    const [pembayaran, garansi, pointsRow] = await Promise.all([
      db.queryOne<any>('SELECT id, publicId, accessPin FROM pembayaran WHERE woId = ? LIMIT 1', [woId]),
      db.queryOne<any>('SELECT endDate FROM garansi WHERE woId = ? ORDER BY endDate DESC LIMIT 1', [woId]),
      db.queryVal<number>("SELECT COALESCE(SUM(points),0) FROM loyalty_points WHERE refType = 'transaksi' AND refId = ? AND type = 'earn'", [woId]),
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
    const receiptLink = pembayaran?.publicId ? `/pub/pembayaran/${encodeURIComponent(pembayaran.publicId)}/kwitansi${pembayaran.accessPin ? `?pin=${encodeURIComponent(pembayaran.accessPin)}` : ''}` : `/portal/pembayaran#pembayaran-${pembayaran?.id || woId}`;
    await createPortalNotification(woId, 'pembayaran', 'Pembayaran lunas', `Invoice ${invoiceNo} telah lunas. Gate Pass tersedia untuk WO ${wo.noWo}.`, receiptLink);
  } catch (e: any) {
    logger.error('[WA] notifyGatePassReleased error:', e.message);
  }
}

/** Pembayaran lunas — dikirim setiap kali invoice berubah menjadi lunas. */
export async function notifyPembayaranLunas(woId: number, invoiceNo: string) {
  try {
    const wo = await db.queryOne<any>('SELECT s.*, p.name AS pelangganName, p.phone AS pelangganPhone FROM work_orders s LEFT JOIN pelanggan p ON p.id = s.pelangganId WHERE s.id = ?', [woId]);
    if (!wo) return;
    const pembayaran = await db.queryOne<any>('SELECT totalTagihan, totalBayar, sisaBayar, publicId, accessPin FROM pembayaran WHERE woId = ? LIMIT 1', [woId]);
    const receiptUrl = pembayaran?.publicId ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pub/pembayaran/${encodeURIComponent(pembayaran.publicId)}/kwitansi${pembayaran.accessPin ? `?pin=${encodeURIComponent(pembayaran.accessPin)}` : ''}` : '';
    await trySend(wo.pelangganPhone, 'Pembayaran Lunas', wo.mode, {
      nama: wo.pelangganName || 'Pelanggan',
      invoice: invoiceNo,
      no_wo: wo.noWo,
      no_spk: wo.noWo,
      total: `Rp ${Number(pembayaran?.totalTagihan || wo.totalHarga || 0).toLocaleString('id-ID')}`,
      sisa: 'Rp 0',
      link_kwitansi: receiptUrl,
    }, `Halo ${wo.pelangganName || 'Pelanggan'}, pembayaran invoice ${invoiceNo} sudah lunas sebesar Rp ${Number(pembayaran?.totalBayar || pembayaran?.totalTagihan || 0).toLocaleString('id-ID')}.\n\nTerima kasih. Kami akan menginformasikan kembali saat Work Order siap diambil.${receiptUrl ? `\n\nKwitansi Digital: ${receiptUrl}` : ''}`);
    const receiptLink = pembayaran?.publicId ? `/pub/pembayaran/${encodeURIComponent(pembayaran.publicId)}/kwitansi${pembayaran.accessPin ? `?pin=${encodeURIComponent(pembayaran.accessPin)}` : ''}` : `/portal/pembayaran#pembayaran-${woId}`;
    await createPortalNotification(woId, 'pembayaran', 'Pembayaran lunas', `Invoice ${invoiceNo} telah lunas.`, receiptLink);
  } catch (e: any) {
    logger.error(`[WA] notifyPembayaranLunas error: ${e?.message || e}`);
  }
}

/** 7. Work Order Dibatalkan — called when WO cancelled */
export async function notifyWoBatal(woId: number) {
  try {
    const wo = await db.queryOne<any>('SELECT s.*, p.name AS pelangganName, p.phone AS pelangganPhone, k.name AS kendaraanName, k.plat AS kendaraanPlat FROM work_orders s LEFT JOIN pelanggan p ON p.id = s.pelangganId LEFT JOIN kendaraan k ON k.id = s.kendaraanId WHERE s.id = ?', [woId]);
    if (!wo) return;
    await trySend(wo.pelangganPhone, 'Work Order Dibatalkan', wo.mode, {
      nama: wo.pelangganName,
      kendaraan: wo.kendaraanName ? `${wo.kendaraanName} (${wo.kendaraanPlat})` : '-',
      no_wo: wo.noWo,
      no_spk: wo.noWo,
    });
    await createPortalNotification(woId, 'work_order', 'Work Order dibatalkan', `WO ${wo.noWo} telah dibatalkan. Silakan hubungi bengkel bila membutuhkan penjelasan.`, `/portal/work-order/${woId}`);
  } catch (e: any) {
    logger.error('[WA] notifyWoBatal error:', e.message);
  }
}

/** 8. Booking Baru — called when new booking from landing page */
export async function notifyBookingBaru(bookingId: number) {
  try {
    const booking = await db.queryOne<any>('SELECT * FROM bookings WHERE id = ?', [bookingId]);
    if (!booking) return;

    // Get admin contact from settings or use fallback
    const adminPhone = await db.queryVal<string>("SELECT value FROM settings WHERE `key` = 'admin_whatsapp' LIMIT 1");
    const phone = adminPhone;
    if (!phone) return;

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
    if (jid.startsWith('0')) jid = '62' + jid.slice(1);

    await waQueue.add('admin-notification', { jid, text: msg }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 }
    });
    logger.info(`[WA] Queued booking notification to admin ${jid}`);
  } catch (e: any) {
    logger.error('[WA] notifyBookingBaru error:', e.message);
  }
}

/** 9. Mengirim OTP Login — called when customer requests OTP */
/** Booking received — immediate acknowledgement to the customer. */
export async function notifyBookingReceived(bookingId: number) {
  try {
    const booking = await db.queryOne<any>('SELECT * FROM bookings WHERE id = ?', [bookingId]);
    if (!booking?.whatsapp) return;
    const date = booking.tanggal ? new Date(booking.tanggal).toLocaleDateString('id-ID') : 'belum dipilih';
    const time = booking.jamPreferensi ? `, pukul ${booking.jamPreferensi}` : '';
    let jid = String(booking.whatsapp).replace(/[^0-9]/g, '');
    if (jid.startsWith('0')) jid = '62' + jid.slice(1);
    const trackingUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/track?bookingId=${booking.id}`;
    const text = `*MMT Racing*\n\nHalo ${booking.nama}, booking Anda #${booking.id} sudah kami terima.\n\nLayanan: ${booking.layanan}\nJadwal pilihan: ${date}${time}\n\nCek status booking: ${trackingUrl}\n\nTim kami akan mengonfirmasi ketersediaannya melalui WhatsApp. Simpan nomor booking ini untuk referensi.`;
    await waQueue.add('send-message', { jid, text }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
    await createCustomerPortalNotification(await findCustomerByPhone(booking.whatsapp), 'booking', 'Booking diterima', `Booking #${booking.id} sudah kami terima dan menunggu konfirmasi bengkel.`, `/track?bookingId=${booking.id}`);
  } catch (e: any) {
    logger.error('[WA] notifyBookingReceived error:', e.message);
  }
}

export async function notifyBookingStatus(bookingId: number, status: string) {
  try {
    const booking = await db.queryOne<any>('SELECT * FROM bookings WHERE id = ?', [bookingId]);
    if (!booking?.whatsapp) return;
    const date = booking.tanggal ? new Date(booking.tanggal).toLocaleDateString('id-ID') : 'sesuai kesepakatan';
    const time = booking.jamPreferensi ? ` pukul ${booking.jamPreferensi}` : '';
    const textByStatus: Record<string, string> = {
      dikonfirmasi: `Booking #${booking.id} telah dikonfirmasi untuk ${date}${time}.`,
      ditolak: `Maaf, booking #${booking.id} belum dapat kami terima.${booking.alasanPenolakan ? ` Keterangan: ${booking.alasanPenolakan}` : ''}`,
      dibatalkan: `Booking #${booking.id} telah dibatalkan.`,
    };
    const statusText = textByStatus[status];
    if (!statusText) return;
    let jid = String(booking.whatsapp).replace(/[^0-9]/g, '');
    if (jid.startsWith('0')) jid = '62' + jid.slice(1);
    await waQueue.add('send-message', { jid, text: `*MMT Racing*\n\nHalo ${booking.nama},\n${statusText}\n\nBalas pesan ini bila Anda membutuhkan bantuan.` }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
    const titleByStatus: Record<string, string> = {
      dikonfirmasi: 'Booking dikonfirmasi',
      ditolak: 'Booking ditolak',
      dibatalkan: 'Booking dibatalkan',
    };
    await createCustomerPortalNotification(await findCustomerByPhone(booking.whatsapp), 'booking', titleByStatus[status] || 'Status booking berubah', statusText, `/track?bookingId=${booking.id}`);
  } catch (e: any) {
    logger.error('[WA] notifyBookingStatus error:', e.message);
  }
}

export async function sendOtp(phone: string, otp: string) {
  try {
    const msg = `*MMT Racing*\n\nKode OTP Anda adalah: *${otp}*\n\nBerlaku selama 5 menit. Jangan berikan kode ini kepada siapapun.`;

    let jid = phone.replace(/[^0-9]/g, '');
    if (jid.startsWith('0')) jid = '62' + jid.slice(1);

    await waQueue.add('send-message', { jid, text: msg }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 }
    });
    logger.info(`[WA] Queued OTP to ${jid}`);
  } catch (e: any) {
    logger.error('[WA] sendOtp error:', e.message);
  }
}
