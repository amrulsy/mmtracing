import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from '../shared/errors';
import db from '../config/db';
import { appCache, CACHE_TTL } from '../shared/cache';
import { PERMISSION_LEVELS } from '../shared/permissions';

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

export async function authMiddleware(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Token tidak ditemukan');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.jwt.secret) as { userId: number; isCustomer?: boolean };

    if (decoded.isCustomer) {
      throw new UnauthorizedError('Token pelanggan tidak dapat digunakan untuk akses staf');
    }

    const user = await appCache.getOrSet(`auth_user_${decoded.userId}`, async () => {
      return await db.queryOne<{
        id: number; name: string; username: string; email: string | null;
        roleId: number; status: string; roleName: string; permissions: any;
        isProtected: number;
      }>(
        `SELECT u.id, u.name, u.username, u.email, u.roleId, u.status,
                r.name AS roleName, r.permissions, r.isProtected
         FROM users u
         JOIN roles r ON r.id = u.roleId
         WHERE u.id = ?`,
        [decoded.userId],
      );
    }, CACHE_TTL.LONG);

    if (!user || user.status !== 'aktif') {
      throw new UnauthorizedError('User tidak aktif atau tidak ditemukan');
    }

    let perms: Record<string, string> = {};
    if (user.permissions) {
      try {
        const raw = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
        if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
          perms = raw;
        }
      } catch (e) {
        // Fallback to empty object if JSON parsing fails
      }
    }

    req.user = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      roleId: user.roleId,
      roleName: user.roleName,
      permissions: perms,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Token tidak valid'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token sudah expired'));
    } else {
      next(error);
    }
  }
}

/**
 * @deprecated Use requirePermission() instead. Kept only for backward compatibility.
 */
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    // Admin bypass as superuser
    if (req.user.roleName === 'Admin') {
      return next();
    }
    if (!roles.includes(req.user.roleName)) {
      return next(new UnauthorizedError('Tidak memiliki akses untuk role ini'));
    }
    next();
  };
}

export function requirePermission(moduleName: string, minLevel: 'view' | 'edit' | 'full' = 'view') {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    // Admin bypass — role named "Admin" always has full access
    if (req.user.roleName === 'Admin') {
      return next();
    }
    
    const userLevelStr = req.user.permissions?.[moduleName] || 'none';
    const userLevel = PERMISSION_LEVELS[userLevelStr as keyof typeof PERMISSION_LEVELS] || 0;
    const requiredLevel = PERMISSION_LEVELS[minLevel] || 0;

    if (userLevel >= requiredLevel) {
      return next();
    }
    
    return next(new UnauthorizedError(`Akses ditolak: Membutuhkan izin '${minLevel}' pada modul '${moduleName}'`));
  };
}
