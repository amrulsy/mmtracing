import { Request, Response, NextFunction } from 'express';
export interface CustomerAuthRequest extends Request {
    customerId?: number;
}
export declare function customerAuthMiddleware(req: CustomerAuthRequest, _res: Response, next: NextFunction): Promise<void>;
