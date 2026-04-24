import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import { sendSuccess, generateInvoiceNo } from '../../shared/utils';
import { NotFoundError } from '../../shared/errors';

const router = Router();

// PUBLIC route — no auth needed
// GET /approval/:token
router.get('/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tokenStr = String(req.params.token);
    const approvalToken = await prisma.approvalToken.findUnique({
      where: { token: tokenStr },
      include: {
        spk: {
          include: {
            pelanggan: true, kendaraan: true, mekanik: true,
            items: true, stages: { orderBy: { urutan: 'asc' } },
          },
        },
      },
    });
    if (!approvalToken) throw new NotFoundError('Token approval');
    if (new Date() > approvalToken.expiresAt) {
      res.status(410).json({ success: false, message: 'Token sudah expired' });
      return;
    }
    sendSuccess(res, approvalToken);
  } catch (e) { next(e); }
});

// POST /approval/:token — approve or reject
router.post('/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { action } = req.body; // 'approved' or 'rejected'
    const tokenStr = String(req.params.token);
    const approvalToken = await prisma.approvalToken.findUnique({ where: { token: tokenStr } });
    if (!approvalToken) throw new NotFoundError('Token approval');
    if (approvalToken.status !== 'pending') {
      res.status(400).json({ success: false, message: 'Token sudah direspon' });
      return;
    }
    if (new Date() > approvalToken.expiresAt) {
      res.status(410).json({ success: false, message: 'Token sudah expired' });
      return;
    }

    await prisma.approvalToken.update({
      where: { token: tokenStr },
      data: { status: action, respondedAt: new Date() },
    });

    // If approved, buat pembayaran HANYA jika belum ada invoice untuk SPK ini
    if (action === 'approved') {
      const spk = await prisma.spk.findUnique({ where: { id: approvalToken.spkId } });
      if (spk) {
        const existingPembayaran = await prisma.pembayaran.findFirst({ where: { spkId: spk.id } });
        if (!existingPembayaran) {
          const totalTagihan = Math.max(0, spk.totalHarga.toNumber() - spk.diskon.toNumber());
          const jatuhTempo = new Date();
          jatuhTempo.setDate(jatuhTempo.getDate() + 30);
          await prisma.pembayaran.create({
            data: {
              noInvoice: generateInvoiceNo(),
              spkId: spk.id,
              totalTagihan,
              sisaBayar: totalTagihan,
              jatuhTempo,
            },
          });
        }
      }
    }

    sendSuccess(res, null, `Estimasi berhasil ${action === 'approved' ? 'disetujui' : 'ditolak'}`);
  } catch (e) { next(e); }
});

export default router;
