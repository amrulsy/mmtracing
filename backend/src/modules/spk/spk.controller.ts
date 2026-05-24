import { Request, Response, NextFunction } from 'express';
import { spkService } from './spk.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../shared/utils';
import { AuthRequest } from '../../middleware/auth';

export class SpkController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { data, total, page, limit } = await spkService.findAll(req.query);
      sendPaginated(res, data, total, page, limit);
    } catch (e) { next(e); }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await spkService.findById(Number(req.params.id));
      sendSuccess(res, data);
    } catch (e) { next(e); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await spkService.create(req.body, req.user!.id);
      sendCreated(res, data, 'SPK berhasil dibuat');
    } catch (e) { next(e); }
  }

  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await spkService.updateStatus(Number(req.params.id), req.body, req.user?.id);
      sendSuccess(res, data, 'Status SPK diperbarui');
    } catch (e) { next(e); }
  }

  async updateProgress(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { progress } = req.body;
      if (typeof progress !== 'number' || progress < 0 || progress > 100) {
        res.status(400).json({ success: false, message: 'Progress harus angka 0-100' });
        return;
      }
      const data = await spkService.updateProgress(Number(req.params.id), progress, req.user?.id);
      sendSuccess(res, data, 'Progres SPK diperbarui');
    } catch (e) { next(e); }
  }

  async restore(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await spkService.restore(Number(req.params.id), req.user?.id);
      sendSuccess(res, null, result.message);
    } catch (e) { next(e); }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await spkService.delete(Number(req.params.id), req.user?.id);
      sendSuccess(res, null, result.message);
    } catch (e) { next(e); }
  }

  // ── Item Management ──────────────────────────────────────────
  async addItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await spkService.addItem(Number(req.params.id), req.body, req.user?.id);
      sendSuccess(res, data, 'Item berhasil ditambahkan');
    } catch (e) { next(e); }
  }

  async removeItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await spkService.removeItem(
        Number(req.params.id),
        Number(req.params.itemId),
        req.user?.id
      );
      sendSuccess(res, data, 'Item berhasil dihapus');
    } catch (e) { next(e); }
  }

  async updateItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await spkService.updateItem(
        Number(req.params.id),
        Number(req.params.itemId),
        req.body,
        req.user?.id
      );
      sendSuccess(res, data, 'Item berhasil diperbarui');
    } catch (e) { next(e); }
  }

  async updateStage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await spkService.updateStage(
        Number(req.params.id),
        Number(req.params.stageId),
        req.body,
        req.user?.id
      );
      sendSuccess(res, data, 'Tahapan berhasil diperbarui');
    } catch (e) { next(e); }
  }

  async addStage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await spkService.addStage(Number(req.params.id), req.body, req.user?.id);
      sendSuccess(res, data, 'Tahapan berhasil ditambahkan');
    } catch (e) { next(e); }
  }

  // ── Edit SPK ──────────────────────────────────────────────────
  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await spkService.update(Number(req.params.id), req.body, req.user?.id);
      sendSuccess(res, data, 'SPK berhasil diperbarui');
    } catch (e) { next(e); }
  }

  async assignMekanik(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await spkService.assignMekanik(Number(req.params.id), req.body.mekanikId ?? null, req.user?.id);
      sendSuccess(res, data, data.mekanikId ? 'Mekanik berhasil diassign' : 'Mekanik berhasil di-unassign');
    } catch (e) { next(e); }
  }

  // ── Stats dashboard ───────────────────────────────────────────
  async stats(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await spkService.stats();
      sendSuccess(res, data);
    } catch (e) { next(e); }
  }

  // ── Analytics breakdown per mode + top sparepart + performa mekanik ──
  async analytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { dateFrom, dateTo } = req.query as { dateFrom?: string; dateTo?: string };
      const data = await spkService.analytics({ dateFrom, dateTo });
      sendSuccess(res, data);
    } catch (e) { next(e); }
  }

  // ── Upload foto/gambar referensi ──────────────────────────────
  async uploadPhoto(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) {
        res.status(400).json({ success: false, message: 'File foto wajib diupload dengan field "photo"' });
        return;
      }
      const id = Number(req.params.id);
      const type = String(req.body?.type || 'lampiran');
      const caption = req.body?.caption ? String(req.body.caption) : undefined;
      const data = await spkService.addPhoto(id, { url: `/uploads/${file.filename}`, caption, type });
      sendCreated(res, data, 'Foto berhasil diupload');
    } catch (e) { next(e); }
  }

  // ── Kirim ulang notifikasi WhatsApp invoice (SPK dibuat) ──────
  async sendWhatsapp(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const kind = String(req.body?.kind || 'created'); // created | selesai | reminder-pembayaran
      const id = Number(req.params.id);
      const mod = await import('../whatsapp/whatsapp.notification');
      if (kind === 'created') await mod.notifySpkCreated(id);
      else if (kind === 'selesai') await mod.notifySpkSelesai(id);
      else if (kind === 'progress') await mod.notifyProgressUpdate(id);
      else throw new Error('Tipe notifikasi tidak dikenal');
      sendSuccess(res, null, `Notifikasi "${kind}" dikirim ulang`);
    } catch (e) { next(e); }
  }
}

export const spkController = new SpkController();
