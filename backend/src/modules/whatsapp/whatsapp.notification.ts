import db from '../../config/db';
import { whatsappService } from './whatsapp.service';

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

/** Load templates from DB Setting table */
async function getTemplates(): Promise<TemplateItem[]> {
  try {
    const setting = await db.queryOne<any>("SELECT value FROM setting WHERE `key` = 'templates'");
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
async function trySend(phone: string | null | undefined, eventName: string, mode: string | undefined, vars: Record<string, string>) {
  if (!phone || whatsappService.status !== 'connected') return;
  try {
    const template = await findTemplate(eventName, mode);
    if (!template) return; // Template not found or not active
    const msg = renderTemplate(template, vars);
    
    // Normalize phone
    let jid = phone.replace(/[^0-9]/g, '');
    if (jid.startsWith('0')) jid = '62' + jid.slice(1);
    
    await whatsappService.sendMessage(jid, msg);
    console.log(`[WA] Sent "${eventName}" to ${jid} (Mode: ${mode || 'global'})`);
  } catch (e: any) {
    console.error(`[WA] Failed to send "${eventName}" to ${phone}:`, e.message);
  }
}

// ══════════════════════════════════════════════════════════════
// PUBLIC NOTIFICATION FUNCTIONS — Called from business logic
// ══════════════════════════════════════════════════════════════

/** 1. SPK Dibuat — called after SPK creation */
export async function notifySpkCreated(spkId: number) {
  try {
    const spk = await db.queryOne<any>('SELECT s.*, p.name AS pelangganName, p.phone AS pelangganPhone, k.name AS kendaraanName, k.plat AS kendaraanPlat FROM spk s LEFT JOIN pelanggan p ON p.id = s.pelangganId LEFT JOIN kendaraan k ON k.id = s.kendaraanId WHERE s.id = ?', [spkId]);
    if (!spk) return;
    await trySend(spk.pelangganPhone, 'SPK Dibuat', spk.mode, {
      nama: spk.pelangganName,
      kendaraan: spk.kendaraanName ? `${spk.kendaraanName} (${spk.kendaraanPlat})` : '-',
      no_spk: spk.noSpk,
      estimasi: spk.estimasiSelesai ? new Date(spk.estimasiSelesai).toLocaleDateString('id-ID') : 'Segera',
      minimum_dp: `Rp ${Number(spk.minimumDp || 0).toLocaleString('id-ID')}`,
      total: `Rp ${Number(spk.totalHarga || 0).toLocaleString('id-ID')}`,
    });
  } catch (e: any) {
    console.error('[WA] notifySpkCreated error:', e.message);
  }
}

/** 2. Progress Update — called after progress change */
export async function notifyProgressUpdate(spkId: number) {
  try {
    const spk = await db.queryOne<any>('SELECT s.*, p.name AS pelangganName, p.phone AS pelangganPhone, k.name AS kendaraanName, k.plat AS kendaraanPlat FROM spk s LEFT JOIN pelanggan p ON p.id = s.pelangganId LEFT JOIN kendaraan k ON k.id = s.kendaraanId WHERE s.id = ?', [spkId]);
    if (!spk) return;
    const stages = await db.query('SELECT nama, status FROM spk_stages WHERE spkId = ? ORDER BY urutan ASC', [spkId]);
    const currentStage = stages.find((s: any) => s.status === 'in_progress') || stages.find((s: any) => s.status === 'done');
    await trySend(spk.pelangganPhone, 'Progress Update', spk.mode, {
      nama: spk.pelangganName,
      kendaraan: spk.kendaraanName ? `${spk.kendaraanName} (${spk.kendaraanPlat})` : '-',
      judul_proyek: spk.judulProyek || '-',
      progress: String(spk.progress),
      stage: currentStage?.nama || 'Pengerjaan Umum',
      no_spk: spk.noSpk,
    });
  } catch (e: any) {
    console.error('[WA] notifyProgressUpdate error:', e.message);
  }
}

/** 3. Selesai & Siap Ambil — called when SPK status becomes 'selesai' */
export async function notifySpkSelesai(spkId: number) {
  try {
    const spk = await db.queryOne<any>('SELECT s.*, p.name AS pelangganName, p.phone AS pelangganPhone, k.name AS kendaraanName, k.plat AS kendaraanPlat FROM spk s LEFT JOIN pelanggan p ON p.id = s.pelangganId LEFT JOIN kendaraan k ON k.id = s.kendaraanId WHERE s.id = ?', [spkId]);
    if (!spk) return;
    const pembayaran = await db.queryOne<any>('SELECT totalTagihan, sisaBayar FROM pembayaran WHERE spkId = ? LIMIT 1', [spkId]);
    const totalDisplay = pembayaran ? Number(pembayaran.totalTagihan) : Number(spk.totalHarga);
    await trySend(spk.pelangganPhone, 'Selesai & Siap Ambil', spk.mode, {
      nama: spk.pelangganName,
      kendaraan: spk.kendaraanName ? `${spk.kendaraanName} (${spk.kendaraanPlat})` : '-',
      judul_proyek: spk.judulProyek || '-',
      total: `Rp ${totalDisplay.toLocaleString('id-ID')}`,
      sisa: pembayaran ? `Rp ${Number(pembayaran.sisaBayar).toLocaleString('id-ID')}` : '-',
      no_spk: spk.noSpk,
    });
  } catch (e: any) {
    console.error('[WA] notifySpkSelesai error:', e.message);
  }
}

/** 4. Reminder Pembayaran — called when payment is partially paid */
export async function notifyReminderPembayaran(pembayaranId: number) {
  try {
    const p = await db.queryOne<any>('SELECT pb.*, s.mode, s.noSpk, s.judulProyek, pl.name AS pelangganName, pl.phone AS pelangganPhone, k.name AS kendaraanName, k.plat AS kendaraanPlat FROM pembayaran pb JOIN spk s ON s.id = pb.spkId LEFT JOIN pelanggan pl ON pl.id = s.pelangganId LEFT JOIN kendaraan k ON k.id = s.kendaraanId WHERE pb.id = ?', [pembayaranId]);
    if (!p) return;
    await trySend(p.pelangganPhone, 'Reminder Pembayaran', p.mode, {
      nama: p.pelangganName,
      kendaraan: p.kendaraanName ? `${p.kendaraanName} (${p.kendaraanPlat})` : '-',
      judul_proyek: p.judulProyek || '-',
      sisa: `Rp ${Number(p.sisaBayar).toLocaleString('id-ID')}`,
      invoice: p.noInvoice,
      no_spk: p.noSpk,
      public_id: p.publicId,
    });
  } catch (e: any) {
    console.error('[WA] notifyReminderPembayaran error:', e.message);
  }
}

/** 5. SPK Kendala — called when SPK is pending due to technical issues */
export async function notifySpkKendala(spkId: number, approvalLink?: string) {
  try {
    const spk = await db.queryOne<any>('SELECT s.*, p.name AS pelangganName, p.phone AS pelangganPhone, k.name AS kendaraanName, k.plat AS kendaraanPlat FROM spk s LEFT JOIN pelanggan p ON p.id = s.pelangganId LEFT JOIN kendaraan k ON k.id = s.kendaraanId WHERE s.id = ?', [spkId]);
    if (!spk) return;
    await trySend(spk.pelangganPhone, 'SPK Kendala', spk.mode, {
      nama: spk.pelangganName,
      kendaraan: spk.kendaraanName ? `${spk.kendaraanName} (${spk.kendaraanPlat})` : '-',
      no_spk: spk.noSpk,
      link_approval: approvalLink || '-',
    });
  } catch (e: any) {
    console.error('[WA] notifySpkKendala error:', e.message);
  }
}

/** 6. Gate Pass & Garansi & Point — called when invoice LUNAS & SPK Selesai */
export async function notifyGatePassReleased(spkId: number, invoiceNo: string) {
  try {
    const spk = await db.queryOne<any>('SELECT s.*, p.name AS pelangganName, p.phone AS pelangganPhone, k.name AS kendaraanName, k.plat AS kendaraanPlat FROM spk s LEFT JOIN pelanggan p ON p.id = s.pelangganId LEFT JOIN kendaraan k ON k.id = s.kendaraanId WHERE s.id = ?', [spkId]);
    if (!spk) return;

    const [pembayaran, garansi, pointsRow] = await Promise.all([
      db.queryOne<any>('SELECT publicId FROM pembayaran WHERE spkId = ? LIMIT 1', [spkId]),
      db.queryOne<any>('SELECT endDate FROM garansi WHERE spkId = ? ORDER BY endDate DESC LIMIT 1', [spkId]),
      db.queryVal<number>("SELECT COALESCE(SUM(points),0) FROM loyalty_points WHERE refType = 'transaksi' AND refId = ? AND type = 'earn'", [spkId]),
    ]);
    const points = pointsRow || 0;
    const endDate = garansi ? new Date(garansi.endDate).toLocaleDateString('id-ID') : '-';

    await trySend(spk.pelangganPhone, 'Lunas & Gate Pass', spk.mode, {
      nama: spk.pelangganName,
      kendaraan: spk.kendaraanName ? `${spk.kendaraanName} (${spk.kendaraanPlat})` : '-',
      judul_proyek: spk.judulProyek || '-',
      poin: String(points),
      batas_garansi: endDate,
      invoice: invoiceNo,
      no_spk: spk.noSpk,
      public_id: pembayaran?.publicId || '',
    });
  } catch (e: any) {
    console.error('[WA] notifyGatePassReleased error:', e.message);
  }
}

/** 7. SPK Dibatalkan — called when SPK cancelled */
export async function notifySpkBatal(spkId: number) {
  try {
    const spk = await db.queryOne<any>('SELECT s.*, p.name AS pelangganName, p.phone AS pelangganPhone, k.name AS kendaraanName, k.plat AS kendaraanPlat FROM spk s LEFT JOIN pelanggan p ON p.id = s.pelangganId LEFT JOIN kendaraan k ON k.id = s.kendaraanId WHERE s.id = ?', [spkId]);
    if (!spk) return;
    await trySend(spk.pelangganPhone, 'SPK Dibatalkan', spk.mode, {
      nama: spk.pelangganName,
      kendaraan: spk.kendaraanName ? `${spk.kendaraanName} (${spk.kendaraanPlat})` : '-',
      no_spk: spk.noSpk,
    });
  } catch (e: any) {
    console.error('[WA] notifySpkBatal error:', e.message);
  }
}
