import { Request, Response, NextFunction } from 'express';
import { woService } from './wo.service';
import { woItemsService } from './wo-items.service';
import { woStagesService } from './wo-stages.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../shared/utils';
import { AuthRequest } from '../../middleware/auth';

export class WoControllerClass {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { data, total, page, limit } = await woService.findAll(req.query);
      sendPaginated(res, data, total, page, limit);
    } catch (e) { next(e); }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await woService.findById(Number(req.params.id));
      sendSuccess(res, data);
    } catch (e) { next(e); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await woService.create(req.body, req.user!.id);
      sendCreated(res, data, 'Work Order berhasil dibuat');
    } catch (e) { next(e); }
  }

  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await woService.updateStatus(Number(req.params.id), req.body, req.user?.id);
      sendSuccess(res, data, 'Status Work Order diperbarui');
    } catch (e) { next(e); }
  }

  async updateProgress(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { progress } = req.body;
      if (typeof progress !== 'number' || progress < 0 || progress > 100) {
        res.status(400).json({ success: false, message: 'Progress harus angka 0-100' });
        return;
      }
      const data = await woService.updateProgress(Number(req.params.id), progress, req.user?.id);
      sendSuccess(res, data, 'Progres Work Order diperbarui');
    } catch (e) { next(e); }
  }

  async restore(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await woService.restore(Number(req.params.id), req.user?.id);
      sendSuccess(res, null, result.message);
    } catch (e) { next(e); }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await woService.delete(Number(req.params.id), req.user?.id);
      sendSuccess(res, null, result.message);
    } catch (e) { next(e); }
  }

  // ── Item Management ──────────────────────────────────────────
  async addItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await woItemsService.addItem(Number(req.params.id), req.body, req.user?.id);
      sendSuccess(res, data, 'Item berhasil ditambahkan');
    } catch (e) { next(e); }
  }

  async removeItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await woItemsService.removeItem(
        Number(req.params.id),
        Number(req.params.itemId),
        req.user?.id
      );
      sendSuccess(res, data, 'Item berhasil dihapus');
    } catch (e) { next(e); }
  }

  async updateItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await woItemsService.updateItem(
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
      const data = await woStagesService.updateStage(
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
      const data = await woStagesService.addStage(Number(req.params.id), req.body, req.user?.id);
      sendSuccess(res, data, 'Tahapan berhasil ditambahkan');
    } catch (e) { next(e); }
  }

  // ── Edit Work Order ──────────────────────────────────────────
  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await woService.update(Number(req.params.id), req.body, req.user?.id);
      sendSuccess(res, data, 'Work Order berhasil diperbarui');
    } catch (e) { next(e); }
  }

  async assignMekanik(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await woService.assignMekanik(Number(req.params.id), req.body.mekanikId ?? null, req.user?.id);
      sendSuccess(res, data, data.mekanikId ? 'Mekanik berhasil diassign' : 'Mekanik berhasil di-unassign');
    } catch (e) { next(e); }
  }

  // ── Stats dashboard ───────────────────────────────────────────
  async stats(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await woService.stats();
      sendSuccess(res, data);
    } catch (e) { next(e); }
  }

  // ── Analytics breakdown per mode + top sparepart + performa mekanik ──
  async analytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { dateFrom, dateTo } = req.query as { dateFrom?: string; dateTo?: string };
      const data = await woService.analytics({ dateFrom, dateTo });
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
      const data = await woService.addPhoto(id, { url: `/uploads/${file.filename}`, caption, type });
      sendCreated(res, data, 'Foto berhasil diupload');
    } catch (e) { next(e); }
  }

  // ── Kirim ulang notifikasi WhatsApp invoice (WO dibuat) ──────
  async sendWhatsapp(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const kind = String(req.body?.kind || 'created'); // created | selesai | reminder-pembayaran
      const id = Number(req.params.id);
      const mod = await import('../whatsapp/whatsapp.notification');
      if (kind === 'created') await mod.notifyWoCreated(id);
      else if (kind === 'selesai') await mod.notifyWoSelesai(id);
      else if (kind === 'progress') await mod.notifyProgressUpdate(id);
      else throw new Error('Tipe notifikasi tidak dikenal');
      sendSuccess(res, null, `Notifikasi "${kind}" dikirim ulang`);
    } catch (e) { next(e); }
  }
}

export const woController = new WoControllerClass();

