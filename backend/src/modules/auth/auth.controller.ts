import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { sendSuccess } from '../../shared/utils';
import { AuthRequest } from '../../middleware/auth';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body);
      sendSuccess(res, result, 'Login berhasil');
    } catch (e) { next(e); }
  }

  async me(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const profile = await authService.getProfile(req.user!.id);
      sendSuccess(res, profile);
    } catch (e) { next(e); }
  }

  async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await authService.changePassword(req.user!.id, req.body.oldPassword, req.body.newPassword);
      sendSuccess(res, null, 'Password berhasil diubah');
    } catch (e) { next(e); }
  }
}

export const authController = new AuthController();
