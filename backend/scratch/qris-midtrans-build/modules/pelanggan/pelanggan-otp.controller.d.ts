import { Request, Response, NextFunction } from 'express';
export declare const pelangganOtpController: {
    requestOtp(req: Request, res: Response, next: NextFunction): Promise<void>;
    verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void>;
};
