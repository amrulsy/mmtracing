import prisma from '../../config/database';
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
    const setting = await prisma.setting.findUnique({ where: { key: 'templates' } });
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
    const spk = await prisma.spk.findUnique({
      where: { id: spkId },
      include: { pelanggan: true, kendaraan: true },
    });
    if (!spk) return;
    await trySend(spk.pelanggan.phone, 'SPK Dibuat', spk.mode, {
      nama: spk.pelanggan.name,
      kendaraan: spk.kendaraan ? `${spk.kendaraan.name} (${spk.kendaraan.plat})` : '-',
      no_spk: spk.noSpk,
      estimasi: spk.estimasiSelesai ? new Date(spk.estimasiSelesai).toLocaleDateString('id-ID') : 'Segera',
      minimum_dp: `Rp ${spk.minimumDp.toNumber().toLocaleString('id-ID')}`,
      total: `Rp ${spk.totalHarga.toNumber().toLocaleString('id-ID')}`,
    });
  } catch (e: any) {
    console.error('[WA] notifySpkCreated error:', e.message);
  }
}

/** 2. Progress Update — called after progress change */
export async function notifyProgressUpdate(spkId: number) {
  try {
    const spk = await prisma.spk.findUnique({
      where: { id: spkId },
      include: { pelanggan: true, kendaraan: true, stages: { orderBy: { urutan: 'asc' } } },
    });
    if (!spk) return;
    
    const currentStage = spk.stages.find((s: any) => s.status === 'in_progress') || spk.stages.find((s: any) => s.status === 'done');
    await trySend(spk.pelanggan.phone, 'Progress Update', spk.mode, {
      nama: spk.pelanggan.name,
      kendaraan: spk.kendaraan ? `${spk.kendaraan.name} (${spk.kendaraan.plat})` : '-',
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
    const spk = await prisma.spk.findUnique({
      where: { id: spkId },
      include: { pelanggan: true, kendaraan: true, pembayaran: { select: { totalTagihan: true, sisaBayar: true } } },
    });
    if (!spk) return;
    // Gunakan totalTagihan dari invoice (sudah dipotong diskon), fallback ke totalHarga
    const pembayaran = spk.pembayaran?.[0];
    const totalDisplay = pembayaran
      ? pembayaran.totalTagihan.toNumber()
      : spk.totalHarga.toNumber();
    await trySend(spk.pelanggan.phone, 'Selesai & Siap Ambil', spk.mode, {
      nama: spk.pelanggan.name,
      kendaraan: spk.kendaraan ? `${spk.kendaraan.name} (${spk.kendaraan.plat})` : '-',
      judul_proyek: spk.judulProyek || '-',
      total: `Rp ${totalDisplay.toLocaleString('id-ID')}`,
      sisa: pembayaran ? `Rp ${pembayaran.sisaBayar.toNumber().toLocaleString('id-ID')}` : '-',
      no_spk: spk.noSpk,
    });
  } catch (e: any) {
    console.error('[WA] notifySpkSelesai error:', e.message);
  }
}

/** 4. Reminder Pembayaran — called when payment is partially paid */
export async function notifyReminderPembayaran(pembayaranId: number) {
  try {
    const p = await prisma.pembayaran.findUnique({
      where: { id: pembayaranId },
      include: { spk: { include: { pelanggan: true, kendaraan: true } } },
    });
    if (!p) return;
    await trySend(p.spk.pelanggan.phone, 'Reminder Pembayaran', p.spk.mode, {
      nama: p.spk.pelanggan.name,
      kendaraan: p.spk.kendaraan ? `${p.spk.kendaraan.name} (${p.spk.kendaraan.plat})` : '-',
      judul_proyek: p.spk.judulProyek || '-',
      sisa: `Rp ${p.sisaBayar.toNumber().toLocaleString('id-ID')}`,
      invoice: p.noInvoice,
      no_spk: p.spk.noSpk,
    });
  } catch (e: any) {
    console.error('[WA] notifyReminderPembayaran error:', e.message);
  }
}

/** 5. SPK Kendala — called when SPK is pending due to technical issues */
export async function notifySpkKendala(spkId: number, approvalLink?: string) {
  try {
    const spk = await prisma.spk.findUnique({
      where: { id: spkId },
      include: { pelanggan: true, kendaraan: true },
    });
    if (!spk) return;
    await trySend(spk.pelanggan.phone, 'SPK Kendala', spk.mode, {
      nama: spk.pelanggan.name,
      kendaraan: spk.kendaraan ? `${spk.kendaraan.name} (${spk.kendaraan.plat})` : '-',
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
    const spk = await prisma.spk.findUnique({
      where: { id: spkId },
      include: { 
        pelanggan: true, 
        kendaraan: true, 
        garansi: { orderBy: { endDate: 'desc' }, take: 1 }
      },
    });
    if (!spk) return;

    const pointsAgg = await prisma.loyaltyPoint.aggregate({
      where: { refType: 'transaksi', refId: spkId, type: 'earn' },
      _sum: { points: true }
    });
    const points = pointsAgg._sum.points || 0;
    
    const endDate = spk.garansi.length > 0 ? new Date(spk.garansi[0].endDate).toLocaleDateString('id-ID') : '-';

    await trySend(spk.pelanggan.phone, 'Lunas & Gate Pass', spk.mode, {
      nama: spk.pelanggan.name,
      kendaraan: spk.kendaraan ? `${spk.kendaraan.name} (${spk.kendaraan.plat})` : '-',
      judul_proyek: spk.judulProyek || '-',
      poin: String(points),
      batas_garansi: endDate,
      invoice: invoiceNo,
      no_spk: spk.noSpk,
    });
  } catch (e: any) {
    console.error('[WA] notifyGatePassReleased error:', e.message);
  }
}

/** 7. SPK Dibatalkan — called when SPK cancelled */
export async function notifySpkBatal(spkId: number) {
  try {
    const spk = await prisma.spk.findUnique({
      where: { id: spkId },
      include: { pelanggan: true, kendaraan: true },
    });
    if (!spk) return;
    await trySend(spk.pelanggan.phone, 'SPK Dibatalkan', spk.mode, {
      nama: spk.pelanggan.name,
      kendaraan: spk.kendaraan ? `${spk.kendaraan.name} (${spk.kendaraan.plat})` : '-',
      no_spk: spk.noSpk,
    });
  } catch (e: any) {
    console.error('[WA] notifySpkBatal error:', e.message);
  }
}
