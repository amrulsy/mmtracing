import { Router, Request, Response, NextFunction } from 'express';
import db from '../../config/db';
import { authMiddleware } from '../../middleware/auth';
import { sendSuccess } from '../../shared/utils';

const router = Router();
router.use(authMiddleware);

// GET /laporan/pendapatan
router.get('/pendapatan', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate as string) : new Date();
    end.setHours(23, 59, 59, 999); // Inklusif hingga akhir hari

    const payments = await db.query(
      `SELECT pd.jumlah, pd.tanggal, s.mode
       FROM pembayaran_detail pd
       JOIN pembayaran p ON p.id = pd.pembayaranId
       JOIN spk s ON s.id = p.spkId
       WHERE pd.tanggal >= ? AND pd.tanggal <= ?
       ORDER BY pd.tanggal ASC`, [start, end]);

    // Group by date (WIB = UTC+7)
    const grouped = payments.reduce((acc: any, p: any) => {
      const day = new Date(p.tanggal).toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
      if (!acc[day]) acc[day] = { date: day, rutin: 0, modifikasi: 0, bubut: 0, total: 0 };
      const amount = Number(p.jumlah);
      acc[day].total += amount;
      const mode = p.mode;
      if (mode === 'rutin') acc[day].rutin += amount;
      else if (mode === 'modifikasi') acc[day].modifikasi += amount;
      else if (mode === 'bubut') acc[day].bubut += amount;
      return acc;
    }, {});

    const daily = (Object.values(grouped) as any[]).sort((a, b) => a.date.localeCompare(b.date));
    const total = daily.reduce((s, d) => s + d.total, 0);
    sendSuccess(res, { daily, total });
  } catch (e) { next(e); }
});

// GET /laporan/laba-rugi — Menghitung Laba Rugi (Pendapatan - HPP - Pengeluaran)
// Support basis: cash (default) | accrual. HPP mencakup sparepart + jasa (via hargaModal).
async function computeLabaRugi(start: Date, end: Date, basis: 'cash' | 'accrual') {
  const [cashInRow, pengeluaranRow, completedSpkRow, spkItems] = await Promise.all([
    db.queryOne<any>('SELECT COALESCE(SUM(jumlah),0) AS total FROM pembayaran_detail WHERE tanggal >= ? AND tanggal <= ?', [start, end]),
    db.queryOne<any>('SELECT COALESCE(SUM(jumlah),0) AS total FROM pengeluaran WHERE tanggal >= ? AND tanggal <= ?', [start, end]),
    db.queryOne<any>("SELECT COALESCE(SUM(totalHarga),0) AS sumHarga, COALESCE(SUM(diskon),0) AS sumDiskon FROM spk WHERE status = 'selesai' AND completedAt >= ? AND completedAt <= ?", [start, end]),
    db.query("SELECT i.type, i.hargaModal, i.qty FROM spk_items i JOIN spk s ON s.id = i.spkId WHERE s.status = 'selesai' AND s.completedAt >= ? AND s.completedAt <= ?", [start, end]),
  ]);

  const totalPengeluaran = Number(pengeluaranRow?.total || 0);
  const totalPendapatan = basis === 'accrual'
    ? Number(completedSpkRow?.sumHarga || 0) - Number(completedSpkRow?.sumDiskon || 0)
    : Number(cashInRow?.total || 0);

  const hppSparepart = spkItems.filter((i: any) => i.type === 'sparepart').reduce((s: number, i: any) => s + Number(i.hargaModal) * i.qty, 0);
  const hppJasa = spkItems.filter((i: any) => i.type === 'jasa').reduce((s: number, i: any) => s + Number(i.hargaModal) * i.qty, 0);
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

router.get('/laba-rugi', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const basis: 'cash' | 'accrual' = req.query.basis === 'accrual' ? 'accrual' : 'cash';
    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate as string) : new Date();
    end.setHours(23, 59, 59, 999);

    const result = await computeLabaRugi(start, end, basis);
    sendSuccess(res, { periode: { start, end }, ...result });
  } catch (e) { next(e); }
});

