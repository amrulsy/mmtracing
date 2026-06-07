import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { safeSetex, safeGet, safeDel } from '../../config/redis';
import db from '../../config/db';
import { env } from '../../config/env';
import { sendSuccess } from '../../shared/utils';
import { BadRequestError, UnauthorizedError } from '../../shared/errors';
import logger from '../../config/logger';

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

      // DEV: log OTP to terminal (disable/remove in production once WhatsApp gateway is integrated)
      logger.debug(`[WA-OTP] OTP untuk ${phoneClean}: ${otp}`);

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

      // Generate Tokens
      const token = jwt.sign(
        { userId: user.id, isCustomer: true },
        env.jwt.secret,
        { expiresIn: '7d' } as jwt.SignOptions
      );

      // We give a 7-day token for OTP logins
      sendSuccess(res, {
        token,
        user: { id: user.id, name: user.name, phone: phoneClean }
      }, 'Login berhasil');
    } catch (e) {
      next(e);
    }
  }
};
