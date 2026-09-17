import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
export declare class AuthController {
    login(req: Request, res: Response, next: NextFunction): Promise<void>;
    refreshToken(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    me(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
export declare const authController: AuthController;