// GET /laporan/mekanik — top mekanik performance (per periode, cash-basis via totalBayar)
router.get('/mekanik', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate as string) : new Date();
    end.setHours(23, 59, 59, 999);

    const [data, revenueRaw] = await Promise.all([
      db.query('SELECT m.*, (SELECT COUNT(*) FROM spk WHERE mekanikId = m.id) AS spkCount FROM mekanik m ORDER BY m.totalSpk DESC'),
      db.query("SELECT mekanikId, SUM(totalBayar) AS sumBayar, COUNT(*) AS cnt FROM spk WHERE status = 'selesai' AND completedAt >= ? AND completedAt <= ? GROUP BY mekanikId", [start, end]),
    ]);

    const revenueMap = new Map(revenueRaw.map((r: any) => [r.mekanikId, Number(r.sumBayar || 0)]));
    const selesaiMap = new Map(revenueRaw.map((r: any) => [r.mekanikId, Number(r.cnt)]));

    const enriched = data
      .map((m: any) => ({
        ...m,
        _count: { spk: m.spkCount },
        totalPendapatan: revenueMap.get(m.id) || 0,
        spkSelesai: selesaiMap.get(m.id) || 0,
      }))
      .filter((m: any) => m.spkSelesai > 0 || m.totalPendapatan > 0)
      .sort((a: any, b: any) => b.totalPendapatan - a.totalPendapatan);
    sendSuccess(res, enriched);
  } catch (e) { next(e); }
});

// GET /laporan/pelanggan — customer analytics (pelangganBaru periode-aware)
router.get('/pelanggan', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate as string) : new Date();
    end.setHours(23, 59, 59, 999);

    const [topSpenders, totalPelangganRow, pelangganBaruRow, repeatData] = await Promise.all([
      db.query('SELECT p.*, (SELECT COUNT(*) FROM spk WHERE pelangganId = p.id) AS spkCount FROM pelanggan p ORDER BY p.totalTrx DESC LIMIT 10'),
      db.queryVal<number>('SELECT COUNT(*) FROM pelanggan'),
      db.queryVal<number>('SELECT COUNT(*) FROM pelanggan WHERE createdAt >= ? AND createdAt <= ?', [start, end]),
      db.query("SELECT pelangganId, COUNT(*) AS cnt FROM spk WHERE status = 'selesai' GROUP BY pelangganId"),
    ]);
    const totalPelanggan = totalPelangganRow ?? 0;
    const pelangganBaru = pelangganBaruRow ?? 0;

    const uniquePelangganWithSpk = repeatData.length;
    const repeatPelanggan = repeatData.filter((r: any) => r.cnt > 1).length;
    const repeatRate = uniquePelangganWithSpk > 0 ? (repeatPelanggan / uniquePelangganWithSpk) * 100 : 0;

    sendSuccess(res, { topSpenders, totalPelanggan, pelangganBaru, repeatRate, repeatPelanggan, uniquePelangganWithSpk });
  } catch (e) { next(e); }
});

// GET /laporan/pengeluaran-breakdown — breakdown pengeluaran per kategori
router.get('/pengeluaran-breakdown', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate as string) : new Date();
    end.setHours(23, 59, 59, 999);

    const rows = await db.query(
      `SELECT kategoriId, SUM(jumlah) AS sumJumlah, COUNT(*) AS cnt
       FROM pengeluaran WHERE tanggal >= ? AND tanggal <= ? GROUP BY kategoriId`, [start, end]);
    const katIds = rows.map((r: any) => r.kategoriId).filter(Boolean);
    const kategoris = katIds.length ? await db.query('SELECT id, name FROM kategori_pengeluaran WHERE id IN (?)', [katIds]) : [];
    const map = new Map(kategoris.map((k: any) => [k.id, k.name]));
    const total = rows.reduce((s: number, r: any) => s + Number(r.sumJumlah || 0), 0);
    const breakdown = rows
      .map((r: any) => ({
        kategoriId: r.kategoriId,
        kategori: map.get(r.kategoriId) || 'Lainnya',
        jumlah: Number(r.sumJumlah || 0),
        count: Number(r.cnt),
        persen: total > 0 ? (Number(r.sumJumlah || 0) / total) * 100 : 0,
      }))
      .sort((a: any, b: any) => b.jumlah - a.jumlah);

    sendSuccess(res, { total, breakdown });
  } catch (e) { next(e); }
});

