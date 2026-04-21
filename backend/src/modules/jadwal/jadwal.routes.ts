import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../config/database';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { sendSuccess, sendCreated } from '../../shared/utils';

const router = Router();
router.use(authMiddleware);

const createSchema = z.object({
  spkId: z.number().int().positive().optional(),
  mekanikId: z.number().int().positive().optional(),
  tanggal: z.string().transform(v => new Date(v)),
  jamMulai: z.string().min(1),
  jamSelesai: z.string().min(1),
  namaBooking: z.string().min(1),
  pekerjaan: z.string().optional(),
  kategori: z.enum(['servis', 'modifikasi', 'bubut', 'booking', 'fleet']).default('servis'),
  warna: z.string().optional(),
});

// GET /jadwal — week-based
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, mekanikId } = req.query;
    const where: any = {};
    if (startDate && endDate) {
      where.tanggal = { gte: new Date(startDate as string), lte: new Date(endDate as string) };
    }
    if (mekanikId) where.mekanikId = Number(mekanikId);
    const data = await prisma.jadwal.findMany({
      where, orderBy: { tanggal: 'asc' },
      include: { spk: { select: { noSpk: true, status: true } }, mekanik: { select: { name: true, initial: true } } },
    });
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

// POST /jadwal
router.post('/', validate(createSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.jadwal.create({ data: req.body });
    sendCreated(res, data, 'Jadwal berhasil ditambahkan');
  } catch (e) { next(e); }
});

// PUT /jadwal/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.jadwal.update({ where: { id: Number(req.params.id) }, data: req.body });
    sendSuccess(res, data, 'Jadwal berhasil diperbarui');
  } catch (e) { next(e); }
});

// DELETE /jadwal/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.jadwal.delete({ where: { id: Number(req.params.id) } });
    sendSuccess(res, null, 'Jadwal berhasil dihapus');
  } catch (e) { next(e); }
});

export default router;
