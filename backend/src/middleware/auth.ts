import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from '../shared/errors';
import db from '../config/db';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    name: string;
    username: string;
    email: string | null;
    roleId: number;
    roleName: string;
    permissions: string[];
  };
}

export async function authMiddleware(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Token tidak ditemukan');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.jwt.secret) as { userId: number };

    const user = await db.queryOne<{
      id: number; name: string; username: string; email: string | null;
      roleId: number; status: string; roleName: string; permissions: any;
    }>(
      `SELECT u.id, u.name, u.username, u.email, u.roleId, u.status,
              r.name AS roleName, r.permissions
       FROM users u
       JOIN roles r ON r.id = u.roleId
       WHERE u.id = ?`,
      [decoded.userId],
    );

    if (!user || user.status !== 'aktif') {
      throw new UnauthorizedError('User tidak aktif atau tidak ditemukan');
    }

    let perms: string[] = [];
    if (user.permissions) {
      const raw = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
      if (Array.isArray(raw)) perms = raw;
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

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    if (!roles.includes(req.user.roleName)) {
      return next(new UnauthorizedError('Tidak memiliki akses untuk role ini'));
    }
    next();
  };
}

export function requirePermission(permission: string) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    // Owner / Admin bypass
    if (req.user.roleName === 'Admin') {
      return next();
    }
    if (req.user.permissions && req.user.permissions.includes(permission)) {
      return next();
    }
    return next(new UnauthorizedError(`Akses ditolak: Membutuhkan izin '${permission}'`));
  };
}
