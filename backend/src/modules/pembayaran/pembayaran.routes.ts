import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../config/database';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { sendSuccess, sendCreated, sendPaginated, parsePagination, generateInvoiceNo } from '../../shared/utils';
import { sseManager } from '../../shared/sse';
import { releaseGatePass } from '../../shared/gate-pass';
import { NotFoundError } from '../../shared/errors';

const router = Router();
router.use(authMiddleware);

const bayarSchema = z.object({
  jumlah: z.number().positive('Jumlah harus lebih dari 0'),
  metode: z.string().min(1),
  keterangan: z.string().optional(),
});

// GET /pembayaran
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { status, search } = req.query;
    const where: any = {};
    if (status && status !== 'semua') where.status = status;
    if (search) {
      where.OR = [
        { noInvoice: { contains: search as string } },
        { spk: { noSpk: { contains: search as string } } },
        { spk: { pelanggan: { name: { contains: search as string } } } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.pembayaran.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: {
          spk: { include: { pelanggan: true, kendaraan: true, items: true, stages: true } },
          detail: { orderBy: { tanggal: 'desc' } },
        },
      }),
      prisma.pembayaran.count({ where }),
    ]);
    sendPaginated(res, data, total, page, limit);
  } catch (e) { next(e); }
});

// GET /pembayaran/summary — ringkasan keuangan
router.get('/summary', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [menunggu, hariIni, totalBulan] = await Promise.all([
      prisma.pembayaran.aggregate({ where: { status: { not: 'lunas' } }, _sum: { sisaBayar: true }, _count: true }),
      prisma.pembayaranDetail.aggregate({
        where: { tanggal: { gte: today } },
        _sum: { jumlah: true }, _count: true,
      }),
      prisma.pembayaranDetail.aggregate({
        where: { tanggal: { gte: new Date(today.getFullYear(), today.getMonth(), 1) } },
        _sum: { jumlah: true },
      }),
    ]);
    sendSuccess(res, {
      menunggu: { total: menunggu._sum.sisaBayar || 0, count: menunggu._count },
      hariIni: { total: hariIni._sum.jumlah || 0, count: hariIni._count },
      bulanIni: totalBulan._sum.jumlah || 0,
    });
  } catch (e) { next(e); }
});

// GET /pembayaran/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.pembayaran.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        spk: { include: { pelanggan: true, kendaraan: true, items: true, stages: { orderBy: { urutan: 'asc' } } } },
        detail: { orderBy: { tanggal: 'desc' } },
      },
    });
    if (!data) throw new NotFoundError('Pembayaran');
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

// POST /pembayaran/:id/bayar — Bayar (parsial / lunas)
router.post('/:id/bayar', validate(bayarSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pembayaran = await prisma.pembayaran.findUnique({ where: { id: Number(req.params.id) }, include: { spk: true } });
    if (!pembayaran) throw new NotFoundError('Pembayaran');

    const jumlah = Number(req.body.jumlah);
    const newTotalBayar = pembayaran.totalBayar.toNumber() + jumlah;
    const newSisa = pembayaran.totalTagihan.toNumber() - newTotalBayar;
    const newStatus = newSisa <= 0 ? 'lunas' : 'parsial';

    const updated = await prisma.$transaction(async (tx) => {
      await tx.pembayaranDetail.create({
        data: {
          pembayaranId: pembayaran.id,
          jumlah: jumlah,
          metode: req.body.metode,
          keterangan: req.body.keterangan,
        },
      });

      const updatedPay = await tx.pembayaran.update({
        where: { id: pembayaran.id },
        data: {
          totalBayar: newTotalBayar,
          sisaBayar: Math.max(0, newSisa),
          status: newStatus,
        },
        include: { spk: true, detail: true },
      });

      await tx.spk.update({
        where: { id: pembayaran.spkId },
        data: { totalBayar: { increment: jumlah } },
      });

      await tx.pelanggan.update({
        where: { id: pembayaran.spk.pelangganId },
        data: { totalTrx: { increment: jumlah } },
      });

      // Gate-Pass Delivery: Terbitkan Garansi & Loyalty Point saat Lunas (Hanya jika SPK sudah 'selesai')
      if (newStatus === 'lunas' && pembayaran.status !== 'lunas') {
        const spkId = pembayaran.spkId;
        const spk = await tx.spk.findUnique({ where: { id: spkId } });
        
        if (spk && spk.status === 'selesai') {
          await releaseGatePass(tx, spkId);
        }
      }

      return updatedPay;
    });

    // Broadcast SSE event
    const sseEvent = updated.status === 'lunas' ? 'pembayaran:lunas' : 'pembayaran:bayar';
    sseManager.broadcast(sseEvent as any, { pembayaranId: updated.id, noInvoice: updated.noInvoice, status: updated.status });

    sendSuccess(res, updated, `Pembayaran Rp ${jumlah.toLocaleString('id-ID')} berhasil dicatat.`);
  } catch (e) { next(e); }
});

// POST /pembayaran/:id/refund — Rollback lunas: reset invoice, hapus garansi & poin (GAP-4)
router.post('/:id/refund', requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pembayaran = await prisma.pembayaran.findUnique({
      where: { id: Number(req.params.id) },
      include: { spk: true },
    });
    if (!pembayaran) throw new NotFoundError('Pembayaran');
    if (pembayaran.status !== 'lunas') {
      throw new Error('Hanya invoice berstatus lunas yang dapat di-refund');
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Hapus semua detail pembayaran
      await tx.pembayaranDetail.deleteMany({ where: { pembayaranId: pembayaran.id } });

      // 2. Reset invoice ke belum_bayar
      const resetPay = await tx.pembayaran.update({
        where: { id: pembayaran.id },
        data: {
          totalBayar: 0,
          sisaBayar: pembayaran.totalTagihan,
          status: 'belum_bayar',
        },
      });

      // 3. Reset totalBayar di SPK
      await tx.spk.update({
        where: { id: pembayaran.spkId },
        data: { totalBayar: 0 },
      });

      // 4. Reset totalTrx pelanggan (cegah nilai negatif)
      const pelanggan = await tx.pelanggan.findUnique({ where: { id: pembayaran.spk.pelangganId } });
      if (pelanggan) {
        const currentTrx = Number(pelanggan.totalTrx);
        const refundAmount = pembayaran.totalBayar.toNumber();
        await tx.pelanggan.update({
          where: { id: pelanggan.id },
          data: { totalTrx: Math.max(0, currentTrx - refundAmount) },
        });
      }

      // 5. Hapus garansi terkait SPK ini
      await tx.garansi.deleteMany({ where: { spkId: pembayaran.spkId } });

      // 6. Hapus loyalty points terkait SPK ini (hanya tipe 'earn')
      await tx.loyaltyPoint.deleteMany({
        where: { refType: 'transaksi', refId: pembayaran.spkId, type: 'earn' },
      });

      // 7. Activity log
      await tx.activityLog.create({
        data: {
          action: 'refund',
          module: 'pembayaran',
          targetId: pembayaran.id,
          targetName: pembayaran.noInvoice,
          detail: JSON.stringify({ spkId: pembayaran.spkId, jumlahRefund: pembayaran.totalBayar }),
        },
      });

      return resetPay;
    });

    sendSuccess(res, result, 'Invoice berhasil di-refund. Garansi dan poin terkait telah dihapus.');
  } catch (e) { next(e); }
});

export default router;
