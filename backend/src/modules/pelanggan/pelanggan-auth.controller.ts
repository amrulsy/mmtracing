import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../../config/db';
import { env } from '../../config/env';
import { sendSuccess } from '../../shared/utils';
import { UnauthorizedError, BadRequestError } from '../../shared/errors';

export const pelangganAuthController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, phone, password } = req.body;

      if (!name || !phone || !password) {
        throw new BadRequestError('Nama, No WhatsApp, dan Password wajib diisi');
      }

      // Check existing
      const existing = await db.queryOne("SELECT id FROM pelanggan WHERE phone = ?", [phone]);
      if (existing) {
        throw new BadRequestError('Nomor WhatsApp sudah terdaftar. Silakan login.');
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const insertId = await db.insert('pelanggan', {
        name,
        phone,
        password: hashedPassword,
        type: 'kendaraan',
        role: 'customer',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      sendSuccess(res, { id: insertId }, 'Registrasi berhasil, silakan login', 201);
    } catch (error) {
      next(error);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, password } = req.body;

      if (!phone || !password) {
        throw new BadRequestError('No WhatsApp dan Password wajib diisi');
      }

      const user = await db.queryOne<{ id: number, name: string, password: string }>(
        "SELECT id, name, password FROM pelanggan WHERE phone = ?",
        [phone]
      );

      if (!user || !user.password) {
        throw new UnauthorizedError('Nomor WhatsApp atau Password salah');
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        throw new UnauthorizedError('Nomor WhatsApp atau Password salah');
      }

      const token = jwt.sign(
        { userId: user.id, isCustomer: true },
        env.jwt.secret,
        { expiresIn: env.jwt.expiresIn } as jwt.SignOptions
      );

      sendSuccess(res, {
        token,
        user: { id: user.id, name: user.name, phone }
      }, 'Login berhasil');
    } catch (error) {
      next(error);
    }
  },

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      // @ts-ignore
      const customerId = req.customerId;
      
      const user = await db.queryOne("SELECT id, name, phone, email, address, totalTrx, createdAt FROM pelanggan WHERE id = ?", [customerId]);
      if (!user) throw new UnauthorizedError('User tidak ditemukan');

      sendSuccess(res, user, 'Data pelanggan berhasil diambil');
    } catch (error) {
      next(error);
    }
  },

  async history(req: Request, res: Response, next: NextFunction) {
    try {
      // @ts-ignore
      const customerId = req.customerId;
      
      // Get SPKs (Surat Perintah Kerja)
      const spk = await db.query(
        `SELECT id, noSpk, status, progress, totalTagihan, sisaTagihan, mode, createdAt
         FROM spk 
         WHERE pelangganId = ? 
         ORDER BY createdAt DESC LIMIT 20`,
        [customerId]
      );

      // We might not have a direct link from Bookings to pelangganId yet, 
      // but let's query bookings by phone number for now.
      const user = await db.queryOne("SELECT phone FROM pelanggan WHERE id = ?", [customerId]);
      let bookings = [];
      if (user && user.phone) {
        bookings = await db.query(
          `SELECT id, jenisKendaraan, merkTipe, layanan, tanggal, jamPreferensi, status, createdAt
           FROM bookings
           WHERE whatsapp = ?
           ORDER BY createdAt DESC LIMIT 10`,
          [user.phone]
        );
      }

      sendSuccess(res, { spk, bookings }, 'Riwayat berhasil diambil');
    } catch (error) {
      next(error);
    }
  }
};
