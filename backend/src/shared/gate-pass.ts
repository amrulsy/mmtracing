/**
 * Gate-Pass: Shared logic for issuing warranty (Garansi) and loyalty points
 * upon SPK completion + invoice payment (lunas).
 * 
 * Called from two places:
 * 1. spk.service.ts — when SPK is marked 'selesai' and invoice was already 'lunas'
 * 2. pembayaran.routes.ts — when invoice is marked 'lunas' and SPK is already 'selesai'
 */

export async function releaseGatePass(tx: any, spkId: number): Promise<void> {
  const spk = await tx.spk.findUnique({
    where: { id: spkId },
    include: { items: true, stages: true },
  });
  if (!spk) return;

  // ── Guard: jangan terbitkan garansi/poin duplikat ─────────────
  const existingGaransi = await tx.garansi.count({ where: { spkId } });
  if (existingGaransi > 0) return; // Already issued

  // ── 1. Terbitkan Garansi ──────────────────────────────────────
  const warrantySources = spk.items.length > 0 ? spk.items : spk.stages;
  for (const item of warrantySources) {
    let daysGaransi = 30; // default jasa
    let typeGaransi = 'jasa';

    if ('type' in item && item.type === 'sparepart') {
      daysGaransi = 180;
      typeGaransi = 'part';
    }
    if (spk.mode === 'modifikasi') {
      daysGaransi = 90;
      typeGaransi = 'modif';
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + daysGaransi);

    await tx.garansi.create({
      data: {
        spkId,
        itemName: item.nama,
        type: typeGaransi,
        startDate,
        endDate,
      },
    });
  }

  // ── 2. Terbitkan Loyalty Points (1 poin per Rp 10.000) ───────
  const totalNum = spk.totalHarga.toNumber();
  if (totalNum > 0) {
    const points = Math.floor(totalNum / 10000);
    if (points > 0) {
      await tx.loyaltyPoint.create({
        data: {
          pelangganId: spk.pelangganId,
          type: 'earn',
          points,
          description: `Poin dari ${spk.noSpk}`,
          refType: 'transaksi',
          refId: spk.id,
        },
      });
    }
  }
}
