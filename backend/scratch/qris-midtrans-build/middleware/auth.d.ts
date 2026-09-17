import { Request, Response, NextFunction } from 'express';
export interface AuthRequest extends Request {
    user?: {
        id: number;
        name: string;
        username: string;
        email: string | null;
        roleId: number;
        roleName: string;
        permissions: Record<string, string>;
    };
}
export declare function authMiddleware(req: AuthRequest, _res: Response, next: NextFunction): Promise<void>;
/**
 * @deprecated Use requirePermission() instead. Kept only for backward compatibility.
 */
export declare function requireRole(...roles: string[]): (req: AuthRequest, _res: Response, next: NextFunction) => void;
export declare function requirePermission(moduleName: string, minLevel?: 'view' | 'edit' | 'full'): (req: AuthRequest, _res: Response, next: NextFunction) => void;
