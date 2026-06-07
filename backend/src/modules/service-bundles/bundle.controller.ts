import { Request, Response, NextFunction } from 'express';
import { bundleService } from './bundle.service';
import { sendSuccess, sendCreated } from '../../shared/utils';
import { AuthRequest } from '../../middleware/auth';

export class BundleController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const activeOnly = req.query.active === 'true';
      const data = await bundleService.findAll(activeOnly);
      sendSuccess(res, data);
    } catch (e) { next(e); }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await bundleService.findById(String(req.params.id));
      sendSuccess(res, data);
    } catch (e) { next(e); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await bundleService.create(req.body);
      sendCreated(res, data, 'Paket servis berhasil dibuat');
    } catch (e) { next(e); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await bundleService.update(String(req.params.id), req.body);
      sendSuccess(res, data, 'Paket servis berhasil diperbarui');
    } catch (e) { next(e); }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await bundleService.delete(String(req.params.id));
      sendSuccess(res, null, 'Paket servis berhasil dihapus');
    } catch (e) { next(e); }
  }
}

export const bundleController = new BundleController();
