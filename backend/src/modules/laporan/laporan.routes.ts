import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
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

    const payments = await prisma.pembayaranDetail.findMany({
      where: { tanggal: { gte: start, lte: end } },
      include: { pembayaran: { include: { spk: { select: { mode: true } } } } },
      orderBy: { tanggal: 'asc' },
    });

    // Group by date (WIB = UTC+7)
    const grouped = payments.reduce((acc: any, p) => {
      const day = p.tanggal.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' }); // 'sv-SE' gives YYYY-MM-DD format
      if (!acc[day]) acc[day] = { date: day, rutin: 0, modifikasi: 0, total: 0 };
      const amount = Number(p.jumlah);
      acc[day].total += amount;
      const mode = p.pembayaran.spk.mode;
      if (mode === 'rutin') acc[day].rutin += amount;
      else if (mode === 'modifikasi') acc[day].modifikasi += amount;
      else acc[day].bubut = (acc[day].bubut || 0) + amount;
      return acc;
    }, {});

    sendSuccess(res, { daily: Object.values(grouped), total: payments.reduce((s, p) => s + Number(p.jumlah), 0) });
  } catch (e) { next(e); }
});

// GET /laporan/laba-rugi — Menghitung Laba Rugi (Pendapatan - HPP - Pengeluaran)
router.get('/laba-rugi', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate as string) : new Date();
    end.setHours(23, 59, 59, 999); // Inklusif hingga akhir hari

    const [pendapatan, pengeluaran, spkItems] = await Promise.all([
      // Cash In: Pembayaran yang masuk
      prisma.pembayaranDetail.aggregate({
        where: { tanggal: { gte: start, lte: end } },
        _sum: { jumlah: true },
      }),
      // Cash Out: Pengeluaran operasional
      prisma.pengeluaran.aggregate({
        where: { tanggal: { gte: start, lte: end } },
        _sum: { jumlah: true },
      }),
      // HPP: Harga modal sparepart dari SPK yang telah selesai dalam rentang waktu
      prisma.spkItem.findMany({
        where: {
          spk: {
            status: 'selesai',
            completedAt: { gte: start, lte: end },
          },
          type: 'sparepart',
        },
        select: { hargaModal: true, qty: true },
      }),
    ]);

    const totalPendapatan = Number(pendapatan._sum.jumlah || 0);
    const totalPengeluaran = Number(pengeluaran._sum.jumlah || 0);
    const totalHpp = spkItems.reduce((sum, item) => sum + (Number(item.hargaModal) * item.qty), 0);

    const labaKotor = totalPendapatan - totalHpp;
    const labaBersih = labaKotor - totalPengeluaran;

    sendSuccess(res, {
      periode: { start, end },
      pendapatan: totalPendapatan,
      hpp: totalHpp,
      labaKotor: labaKotor,
      pengeluaran: totalPengeluaran,
      labaBersih: labaBersih,
    });
  } catch (e) { next(e); }
});

// GET /laporan/mekanik — top mekanik performance
router.get('/mekanik', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [data, revenueRaw, selesaiRaw] = await Promise.all([
      prisma.mekanik.findMany({
        orderBy: { totalSpk: 'desc' },
        include: { _count: { select: { spk: true } } },
      }),
      prisma.spk.groupBy({
        by: ['mekanikId'],
        where: { status: 'selesai' },
        _sum: { totalHarga: true },
      }),
      prisma.spk.groupBy({
        by: ['mekanikId'],
        where: { status: 'selesai' },
        _count: { id: true },
      }),
    ]);

    const revenueMap = new Map(revenueRaw.map(r => [r.mekanikId, Number(r._sum.totalHarga || 0)]));
    const selesaiMap = new Map(selesaiRaw.map(r => [r.mekanikId, r._count.id]));

    const enriched = data
      .map(m => ({
        ...m,
        totalPendapatan: revenueMap.get(m.id) || 0,
        spkSelesai: selesaiMap.get(m.id) || 0,
      }))
      .sort((a, b) => b.totalPendapatan - a.totalPendapatan);
    sendSuccess(res, enriched);
  } catch (e) { next(e); }
});

// GET /laporan/pelanggan — customer analytics
router.get('/pelanggan', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [topSpenders, totalPelanggan, pelangganBaru] = await Promise.all([
      prisma.pelanggan.findMany({
        orderBy: { totalTrx: 'desc' }, take: 10,
        include: { _count: { select: { spk: true } } },
      }),
      prisma.pelanggan.count(),
      prisma.pelanggan.count({
        where: { createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
      }),
    ]);
    sendSuccess(res, { topSpenders, totalPelanggan, pelangganBaru });
  } catch (e) { next(e); }
});

// GET /laporan/layanan — service statistics
router.get('/layanan', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.spk.groupBy({
      by: ['mode'],
      _count: { id: true },
      _sum: { totalHarga: true },
    });
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

    const items = await prisma.spkItem.findMany({
      where: { spk: { status: 'selesai', completedAt: { gte: start, lte: end } } },
      select: { type: true, nama: true, qty: true, subtotal: true },
      take: 1000, // Batasi untuk performa
    });

    const grouped = items.reduce((acc: any, item) => {
      const type = item.type as 'jasa' | 'sparepart';
      if (!acc[type]) acc[type] = {};
      if (!acc[type][item.nama]) acc[type][item.nama] = { name: item.nama, qty: 0, revenue: 0 };
      acc[type][item.nama].qty += item.qty;
      acc[type][item.nama].revenue += Number(item.subtotal);
      return acc;
    }, { jasa: {}, sparepart: {} });

    const topJasa = Object.values(grouped.jasa).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 5);
    const topSparepart = Object.values(grouped.sparepart).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 5);

    sendSuccess(res, { topJasa, topSparepart });
  } catch (e) { next(e); }
});

export default router;
