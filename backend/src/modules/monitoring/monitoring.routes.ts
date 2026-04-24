import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import { authMiddleware } from '../../middleware/auth';
import { sendSuccess } from '../../shared/utils';
import { upload } from '../../middleware/upload';
import { spkService } from '../spk/spk.service';
import { AuthRequest } from '../../middleware/auth';
import { NotFoundError } from '../../shared/errors';

const router = Router();
router.use(authMiddleware);

// GET /monitoring — Kanban board data
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const spks = await prisma.spk.findMany({
      where: { status: { in: ['antri', 'dikerjakan', 'kendala', 'selesai'] } },
      orderBy: [{ prioritas: 'desc' }, { createdAt: 'asc' }],
      include: {
        pelanggan: { select: { name: true } },
        kendaraan: { select: { name: true, plat: true } },
        mekanik: { select: { id: true, name: true, initial: true, color: true } },
        stages: { orderBy: { urutan: 'asc' } },
        photos: { orderBy: { createdAt: 'desc' }, take: 3 },
      },
    });
    // Group by status for Kanban columns
    const kanban = {
      antri: spks.filter(s => s.status === 'antri'),
      dikerjakan: spks.filter(s => s.status === 'dikerjakan'),
      kendala: spks.filter(s => s.status === 'kendala'),
      selesai: spks.filter(s => s.status === 'selesai'),
    };
    sendSuccess(res, kanban);
  } catch (e) { next(e); }
});

// GET /monitoring/:id — detail
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.spk.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        pelanggan: true, kendaraan: true, mekanik: true,
        items: true, stages: { orderBy: { urutan: 'asc' } },
        photos: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!data) throw new NotFoundError('SPK');
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

// PUT /monitoring/:id/status — update status dari Kanban (via spkService agar semua business logic berjalan)
router.put('/:id/status', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await spkService.updateStatus(
      Number(req.params.id),
      { status: req.body.status, catatan: req.body.catatan, progress: req.body.progress },
      req.user?.id,
    );
    sendSuccess(res, data, 'Status berhasil diperbarui');
  } catch (e) { next(e); }
});

// POST /monitoring/:id/foto — upload progress photo
router.post('/:id/foto', upload.single('photo'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: 'File wajib diupload' });
    const photo = await prisma.spkPhoto.create({
      data: {
        spkId: Number(req.params.id),
        url: `/uploads/${file.filename}`,
        caption: req.body.caption || '',
        type: req.body.type || 'progress',
      },
    });
    sendSuccess(res, photo, 'Foto berhasil diupload');
  } catch (e) { next(e); }
});

export default router;
