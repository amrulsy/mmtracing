import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from '../shared/errors';
import db from '../config/db';

export async function customerAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Token tidak ditemukan');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.jwt.secret) as { userId: number, isCustomer?: boolean };

    if (!decoded.isCustomer) {
       throw new UnauthorizedError('Akses ditolak: Hanya untuk Pelanggan');
    }

    const customer = await db.queryOne("SELECT id FROM pelanggan WHERE id = ?", [decoded.userId]);

    if (!customer) {
      throw new UnauthorizedError('Akun pelanggan tidak ditemukan');
    }

    // @ts-ignore
    req.customerId = customer.id;
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
