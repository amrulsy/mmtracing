/**
 * Gate-Pass: Shared logic for issuing warranty (Garansi) and loyalty points
 * upon SPK completion + invoice payment (lunas).
 * 
 * Called from two places:
 * 1. spk.service.ts — when SPK is marked 'selesai' and invoice was already 'lunas'
 * 2. pembayaran.routes.ts — when invoice is marked 'lunas' and SPK is already 'selesai'
 */

import type { Queryable } from '../config/db';

export async function releaseGatePass(tx: Queryable, spkId: number): Promise<void> {
  const spk = await tx.queryOne<any>('SELECT * FROM spk WHERE id = ?', [spkId]);
  if (!spk) return;

  // ── Guard: jangan terbitkan garansi/poin duplikat ─────────────
  const existingGaransi = await tx.queryVal<number>('SELECT COUNT(*) FROM garansi WHERE spkId = ?', [spkId]);
  if (existingGaransi > 0) return; // Already issued

  // Fetch items with jasa data, and stages
  const [items, stages] = await Promise.all([
    tx.query(
      `SELECT si.*, j.garansiHari AS jasaGaransiHari
       FROM spk_items si LEFT JOIN jasa j ON j.id = si.jasaId
       WHERE si.spkId = ?`, [spkId]),
    tx.query('SELECT * FROM spk_stages WHERE spkId = ?', [spkId]),
  ]);

  // ── 1. Terbitkan Garansi ──────────────────────────────────────
  const warrantySources = items.length > 0 ? items : stages;
  for (const item of warrantySources) {
    let daysGaransi = 30; // default jasa
    let typeGaransi = 'jasa';

    if ('type' in item && item.type === 'sparepart') {
      daysGaransi = 180;
      typeGaransi = 'part';
    } else if ('type' in item && item.type === 'jasa' && item.jasaGaransiHari) {
      daysGaransi = item.jasaGaransiHari;
      typeGaransi = 'jasa';
    }
    if (spk.mode === 'modifikasi') {
      daysGaransi = 90;
      typeGaransi = 'modif';
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + daysGaransi);

    await tx.insert('garansi', {
      spkId,
      itemName: item.nama,
      type: typeGaransi,
      startDate,
      endDate,
    });
  }

  // ── 2. Terbitkan Loyalty Points (1 poin per Rp 10.000) ───────
  const pembayaran = await tx.queryOne<{ totalTagihan: number }>(
    'SELECT totalTagihan FROM pembayaran WHERE spkId = ? LIMIT 1', [spkId]);
  const totalNum = pembayaran ? Number(pembayaran.totalTagihan) : Number(spk.totalHarga);
  if (totalNum > 0) {
    const points = Math.floor(totalNum / 10000);
    if (points > 0) {
      await tx.insert('loyalty_points', {
        pelangganId: spk.pelangganId,
        type: 'earn',
        points,
        description: `Poin dari ${spk.noSpk}`,
        refType: 'transaksi',
        refId: spk.id,
      });
    }
  }
}
