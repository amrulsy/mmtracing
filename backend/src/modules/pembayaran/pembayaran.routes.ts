import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { sendSuccess, sendPaginated } from '../../shared/utils';
import { createRateLimiter } from '../../middleware/rateLimit';
import { pembayaranService } from './pembayaran.service';

const publicReceiptLimiter = createRateLimiter({
  windowMs: 30 * 60 * 1000, 
  max: 10,
  message: 'Terlalu banyak percobaan akses. Silakan coba lagi nanti.',
});

const router = Router();

// GET /pembayaran/pub/:publicId — Public E-Kwitansi dengan PIN (Tanpa Auth)
router.get('/pub/:publicId', publicReceiptLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pin = typeof req.query.pin === 'string' ? req.query.pin : '';
    const publicId = typeof req.params.publicId === 'string' ? req.params.publicId : String(req.params.publicId);
    const data = await pembayaranService.getPublicReceipt(publicId, pin);
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

const bayarSchema = z.object({
  jumlah: z.number().positive('Jumlah harus lebih dari 0'),
  metode: z.string().min(1),
  keterangan: z.string().optional(),
});

// GET /pembayaran
router.get('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, total, page, limit } = await pembayaranService.findAll(req.query);
    sendPaginated(res, data, total, page, limit);
  } catch (e) { next(e); }
});

// GET /pembayaran/summary — ringkasan keuangan
router.get('/summary', authMiddleware, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await pembayaranService.getSummary();
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

// GET /pembayaran/:id
router.get('/:id', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const data = await pembayaranService.findById(id);
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

// POST /pembayaran/:id/bayar — Bayar (parsial / lunas)
router.post('/:id/bayar', authMiddleware, requireRole('Admin', 'Kasir'), validate(bayarSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await pembayaranService.bayar(Number(req.params.id), req.body, (req as any).user?.id);
    sendSuccess(res, data, `Pembayaran Rp ${req.body.jumlah.toLocaleString('id-ID')} berhasil dicatat.`);
  } catch (e) { next(e); }
});

// POST /pembayaran/:id/refund — Rollback lunas: reset invoice, hapus garansi & poin
router.post('/:id/refund', authMiddleware, requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await pembayaranService.refund(Number(req.params.id), (req as any).user?.id);
    sendSuccess(res, data, 'Invoice berhasil di-refund. Garansi dan poin terkait telah dihapus.');
  } catch (e) { next(e); }
});

export default router;
