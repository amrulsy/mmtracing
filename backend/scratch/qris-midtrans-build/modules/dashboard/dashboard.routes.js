"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../../config/db"));
const auth_1 = require("../../middleware/auth");
const utils_1 = require("../../shared/utils");
const cache_1 = require("../../shared/cache");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
router.get('/', async (_req, res, next) => {
    try {
        const data = await cache_1.appCache.getOrSet('dashboard:main', async () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const [woAntri, woDikerjakan, woSelesaiHariIni, woKendala, pendapatanHariIniRow, pendapatanBulanRow, mekanikRows, stokMenipisRow, stokHabis, pelangganBaru, recentSpkRows, recentActivityRows, spkDistribution, pengeluaranHariIniRow, pengeluaranBulanRow,] = await Promise.all([
                db_1.default.queryVal("SELECT COUNT(*) FROM work_orders WHERE status = 'antri'"),
                db_1.default.queryVal("SELECT COUNT(*) FROM work_orders WHERE status = 'dikerjakan'"),
                db_1.default.queryVal("SELECT COUNT(*) FROM work_orders WHERE status = 'selesai' AND completedAt >= ?", [today]),
                db_1.default.queryVal("SELECT COUNT(*) FROM work_orders WHERE status = 'kendala'"),
                db_1.default.queryOne('SELECT COALESCE(SUM(jumlah),0) AS t FROM pembayaran_detail WHERE tanggal >= ?', [today]),
                db_1.default.queryOne('SELECT COALESCE(SUM(jumlah),0) AS t FROM pembayaran_detail WHERE tanggal >= ?', [thisMonth]),
                db_1.default.query("SELECT * FROM mekanik WHERE status != 'off'"),
                db_1.default.queryOne('SELECT COUNT(*) AS count FROM sparepart WHERE stok > 0 AND stok <= stokMinimum'),
                db_1.default.queryVal('SELECT COUNT(*) FROM sparepart WHERE stok = 0'),
                db_1.default.queryVal('SELECT COUNT(*) FROM pelanggan WHERE createdAt >= ? AND deletedAt IS NULL', [thisMonth]),
                db_1.default.query(`SELECT s.*, p.name AS pName, k.name AS kName, k.plat AS kPlat, m.name AS mName
           FROM work_orders s LEFT JOIN pelanggan p ON p.id = s.pelangganId
           LEFT JOIN kendaraan k ON k.id = s.kendaraanId LEFT JOIN mekanik m ON m.id = s.mekanikId
           ORDER BY s.createdAt DESC LIMIT 5`),
                db_1.default.query(`SELECT a.*, u.name AS userName FROM activity_logs a LEFT JOIN users u ON u.id = a.userId
           ORDER BY a.createdAt DESC LIMIT 10`),
                db_1.default.query("SELECT mode, COUNT(*) AS _count FROM work_orders WHERE status NOT IN ('selesai','dibatalkan') GROUP BY mode"),
                db_1.default.queryOne('SELECT COALESCE(SUM(jumlah),0) AS t FROM pengeluaran WHERE tanggal >= ?', [today]),
                db_1.default.queryOne('SELECT COALESCE(SUM(jumlah),0) AS t FROM pengeluaran WHERE tanggal >= ?', [thisMonth]),
            ]);
            // Attach active SPKs to mekanik
            let mekanikAktif = mekanikRows;
            if (mekanikRows.length) {
                const mIds = mekanikRows.map((m) => m.id);
                const activeSpks = await db_1.default.query("SELECT mekanikId, noWo FROM work_orders WHERE mekanikId IN (?) AND status = 'dikerjakan'", [mIds]);
                const spkMap = new Map();
                for (const s of activeSpks) {
                    if (!spkMap.has(s.mekanikId))
                        spkMap.set(s.mekanikId, []);
                    spkMap.get(s.mekanikId).push({ noWo: s.noWo });
                }
                mekanikAktif = mekanikRows.map((m) => ({ ...m, spk: spkMap.get(m.id) || [] }));
            }
            const distributionMap = spkDistribution.reduce((acc, curr) => {
                acc[curr.mode] = curr._count;
                return acc;
            }, { rutin: 0, modifikasi: 0, bubut: 0 });
            const recentWo = recentSpkRows.map((s) => ({
                ...s,
                pelanggan: { name: s.pName },
                kendaraan: s.kName ? { name: s.kName, plat: s.kPlat } : null,
                mekanik: s.mName ? { name: s.mName } : null,
            }));
            const recentActivity = recentActivityRows.map((a) => ({ ...a, user: a.userName ? { name: a.userName } : null }));
            return {
                kpi: {
                    woAntri, woDikerjakan, woSelesaiHariIni, woKendala,
                    spkAntri: woAntri, spkDikerjakan: woDikerjakan, spkSelesaiHariIni: woSelesaiHariIni, spkKendala: woKendala,
                    pendapatanHariIni: Number(pendapatanHariIniRow?.t || 0),
                    pendapatanBulan: Number(pendapatanBulanRow?.t || 0),
                    pengeluaranHariIni: Number(pengeluaranHariIniRow?.t || 0),
                    pengeluaranBulan: Number(pengeluaranBulanRow?.t || 0),
                    stokMenipis: Number(stokMenipisRow?.count || 0),
                    stokHabis,
                    pelangganBaru,
                },
                mekanikAktif,
                recentWo,
                recentSpk: recentWo,
                recentActivity,
                distribution: distributionMap,
            };
        }, cache_1.CACHE_TTL.SHORT); // 30 seconds cache
        (0, utils_1.sendSuccess)(res, data);
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=dashboard.routes.js.map