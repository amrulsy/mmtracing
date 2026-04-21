import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import { authMiddleware } from '../../middleware/auth';
import { sendSuccess, sendCreated } from '../../shared/utils';
import { NotFoundError } from '../../shared/errors';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { kendaraanId } = req.query;
    const where: any = {};
    if (kendaraanId) where.kendaraanId = Number(kendaraanId);
    const data = await prisma.inspeksi.findMany({
      where, orderBy: { tanggal: 'desc' },
      include: { kendaraan: { include: { pelanggan: true } } },
    });
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.inspeksi.findUnique({
      where: { id: Number(req.params.id) },
      include: { kendaraan: { include: { pelanggan: true } } },
    });
    if (!data) throw new NotFoundError('Inspeksi');
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.inspeksi.create({ data: req.body });
    // Update kendaraan odometer
    if (req.body.odometer) {
      await prisma.kendaraan.update({ where: { id: req.body.kendaraanId }, data: { odometer: req.body.odometer } });
    }
    sendCreated(res, data, 'Inspeksi berhasil dicatat');
  } catch (e) { next(e); }
});

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    // Prevent editing locked inspeksi
    const existing = await prisma.inspeksi.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Inspeksi');
    if ((existing as any).status === 'locked' && req.body.status !== 'locked') {
      res.status(400).json({ success: false, message: 'Inspeksi ini sudah terkunci dan tidak dapat diubah.' });
      return;
    }
    const data = await prisma.inspeksi.update({
      where: { id },
      data: req.body,
      include: { kendaraan: { include: { pelanggan: true } } },
    });
    sendSuccess(res, data, 'Inspeksi berhasil diperbarui');
  } catch (e) { next(e); }
});

export default router;