// GET /laporan/kpi — KPI ringkas + perbandingan periode sebelumnya
router.get('/kpi', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const basis: 'cash' | 'accrual' = req.query.basis === 'accrual' ? 'accrual' : 'cash';
    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate as string) : new Date();
    end.setHours(23, 59, 59, 999);

    // Periode sebelumnya dengan durasi sama
    const durationMs = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - durationMs);

    const [curr, prev, currSpkStats, prevSpkStats, mekanikAktif] = await Promise.all([
      computeLabaRugi(start, end, basis),
      computeLabaRugi(prevStart, prevEnd, basis),
      db.queryOne<any>("SELECT COUNT(*) AS cnt, AVG(totalHarga) AS avgHarga FROM spk WHERE status = 'selesai' AND completedAt >= ? AND completedAt <= ?", [start, end]),
      db.queryOne<any>("SELECT COUNT(*) AS cnt, AVG(totalHarga) AS avgHarga FROM spk WHERE status = 'selesai' AND completedAt >= ? AND completedAt <= ?", [prevStart, prevEnd]),
      db.queryVal<number>("SELECT COUNT(*) FROM mekanik WHERE status IN ('available','busy')"),
    ]);

    const changePct = (c: number, p: number) => (p === 0 ? (c > 0 ? 100 : 0) : ((c - p) / Math.abs(p)) * 100);
    const currCnt = Number(currSpkStats?.cnt || 0);
    const currAvg = Number(currSpkStats?.avgHarga || 0);
    const prevCnt = Number(prevSpkStats?.cnt || 0);
    const prevAvg = Number(prevSpkStats?.avgHarga || 0);

    sendSuccess(res, {
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
  } catch (e) { next(e); }
});

// GET /laporan/layanan — service statistics
router.get('/layanan', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await db.query(
      "SELECT mode, COUNT(*) AS _count, COALESCE(SUM(totalHarga),0) AS _sum FROM spk WHERE deletedAt IS NULL GROUP BY mode");
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

// GET /laporan/top-items — Top 5 Jasa & Sparepart
router.get('/top-items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate as string) : new Date();
    end.setHours(23, 59, 59, 999);

    // DB-level groupBy supaya tidak ada batasan 1000 baris
    const rows = await db.query(
      `SELECT i.type, i.nama, SUM(i.qty) AS sumQty, SUM(i.subtotal) AS sumSubtotal
       FROM spk_items i JOIN spk s ON s.id = i.spkId
       WHERE s.status = 'selesai' AND s.completedAt >= ? AND s.completedAt <= ?
       GROUP BY i.type, i.nama`, [start, end]);

    const topJasa = rows
      .filter((r: any) => r.type === 'jasa')
      .map((r: any) => ({ name: r.nama, qty: Number(r.sumQty || 0), revenue: Number(r.sumSubtotal || 0) }))
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 5);
    const topSparepart = rows
      .filter((r: any) => r.type === 'sparepart')
      .map((r: any) => ({ name: r.nama, qty: Number(r.sumQty || 0), revenue: Number(r.sumSubtotal || 0) }))
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 5);

    sendSuccess(res, { topJasa, topSparepart });
  } catch (e) { next(e); }
});

export default router;
