import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import { authMiddleware } from '../../middleware/auth';
import { sendSuccess } from '../../shared/utils';

const router = Router();
router.use(authMiddleware);

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      spkAntri, spkDikerjakan, spkSelesaiHariIni, spkKendala,
      pendapatanHariIni, pendapatanBulan,
      mekanikAktif,
      stokMenipis, stokHabis,
      pelangganBaru,
      recentSpk, recentActivity,
      spkDistribution,
      pengeluaranHariIni, pengeluaranBulan,
    ] = await Promise.all([
      prisma.spk.count({ where: { status: 'antri' } }),
      prisma.spk.count({ where: { status: 'dikerjakan' } }),
      prisma.spk.count({ where: { status: 'selesai', completedAt: { gte: today } } }),
      prisma.spk.count({ where: { status: 'kendala' } }),

      prisma.pembayaranDetail.aggregate({ where: { tanggal: { gte: today } }, _sum: { jumlah: true } }),
      prisma.pembayaranDetail.aggregate({ where: { tanggal: { gte: thisMonth } }, _sum: { jumlah: true } }),

      prisma.mekanik.findMany({
        where: { status: { not: 'off' } },
        include: { spk: { where: { status: 'dikerjakan' }, select: { noSpk: true } } },
      }),

      prisma.$queryRaw`SELECT COUNT(*) as count FROM sparepart WHERE stok > 0 AND stok <= stokMinimum` as any,
      prisma.sparepart.count({ where: { stok: 0 } }),

      prisma.pelanggan.count({ where: { createdAt: { gte: thisMonth } } }),

      prisma.spk.findMany({
        orderBy: { createdAt: 'desc' }, take: 5,
        include: { pelanggan: true, kendaraan: true, mekanik: true },
      }),
      prisma.activityLog.findMany({
        orderBy: { createdAt: 'desc' }, take: 10,
        include: { user: { select: { name: true } } },
      }),
      prisma.spk.groupBy({
        by: ['mode'],
        where: { status: { notIn: ['selesai', 'dibatalkan'] } },
        _count: true,
      }),

      prisma.pengeluaran.aggregate({ where: { tanggal: { gte: today } }, _sum: { jumlah: true } }),
      prisma.pengeluaran.aggregate({ where: { tanggal: { gte: thisMonth } }, _sum: { jumlah: true } }),
    ]);

    // Format distribution to { mode: count } map
    const distributionMap = spkDistribution.reduce((acc: any, curr) => {
      acc[curr.mode] = curr._count;
      return acc;
    }, { rutin: 0, modifikasi: 0, bubut: 0 });

    sendSuccess(res, {
      kpi: {
        spkAntri, spkDikerjakan, spkSelesaiHariIni, spkKendala,
        pendapatanHariIni: Number(pendapatanHariIni._sum.jumlah || 0),
        pendapatanBulan: Number(pendapatanBulan._sum.jumlah || 0),
        pengeluaranHariIni: Number(pengeluaranHariIni._sum.jumlah || 0),
        pengeluaranBulan: Number(pengeluaranBulan._sum.jumlah || 0),
        stokMenipis: Number(stokMenipis[0]?.count || 0),
        stokHabis,
        pelangganBaru,
      },
      mekanikAktif,
      recentSpk,
      recentActivity,
      distribution: distributionMap,
    });
  } catch (e) { next(e); }
});

export default router;
