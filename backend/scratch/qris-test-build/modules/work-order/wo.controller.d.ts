import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
export declare class WoControllerClass {
    findAll(req: Request, res: Response, next: NextFunction): Promise<void>;
    findById(req: Request, res: Response, next: NextFunction): Promise<void>;
    create(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateProgress(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    restore(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    addItem(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    removeItem(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateItem(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateStage(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    addStage(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    update(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    assignMekanik(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    stats(_req: Request, res: Response, next: NextFunction): Promise<void>;
    analytics(req: Request, res: Response, next: NextFunction): Promise<void>;
    uploadPhoto(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    sendWhatsapp(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
export declare const woController: WoControllerClass;
