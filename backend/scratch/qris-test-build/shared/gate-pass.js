"use strict";
/**
 * Gate-Pass: Shared logic for issuing warranty (Garansi) and loyalty points
 * upon Work Order completion + invoice payment (lunas).
 *
 * Called from two places:
 * 1. wo.service.ts — when WO is marked 'selesai' and invoice was already 'lunas'
 * 2. pembayaran.routes.ts — when invoice is marked 'lunas' and WO is already 'selesai'
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.releaseGatePass = releaseGatePass;
async function releaseGatePass(tx, woId) {
    const wo = await tx.queryOne('SELECT * FROM work_orders WHERE id = ?', [woId]);
    if (!wo)
        return;
    // ── Guard: jangan terbitkan garansi/poin duplikat ─────────────
    const existingGaransi = await tx.queryVal('SELECT COUNT(*) FROM garansi WHERE woId = ?', [woId]);
    if (existingGaransi > 0)
        return; // Already issued
    // Fetch items with jasa data, and stages
    const [items, stages] = await Promise.all([
        tx.query(`SELECT si.*, j.garansiHari AS jasaGaransiHari
       FROM wo_items si LEFT JOIN jasa j ON j.id = si.jasaId
       WHERE si.woId = ?`, [woId]),
        tx.query('SELECT * FROM wo_stages WHERE woId = ?', [woId]),
    ]);
    // ── 1. Terbitkan Garansi ──────────────────────────────────────
    const warrantySources = items.length > 0 ? items : stages;
    for (const item of warrantySources) {
        let daysGaransi = 30; // default jasa
        let typeGaransi = 'jasa';
        if ('type' in item && item.type === 'sparepart') {
            daysGaransi = 180;
            typeGaransi = 'part';
        }
        else if ('type' in item && item.type === 'jasa' && item.jasaGaransiHari) {
            daysGaransi = item.jasaGaransiHari;
            typeGaransi = 'jasa';
        }
        if (wo.mode === 'modifikasi') {
            daysGaransi = 90;
            typeGaransi = 'modif';
        }
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + daysGaransi);
        await tx.insert('garansi', {
            woId,
            itemName: item.nama,
            type: typeGaransi,
            startDate,
            endDate,
        });
    }
    // ── 2. Terbitkan Loyalty Points (1 poin per Rp 10.000) ───────
    const pembayaran = await tx.queryOne('SELECT totalTagihan FROM pembayaran WHERE woId = ? LIMIT 1', [woId]);
    const totalNum = pembayaran ? Number(pembayaran.totalTagihan) : Number(wo.totalHarga);
    if (totalNum > 0) {
        const points = Math.floor(totalNum / 10000);
        if (points > 0) {
            await tx.insert('loyalty_points', {
                pelangganId: wo.pelangganId,
                type: 'earn',
                points,
                description: `Poin dari ${wo.noWo}`,
                refType: 'transaksi',
                refId: wo.id,
            });
        }
    }
}
//# sourceMappingURL=gate-pass.js.map