import { Router, Request, Response, NextFunction } from 'express';
import db from '../../config/db';
import { authMiddleware } from '../../middleware/auth';
import { sendSuccess } from '../../shared/utils';
import { appCache, CACHE_TTL } from '../../shared/cache';

const router = Router();
router.use(authMiddleware);

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await appCache.getOrSet('dashboard:main', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const [
        spkAntri, spkDikerjakan, spkSelesaiHariIni, spkKendala,
        pendapatanHariIniRow, pendapatanBulanRow,
        mekanikRows,
        stokMenipisRow, stokHabis,
        pelangganBaru,
        recentSpkRows, recentActivityRows,
        spkDistribution,
        pengeluaranHariIniRow, pengeluaranBulanRow,
      ] = await Promise.all([
        db.queryVal<number>("SELECT COUNT(*) FROM spk WHERE status = 'antri'"),
        db.queryVal<number>("SELECT COUNT(*) FROM spk WHERE status = 'dikerjakan'"),
        db.queryVal<number>("SELECT COUNT(*) FROM spk WHERE status = 'selesai' AND completedAt >= ?", [today]),
        db.queryVal<number>("SELECT COUNT(*) FROM spk WHERE status = 'kendala'"),

        db.queryOne<{ t: number }>('SELECT COALESCE(SUM(jumlah),0) AS t FROM pembayaran_detail WHERE tanggal >= ?', [today]),
        db.queryOne<{ t: number }>('SELECT COALESCE(SUM(jumlah),0) AS t FROM pembayaran_detail WHERE tanggal >= ?', [thisMonth]),

        db.query("SELECT * FROM mekanik WHERE status != 'off'"),

        db.queryOne<{ count: number }>('SELECT COUNT(*) AS count FROM sparepart WHERE stok > 0 AND stok <= stokMinimum'),
        db.queryVal<number>('SELECT COUNT(*) FROM sparepart WHERE stok = 0'),

        db.queryVal<number>('SELECT COUNT(*) FROM pelanggan WHERE createdAt >= ? AND deletedAt IS NULL', [thisMonth]),

        db.query(
          `SELECT s.*, p.name AS pName, k.name AS kName, k.plat AS kPlat, m.name AS mName
           FROM spk s LEFT JOIN pelanggan p ON p.id = s.pelangganId
           LEFT JOIN kendaraan k ON k.id = s.kendaraanId LEFT JOIN mekanik m ON m.id = s.mekanikId
           ORDER BY s.createdAt DESC LIMIT 5`),
        db.query(
          `SELECT a.*, u.name AS userName FROM activity_logs a LEFT JOIN users u ON u.id = a.userId
           ORDER BY a.createdAt DESC LIMIT 10`),
        db.query(
          "SELECT mode, COUNT(*) AS _count FROM spk WHERE status NOT IN ('selesai','dibatalkan') GROUP BY mode"),

        db.queryOne<{ t: number }>('SELECT COALESCE(SUM(jumlah),0) AS t FROM pengeluaran WHERE tanggal >= ?', [today]),
        db.queryOne<{ t: number }>('SELECT COALESCE(SUM(jumlah),0) AS t FROM pengeluaran WHERE tanggal >= ?', [thisMonth]),
      ]);

      // Attach active SPKs to mekanik
      let mekanikAktif = mekanikRows;
      if (mekanikRows.length) {
        const mIds = mekanikRows.map((m: any) => m.id);
        const activeSpks = await db.query(
          "SELECT mekanikId, noSpk FROM spk WHERE mekanikId IN (?) AND status = 'dikerjakan'", [mIds]);
        const spkMap = new Map<number, any[]>();
        for (const s of activeSpks) { if (!spkMap.has(s.mekanikId)) spkMap.set(s.mekanikId, []); spkMap.get(s.mekanikId)!.push({ noSpk: s.noSpk }); }
        mekanikAktif = mekanikRows.map((m: any) => ({ ...m, spk: spkMap.get(m.id) || [] }));
      }

      const distributionMap = spkDistribution.reduce((acc: any, curr: any) => {
        acc[curr.mode] = curr._count;
        return acc;
      }, { rutin: 0, modifikasi: 0, bubut: 0 });

      const recentSpk = recentSpkRows.map((s: any) => ({
        ...s,
        pelanggan: { name: s.pName },
        kendaraan: s.kName ? { name: s.kName, plat: s.kPlat } : null,
        mekanik: s.mName ? { name: s.mName } : null,
      }));
      const recentActivity = recentActivityRows.map((a: any) => ({ ...a, user: a.userName ? { name: a.userName } : null }));

      return {
        kpi: {
          spkAntri, spkDikerjakan, spkSelesaiHariIni, spkKendala,
          pendapatanHariIni: Number(pendapatanHariIniRow?.t || 0),
          pendapatanBulan: Number(pendapatanBulanRow?.t || 0),
          pengeluaranHariIni: Number(pengeluaranHariIniRow?.t || 0),
          pengeluaranBulan: Number(pengeluaranBulanRow?.t || 0),
          stokMenipis: Number(stokMenipisRow?.count || 0),
          stokHabis,
          pelangganBaru,
        },
        mekanikAktif,
        recentSpk,
        recentActivity,
        distribution: distributionMap,
      };
    }, CACHE_TTL.SHORT); // 30 seconds cache

    sendSuccess(res, data);
  } catch (e) { next(e); }
});

export default router;

