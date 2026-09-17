"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../../config/db"));
const auth_1 = require("../../middleware/auth");
const utils_1 = require("../../shared/utils");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// GET /laporan/pendapatan
router.get('/pendapatan', async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const end = endDate ? new Date(endDate) : new Date();
        end.setHours(23, 59, 59, 999); // Inklusif hingga akhir hari
        const payments = await db_1.default.query(`SELECT pd.jumlah, pd.tanggal, s.mode
       FROM pembayaran_detail pd
       JOIN pembayaran p ON p.id = pd.pembayaranId
       JOIN work_orders s ON s.id = p.woId
       WHERE pd.tanggal >= ? AND pd.tanggal <= ?
       ORDER BY pd.tanggal ASC`, [start, end]);
        // Group by date (WIB = UTC+7)
        const grouped = payments.reduce((acc, p) => {
            const day = new Date(p.tanggal).toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
            if (!acc[day])
                acc[day] = { date: day, rutin: 0, modifikasi: 0, bubut: 0, total: 0 };
            const amount = Number(p.jumlah);
            acc[day].total += amount;
            const mode = p.mode;
            if (mode === 'rutin')
                acc[day].rutin += amount;
            else if (mode === 'modifikasi')
                acc[day].modifikasi += amount;
            else if (mode === 'bubut')
                acc[day].bubut += amount;
            return acc;
        }, {});
        const daily = Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
        const total = daily.reduce((s, d) => s + d.total, 0);
        (0, utils_1.sendSuccess)(res, { daily, total });
    }
    catch (e) {
        next(e);
    }
});
// GET /laporan/laba-rugi — Menghitung Laba Rugi (Pendapatan - HPP - Pengeluaran)
// Support basis: cash (default) | accrual. HPP mencakup sparepart + jasa (via hargaModal).
async function computeLabaRugi(start, end, basis) {
    const [cashInRow, pengeluaranRow, completedSpkRow, spkItems] = await Promise.all([
        db_1.default.queryOne('SELECT COALESCE(SUM(jumlah),0) AS total FROM pembayaran_detail WHERE tanggal >= ? AND tanggal <= ?', [start, end]),
        db_1.default.queryOne('SELECT COALESCE(SUM(jumlah),0) AS total FROM pengeluaran WHERE tanggal >= ? AND tanggal <= ?', [start, end]),
        db_1.default.queryOne("SELECT COALESCE(SUM(totalHarga),0) AS sumHarga, COALESCE(SUM(diskon),0) AS sumDiskon FROM work_orders WHERE status = 'selesai' AND completedAt >= ? AND completedAt <= ?", [start, end]),
        db_1.default.query("SELECT i.type, i.hargaModal, i.qty FROM wo_items i JOIN work_orders s ON s.id = i.woId WHERE s.status = 'selesai' AND s.completedAt >= ? AND s.completedAt <= ?", [start, end]),
    ]);
    const totalPengeluaran = Number(pengeluaranRow?.total || 0);
    const totalPendapatan = basis === 'accrual'
        ? Number(completedSpkRow?.sumHarga || 0) - Number(completedSpkRow?.sumDiskon || 0)
        : Number(cashInRow?.total || 0);
    const hppSparepart = spkItems.filter((i) => i.type === 'sparepart').reduce((s, i) => s + Number(i.hargaModal) * i.qty, 0);
    const hppJasa = spkItems.filter((i) => i.type === 'jasa').reduce((s, i) => s + Number(i.hargaModal) * i.qty, 0);
    const totalHpp = hppSparepart + hppJasa;
    const labaKotor = totalPendapatan - totalHpp;
    const labaBersih = labaKotor - totalPengeluaran;
    const marginKotor = totalPendapatan > 0 ? (labaKotor / totalPendapatan) * 100 : 0;
    const marginBersih = totalPendapatan > 0 ? (labaBersih / totalPendapatan) * 100 : 0;
    return {
        basis,
        pendapatan: totalPendapatan,
        hpp: totalHpp,
        hppSparepart,
        hppJasa,
        labaKotor,
        pengeluaran: totalPengeluaran,
        labaBersih,
        marginKotor,
        marginBersih,
    };
}
router.get('/laba-rugi', async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const basis = req.query.basis === 'accrual' ? 'accrual' : 'cash';
        const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const end = endDate ? new Date(endDate) : new Date();
        end.setHours(23, 59, 59, 999);
        const result = await computeLabaRugi(start, end, basis);
        (0, utils_1.sendSuccess)(res, { periode: { start, end }, ...result });
    }
    catch (e) {
        next(e);
    }
});
// GET /laporan/mekanik — top mekanik performance (per periode, cash-basis via totalBayar)
router.get('/mekanik', async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const end = endDate ? new Date(endDate) : new Date();
        end.setHours(23, 59, 59, 999);
        const [data, revenueRaw] = await Promise.all([
            db_1.default.query('SELECT m.*, (SELECT COUNT(*) FROM work_orders WHERE mekanikId = m.id) AS spkCount FROM mekanik m ORDER BY m.totalSpk DESC'),
            db_1.default.query("SELECT mekanikId, SUM(totalBayar) AS sumBayar, COUNT(*) AS cnt FROM work_orders WHERE status = 'selesai' AND completedAt >= ? AND completedAt <= ? GROUP BY mekanikId", [start, end]),
        ]);
        const revenueMap = new Map(revenueRaw.map((r) => [r.mekanikId, Number(r.sumBayar || 0)]));
        const selesaiMap = new Map(revenueRaw.map((r) => [r.mekanikId, Number(r.cnt)]));
        const enriched = data
            .map((m) => ({
            ...m,
            _count: { spk: m.spkCount },
            totalPendapatan: revenueMap.get(m.id) || 0,
            spkSelesai: selesaiMap.get(m.id) || 0,
        }))
            .filter((m) => m.spkSelesai > 0 || m.totalPendapatan > 0)
            .sort((a, b) => b.totalPendapatan - a.totalPendapatan);
        (0, utils_1.sendSuccess)(res, enriched);
    }
    catch (e) {
        next(e);
    }
});
// GET /laporan/pelanggan — customer analytics (pelangganBaru periode-aware)
router.get('/pelanggan', async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const end = endDate ? new Date(endDate) : new Date();
        end.setHours(23, 59, 59, 999);
        const [topSpenders, totalPelangganRow, pelangganBaruRow, repeatData] = await Promise.all([
            db_1.default.query('SELECT p.*, (SELECT COUNT(*) FROM work_orders WHERE pelangganId = p.id) AS spkCount FROM pelanggan p ORDER BY p.totalTrx DESC LIMIT 10'),
            db_1.default.queryVal('SELECT COUNT(*) FROM pelanggan'),
            db_1.default.queryVal('SELECT COUNT(*) FROM pelanggan WHERE createdAt >= ? AND createdAt <= ?', [start, end]),
            db_1.default.query("SELECT pelangganId, COUNT(*) AS cnt FROM work_orders WHERE status = 'selesai' GROUP BY pelangganId"),
        ]);
        const totalPelanggan = totalPelangganRow ?? 0;
        const pelangganBaru = pelangganBaruRow ?? 0;
        const uniquePelangganWithSpk = repeatData.length;
        const repeatPelanggan = repeatData.filter((r) => r.cnt > 1).length;
        const repeatRate = uniquePelangganWithSpk > 0 ? (repeatPelanggan / uniquePelangganWithSpk) * 100 : 0;
        const mappedTopSpenders = topSpenders.map((p) => ({
            ...p,
            _count: { spk: p.spkCount }
        }));
        (0, utils_1.sendSuccess)(res, { topSpenders: mappedTopSpenders, totalPelanggan, pelangganBaru, repeatRate, repeatPelanggan, uniquePelangganWithSpk });
    }
    catch (e) {
        next(e);
    }
});
// GET /laporan/pengeluaran-breakdown — breakdown pengeluaran per kategori
router.get('/pengeluaran-breakdown', async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const end = endDate ? new Date(endDate) : new Date();
        end.setHours(23, 59, 59, 999);
        const rows = await db_1.default.query(`SELECT kategoriId, SUM(jumlah) AS sumJumlah, COUNT(*) AS cnt
       FROM pengeluaran WHERE tanggal >= ? AND tanggal <= ? GROUP BY kategoriId`, [start, end]);
        const katIds = rows.map((r) => r.kategoriId).filter(Boolean);
        const kategoris = katIds.length ? await db_1.default.query('SELECT id, name FROM kategori_pengeluaran WHERE id IN (?)', [katIds]) : [];
        const map = new Map(kategoris.map((k) => [k.id, k.name]));
        const total = rows.reduce((s, r) => s + Number(r.sumJumlah || 0), 0);
        const breakdown = rows
            .map((r) => ({
            kategoriId: r.kategoriId,
            kategori: map.get(r.kategoriId) || 'Lainnya',
            jumlah: Number(r.sumJumlah || 0),
            count: Number(r.cnt),
            persen: total > 0 ? (Number(r.sumJumlah || 0) / total) * 100 : 0,
        }))
            .sort((a, b) => b.jumlah - a.jumlah);
        (0, utils_1.sendSuccess)(res, { total, breakdown });
    }
    catch (e) {
        next(e);
    }
});
// GET /laporan/kpi — KPI ringkas + perbandingan periode sebelumnya
router.get('/kpi', async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const basis = req.query.basis === 'accrual' ? 'accrual' : 'cash';
        const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const end = endDate ? new Date(endDate) : new Date();
        end.setHours(23, 59, 59, 999);
        // Periode sebelumnya dengan durasi sama
        const durationMs = end.getTime() - start.getTime();
        const prevEnd = new Date(start.getTime() - 1);
        const prevStart = new Date(prevEnd.getTime() - durationMs);
        const [curr, prev, currSpkStats, prevSpkStats, mekanikAktif] = await Promise.all([
            computeLabaRugi(start, end, basis),
            computeLabaRugi(prevStart, prevEnd, basis),
            db_1.default.queryOne("SELECT COUNT(*) AS cnt, AVG(totalHarga) AS avgHarga FROM work_orders WHERE status = 'selesai' AND completedAt >= ? AND completedAt <= ?", [start, end]),
            db_1.default.queryOne("SELECT COUNT(*) AS cnt, AVG(totalHarga) AS avgHarga FROM work_orders WHERE status = 'selesai' AND completedAt >= ? AND completedAt <= ?", [prevStart, prevEnd]),
            db_1.default.queryVal("SELECT COUNT(*) FROM mekanik WHERE status IN ('available','busy')"),
        ]);
        const changePct = (c, p) => (p === 0 ? (c > 0 ? 100 : 0) : ((c - p) / Math.abs(p)) * 100);
        const currCnt = Number(currSpkStats?.cnt || 0);
        const currAvg = Number(currSpkStats?.avgHarga || 0);
        const prevCnt = Number(prevSpkStats?.cnt || 0);
        const prevAvg = Number(prevSpkStats?.avgHarga || 0);
        (0, utils_1.sendSuccess)(res, {
            periode: { start, end },
            periodeSebelumnya: { start: prevStart, end: prevEnd },
            basis,
            current: {
                ...curr,
                spkSelesai: currCnt,
                avgTicket: currAvg,
                mekanikAktif,
            },
            previous: {
                ...prev,
                spkSelesai: prevCnt,
                avgTicket: prevAvg,
            },
            change: {
                pendapatan: changePct(curr.pendapatan, prev.pendapatan),
                labaBersih: changePct(curr.labaBersih, prev.labaBersih),
                pengeluaran: changePct(curr.pengeluaran, prev.pengeluaran),
                spkSelesai: changePct(currCnt, prevCnt),
                avgTicket: changePct(currAvg, prevAvg),
            },
        });
    }
    catch (e) {
        next(e);
    }
});
// GET /laporan/layanan — service statistics
router.get('/layanan', async (_req, res, next) => {
    try {
        const data = await db_1.default.query("SELECT mode, COUNT(*) AS _count, COALESCE(SUM(totalHarga),0) AS _sum FROM work_orders WHERE deletedAt IS NULL GROUP BY mode");
        (0, utils_1.sendSuccess)(res, data);
    }
    catch (e) {
        next(e);
    }
});
// GET /laporan/top-items — Top 5 Jasa & Sparepart
router.get('/top-items', async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const end = endDate ? new Date(endDate) : new Date();
        end.setHours(23, 59, 59, 999);
        // DB-level groupBy supaya tidak ada batasan 1000 baris
        const rows = await db_1.default.query(`SELECT i.type, i.nama, SUM(i.qty) AS sumQty, SUM(i.subtotal) AS sumSubtotal
       FROM wo_items i JOIN work_orders s ON s.id = i.woId
       WHERE s.status = 'selesai' AND s.completedAt >= ? AND s.completedAt <= ?
       GROUP BY i.type, i.nama`, [start, end]);
        const topJasa = rows
            .filter((r) => r.type === 'jasa')
            .map((r) => ({ name: r.nama, qty: Number(r.sumQty || 0), revenue: Number(r.sumSubtotal || 0) }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
        const topSparepart = rows
            .filter((r) => r.type === 'sparepart')
            .map((r) => ({ name: r.nama, qty: Number(r.sumQty || 0), revenue: Number(r.sumSubtotal || 0) }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
        (0, utils_1.sendSuccess)(res, { topJasa, topSparepart });
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=laporan.routes.js.map