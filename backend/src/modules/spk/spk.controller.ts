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
}

export const spkController = new SpkController();
