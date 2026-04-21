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

    const payments = await prisma.pembayaranDetail.findMany({
      where: { tanggal: { gte: start, lte: end } },
      include: { pembayaran: { include: { spk: { select: { mode: true } } } } },
      orderBy: { tanggal: 'asc' },
    });

    // Group by date
    const grouped = payments.reduce((acc: any, p) => {
      const day = p.tanggal.toISOString().split('T')[0];
      if (!acc[day]) acc[day] = { date: day, rutin: 0, modifikasi: 0, total: 0 };
      const amount = Number(p.jumlah);
      acc[day].total += amount;
      if (p.pembayaran.spk.mode === 'rutin') acc[day].rutin += amount;
      else acc[day].modifikasi += amount;
      return acc;
    }, {});

    sendSuccess(res, { daily: Object.values(grouped), total: payments.reduce((s, p) => s + Number(p.jumlah), 0) });
  } catch (e) { next(e); }
});

// GET /laporan/laba-rugi — Menghitung Laba Kotor (Pendapatan - Pengeluaran)
router.get('/laba-rugi', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate as string) : new Date();

    const [pendapatan, pengeluaran] = await Promise.all([
      prisma.pembayaranDetail.aggregate({
        where: { tanggal: { gte: start, lte: end } },
        _sum: { jumlah: true },
      }),
      prisma.pengeluaran.aggregate({
        where: { tanggal: { gte: start, lte: end } },
        _sum: { jumlah: true },
      }),
    ]);

    const totalPendapatan = Number(pendapatan._sum.jumlah || 0);
    const totalPengeluaran = Number(pengeluaran._sum.jumlah || 0);

    sendSuccess(res, {
      periode: { start, end },
      pendapatan: totalPendapatan,
      pengeluaran: totalPengeluaran,
      labaKotor: totalPendapatan - totalPengeluaran
    });
  } catch (e) { next(e); }
});

// GET /laporan/mekanik — top mekanik performance
router.get('/mekanik', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.mekanik.findMany({
      orderBy: { totalSpk: 'desc' },
      include: {
        _count: { select: { spk: true } },
        spk: { where: { status: 'selesai' }, select: { totalHarga: true } },
      },
    });
    const enriched = data.map(m => ({
      ...m,
      totalPendapatan: m.spk.reduce((s, spk) => s + Number(spk.totalHarga), 0),
    }));
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
router.get('/top-items', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.spkItem.findMany({
      where: { spk: { status: 'selesai' } },
      select: { type: true, nama: true, qty: true, subtotal: true },
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
