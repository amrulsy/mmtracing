import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { safeSetex, safeGet, safeDel } from '../../config/redis';
import db from '../../config/db';
import { env } from '../../config/env';
import { sendSuccess } from '../../shared/utils';
import { BadRequestError, UnauthorizedError } from '../../shared/errors';
import logger from '../../config/logger';
import { sendOtp } from '../whatsapp/whatsapp.notification';

const REFRESH_COOKIE = 'mmt_customer_refresh';

function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'lax',
    path: '/api/v1/customer-auth',
    // The JWT remains the source of truth; this only instructs the browser when to drop it.
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export const pelangganOtpController = {
  async requestOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone } = req.body;
      if (!phone) throw new BadRequestError('Nomor WhatsApp wajib diisi');

      const phoneClean = String(phone).replace(/[^0-9]/g, '');
      if (!/^(08|628)[0-9]{8,12}$/.test(phoneClean)) {
        throw new BadRequestError('Format WhatsApp tidak valid. Gunakan 08xx atau 628xx.');
      }

      // Generate 6-digit OTP
      const otp = crypto.randomInt(100000, 999999).toString();
      
      // Store in Redis or Memory (Valid for 5 minutes)
      await safeSetex(`OTP:${phoneClean}`, 300, otp);

      // Send via WhatsApp Queue
      await sendOtp(phoneClean, otp);

      sendSuccess(res, null, 'Kode OTP telah dikirim ke WhatsApp Anda. Berlaku 5 menit.');
    } catch (e) {
      next(e);
    }
  },

  async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, otp } = req.body;
      if (!phone || !otp) throw new BadRequestError('Nomor WhatsApp dan Kode OTP wajib diisi');

      const phoneClean = String(phone).replace(/[^0-9]/g, '');
      const storedOtp = await safeGet(`OTP:${phoneClean}`);

      if (!storedOtp || storedOtp !== otp) {
        throw new UnauthorizedError('Kode OTP salah atau sudah kadaluarsa');
      }

      // Valid! Delete OTP to prevent reuse
      await safeDel(`OTP:${phoneClean}`);

      // Check if user exists, if not auto-register them
      let user = await db.queryOne<{ id: number, name: string }>("SELECT id, name FROM pelanggan WHERE phone = ?", [phoneClean]);
      
      if (!user) {
        // Auto register
        const insertId = await db.insert('pelanggan', {
          name: `Pelanggan-${phoneClean.slice(-4)}`,
          phone: phoneClean,
          password: '', // Passwordless
          type: 'kendaraan',
          role: 'customer',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        user = { id: insertId, name: `Pelanggan-${phoneClean.slice(-4)}` };
      }

      // Generate Tokens (same as password login)
      const token = jwt.sign(
        { userId: user.id, isCustomer: true },
        env.jwt.secret,
        { expiresIn: '15m' } as jwt.SignOptions
      );

      const refreshToken = jwt.sign(
        { userId: user.id, isCustomer: true, isRefresh: true },
        env.jwt.refreshSecret,
        { expiresIn: env.jwt.refreshExpiresIn } as jwt.SignOptions
      );

      setRefreshCookie(res, refreshToken);

      sendSuccess(res, {
        token,
        user: { id: user.id, name: user.name, phone: phoneClean }
      }, 'Login berhasil');
    } catch (e) {
      next(e);
    }
  }
};
