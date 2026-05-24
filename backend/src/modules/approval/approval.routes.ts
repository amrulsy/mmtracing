import { Router, Request, Response, NextFunction } from 'express';
import db from '../../config/db';
import { sendSuccess, generateInvoiceNo } from '../../shared/utils';
import { NotFoundError } from '../../shared/errors';

const router = Router();

// PUBLIC route — no auth needed
// GET /approval/:token
router.get('/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tokenStr = String(req.params.token);
    const approvalToken = await db.queryOne<any>('SELECT * FROM approval_tokens WHERE token = ?', [tokenStr]);
    if (!approvalToken) throw new NotFoundError('Token approval');
    const spk = await db.queryOne<any>('SELECT * FROM spk WHERE id = ?', [approvalToken.spkId]);
    if (spk) {
      const [pelanggan, kendaraan, mekanik, items, stages] = await Promise.all([
        db.queryOne('SELECT * FROM pelanggan WHERE id = ?', [spk.pelangganId]),
        spk.kendaraanId ? db.queryOne('SELECT * FROM kendaraan WHERE id = ?', [spk.kendaraanId]) : null,
        spk.mekanikId ? db.queryOne('SELECT * FROM mekanik WHERE id = ?', [spk.mekanikId]) : null,
        db.query('SELECT * FROM spk_items WHERE spkId = ?', [spk.id]),
        db.query('SELECT * FROM spk_stages WHERE spkId = ? ORDER BY urutan ASC', [spk.id]),
      ]);
      spk.pelanggan = pelanggan; spk.kendaraan = kendaraan; spk.mekanik = mekanik;
      spk.items = items; spk.stages = stages;
    }
    approvalToken.spk = spk;
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
    const approvalToken = await db.queryOne<any>('SELECT * FROM approval_tokens WHERE token = ?', [tokenStr]);
    if (!approvalToken) throw new NotFoundError('Token approval');
    if (approvalToken.status !== 'pending') {
      res.status(400).json({ success: false, message: 'Token sudah direspon' });
      return;
    }
    if (new Date() > approvalToken.expiresAt) {
      res.status(410).json({ success: false, message: 'Token sudah expired' });
      return;
    }

    await db.update('approval_tokens', { status: action, respondedAt: new Date() }, 'token = ?', [tokenStr]);

    // If approved, buat pembayaran HANYA jika belum ada invoice untuk SPK ini
    if (action === 'approved') {
      const spk = await db.queryOne<any>('SELECT * FROM spk WHERE id = ?', [approvalToken.spkId]);
      if (spk) {
        const existingPembayaran = await db.queryOne('SELECT id FROM pembayaran WHERE spkId = ? LIMIT 1', [spk.id]);
        if (!existingPembayaran) {
          const totalTagihan = Math.max(0, Number(spk.totalHarga) - Number(spk.diskon));
          const jatuhTempo = new Date();
          jatuhTempo.setDate(jatuhTempo.getDate() + 30);
          await db.insert('pembayaran', {
            noInvoice: generateInvoiceNo(),
            spkId: spk.id,
            totalTagihan,
            sisaBayar: totalTagihan,
            jatuhTempo,
          });
        }
      }
    }

    sendSuccess(res, null, `Estimasi berhasil ${action === 'approved' ? 'disetujui' : 'ditolak'}`);
  } catch (e) { next(e); }
});

export default router;
