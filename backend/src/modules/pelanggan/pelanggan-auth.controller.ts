import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../../config/db';
import { env } from '../../config/env';
import { sendSuccess } from '../../shared/utils';
import { UnauthorizedError, BadRequestError, NotFoundError, ConflictError } from '../../shared/errors';

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
        { expiresIn: '15m' } as jwt.SignOptions
      );

      const refreshToken = jwt.sign(
        { userId: user.id, isCustomer: true, isRefresh: true },
        env.jwt.refreshSecret,
        { expiresIn: env.jwt.refreshExpiresIn } as jwt.SignOptions
      );

      sendSuccess(res, {
        token,
        refreshToken,
        user: { id: user.id, name: user.name, phone }
      }, 'Login berhasil');
    } catch (error) {
      next(error);
    }
  },

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) throw new BadRequestError('Refresh token wajib diisi');

      const decoded = jwt.verify(refreshToken, env.jwt.refreshSecret) as { userId: number, isCustomer?: boolean, isRefresh?: boolean };
      if (!decoded.isRefresh || !decoded.isCustomer) throw new UnauthorizedError('Token tidak valid untuk refresh');

      const user = await db.queryOne<{ id: number }>(
        'SELECT id FROM pelanggan WHERE id = ?', [decoded.userId]
      );
      if (!user) throw new UnauthorizedError('User tidak ditemukan');

      const newToken = jwt.sign(
        { userId: user.id, isCustomer: true },
        env.jwt.secret,
        { expiresIn: '15m' } as jwt.SignOptions
      );

      const newRefreshToken = jwt.sign(
        { userId: user.id, isCustomer: true, isRefresh: true },
        env.jwt.refreshSecret,
        { expiresIn: env.jwt.refreshExpiresIn } as jwt.SignOptions
      );

      sendSuccess(res, { token: newToken, refreshToken: newRefreshToken }, 'Token berhasil diperbarui');
    } catch (error) {
      next(new UnauthorizedError('Refresh token tidak valid atau sudah kedaluwarsa'));
    }
  },

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      // @ts-ignore
      const customerId = req.customerId;
      
      const user = await db.queryOne("SELECT id, name, phone, email, address, totalTrx, photoUrl, loyaltyTierId, createdAt FROM pelanggan WHERE id = ?", [customerId]);
      if (!user) throw new UnauthorizedError('User tidak ditemukan');

      // Also fetch registered vehicles
      const kendaraan = await db.query("SELECT id, name, plat, tahun, warna, noRangka, noMesin, odometer, createdAt, updatedAt FROM kendaraan WHERE pelangganId = ? AND deletedAt IS NULL", [customerId]);
      (user as any).kendaraan = kendaraan;

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
        `SELECT id, noSpk, status, progress, totalHarga, totalBayar, 
                (totalHarga - COALESCE(totalBayar,0)) AS sisaTagihan,
                (totalHarga - COALESCE(diskon,0)) AS totalTagihan,
                mode, createdAt
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
  },

  async spkDetail(req: Request, res: Response, next: NextFunction) {
    try {
      // @ts-ignore
      const customerId = req.customerId;
      const spkId = Number(req.params.id);

      // Verify ownership
      const spk = await db.queryOne<any>("SELECT * FROM spk WHERE id = ? AND pelangganId = ?", [spkId, customerId]);
      if (!spk) throw new NotFoundError('SPK tidak ditemukan atau Anda tidak memiliki akses');

      // Fetch related data
      const [kendaraan, mekanik, items, stages, photos, pembayaran] = await Promise.all([
        spk.kendaraanId ? db.queryOne("SELECT * FROM kendaraan WHERE id = ?", [spk.kendaraanId]) : null,
        spk.mekanikId ? db.queryOne("SELECT * FROM mekanik WHERE id = ?", [spk.mekanikId]) : null,
        db.query("SELECT i.*, sp.name AS spName, j.name AS jName FROM spk_items i LEFT JOIN sparepart sp ON sp.id = i.sparepartId LEFT JOIN jasa j ON j.id = i.jasaId WHERE i.spkId = ?", [spkId]),
        db.query("SELECT * FROM spk_stages WHERE spkId = ? ORDER BY urutan ASC", [spkId]),
        db.query("SELECT * FROM spk_photos WHERE spkId = ? ORDER BY createdAt DESC", [spkId]),
        db.query("SELECT * FROM pembayaran WHERE spkId = ? LIMIT 1", [spkId])
      ]);

      const enrichedItems = items.map((i: any) => ({
        ...i,
        sparepart: i.sparepartId ? { id: i.sparepartId, name: i.spName } : null,
        jasa: i.jasaId ? { id: i.jasaId, name: i.jName } : null,
      }));

      spk.kendaraan = kendaraan;
      spk.mekanik = mekanik;
      spk.items = enrichedItems;
      spk.stages = stages;
      spk.photos = photos;
      spk.pembayaran = pembayaran.length > 0 ? pembayaran[0] : null;

      sendSuccess(res, spk, 'Detail SPK berhasil diambil');
    } catch (error) {
      next(error);
    }
  },

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      // @ts-ignore
      const customerId = req.customerId;
      const { name, email, address } = req.body;

      if (!name) throw new BadRequestError('Nama wajib diisi');

      await db.update('pelanggan', { name, email, address, updatedAt: new Date() }, 'id = ?', [customerId]);

      const updatedUser = await db.queryOne("SELECT id, name, phone, email, address, totalTrx, photoUrl, loyaltyTierId, createdAt FROM pelanggan WHERE id = ?", [customerId]);
      sendSuccess(res, updatedUser, 'Profil berhasil diperbarui');
    } catch (error) {
      next(error);
    }
  },

  async uploadAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      // @ts-ignore
      const customerId = req.customerId;
      const file = req.file;

      if (!file) throw new BadRequestError('File gambar wajib diupload');

      const url = `/uploads/${file.filename}`;
      await db.update('pelanggan', { photoUrl: url, updatedAt: new Date() }, 'id = ?', [customerId]);

      sendSuccess(res, { url }, 'Foto profil berhasil diperbarui');
    } catch (error) {
      next(error);
    }
  },

  async getPembayaran(req: Request, res: Response, next: NextFunction) {
    try {
      // @ts-ignore
      const customerId = req.customerId;

      const tagihan = await db.query(`
        SELECT p.*, s.noSpk, s.status AS spkStatus
        FROM pembayaran p
        JOIN spk s ON s.id = p.spkId
        WHERE s.pelangganId = ?
        ORDER BY p.createdAt DESC
      `, [customerId]);

      const tagihanIds = tagihan.map((t: any) => t.id);
      let details = [];
      if (tagihanIds.length > 0) {
        details = await db.query(`SELECT * FROM pembayaran_detail WHERE pembayaranId IN (?) ORDER BY createdAt DESC`, [tagihanIds]);
      }

      const enrichedTagihan = tagihan.map((t: any) => ({
        ...t,
        details: details.filter((d: any) => d.pembayaranId === t.id)
      }));

      sendSuccess(res, enrichedTagihan, 'Riwayat tagihan berhasil diambil');
    } catch (error) {
      next(error);
    }
  },

  async getLoyalty(req: Request, res: Response, next: NextFunction) {
    try {
      // @ts-ignore
      const customerId = req.customerId;

      const [earnedRow, redeemedRow, currentTierRow] = await Promise.all([
        db.queryOne<{ earned: number }>("SELECT COALESCE(SUM(points),0) AS earned FROM loyalty_points WHERE pelangganId = ? AND type = 'earn'", [customerId]),
        db.queryOne<{ redeemed: number }>("SELECT COALESCE(SUM(ABS(points)),0) AS redeemed FROM loyalty_points WHERE pelangganId = ? AND type = 'redeem'", [customerId]),
        db.queryOne<{ id: number, name: string, minPoints: number }>("SELECT lt.* FROM loyalty_tiers lt JOIN pelanggan p ON p.loyaltyTierId = lt.id WHERE p.id = ?", [customerId])
      ]);

      const earned = earnedRow?.earned || 0;
      const redeemed = redeemedRow?.redeemed || 0;
      const balance = earned - redeemed;

      let nextTier = null;
      if (currentTierRow) {
        nextTier = await db.queryOne<{ name: string, minPoints: number }>("SELECT name, minPoints FROM loyalty_tiers WHERE minPoints > ? ORDER BY minPoints ASC LIMIT 1", [currentTierRow.minPoints]);
      } else {
        nextTier = await db.queryOne<{ name: string, minPoints: number }>("SELECT name, minPoints FROM loyalty_tiers ORDER BY minPoints ASC LIMIT 1");
      }

      sendSuccess(res, { balance, tier: currentTierRow, nextTier }, 'Data loyalty berhasil diambil');
    } catch (error) {
      next(error);
    }
  },

  async getLoyaltyHistory(req: Request, res: Response, next: NextFunction) {
    try {
      // @ts-ignore
      const customerId = req.customerId;
      const history = await db.query("SELECT * FROM loyalty_points WHERE pelangganId = ? ORDER BY createdAt DESC LIMIT 50", [customerId]);
      sendSuccess(res, history, 'Riwayat poin berhasil diambil');
    } catch (error) {
      next(error);
    }
  },

  async getLoyaltyRewards(req: Request, res: Response, next: NextFunction) {
    try {
      const rewards = await db.query("SELECT * FROM loyalty_rewards WHERE isActive = 1 ORDER BY pointsCost ASC");
      sendSuccess(res, rewards, 'Katalog reward berhasil diambil');
    } catch (error) {
      next(error);
    }
  },

  async redeemLoyalty(req: Request, res: Response, next: NextFunction) {
    try {
      // @ts-ignore
      const customerId = req.customerId;
      const { rewardId } = req.body;

      if (!rewardId) throw new BadRequestError('rewardId wajib diisi');

      const result = await db.transaction(async (tx) => {
        const reward = await tx.queryOne<any>('SELECT * FROM loyalty_rewards WHERE id = ? FOR UPDATE', [rewardId]);
        if (!reward || !reward.isActive) throw new Error('Reward tidak tersedia');
        if (reward.stock <= 0) throw new Error('Stok reward habis');

        const [earnedRow, redeemedRow] = await Promise.all([
          tx.queryOne<{ t: number }>("SELECT COALESCE(SUM(points),0) AS t FROM loyalty_points WHERE pelangganId = ? AND type = 'earn'", [customerId]),
          tx.queryOne<{ t: number }>("SELECT COALESCE(SUM(ABS(points)),0) AS t FROM loyalty_points WHERE pelangganId = ? AND type = 'redeem'", [customerId]),
        ]);
        const balance = (earnedRow?.t || 0) - (redeemedRow?.t || 0);
        if (balance < reward.pointsCost) throw new Error(`Poin tidak cukup (saldo: ${balance}, dibutuhkan: ${reward.pointsCost})`);

        await tx.insert('loyalty_points', {
          pelangganId: customerId, type: 'redeem', points: -reward.pointsCost,
          description: `Redeem: ${reward.name}`, refType: 'redeem', refId: rewardId,
        });
        
        const r = await tx.execute('UPDATE loyalty_rewards SET stock = stock - 1 WHERE id = ? AND stock > 0', [rewardId]);
        if (r.affectedRows === 0) throw new Error('Stok reward habis saat proses simultan');

        return balance - reward.pointsCost;
      });

      sendSuccess(res, { balance: result }, 'Poin berhasil ditukar');
    } catch (error: any) {
      if (error.message && !error.code) return res.status(400).json({ success: false, message: error.message });
      next(error);
    }
  },

  async getGaransi(req: Request, res: Response, next: NextFunction) {
    try {
      // @ts-ignore
      const customerId = req.customerId;

      const rows = await db.query(`
        SELECT g.*, s.noSpk 
        FROM garansi g
        JOIN spk s ON s.id = g.spkId
        WHERE s.pelangganId = ?
        ORDER BY g.endDate ASC
      `, [customerId]);

      const gIds = rows.map((r: any) => r.id);
      const claims = gIds.length ? await db.query('SELECT * FROM garansi_claims WHERE garansiId IN (?)', [gIds]) : [];
      const claimMap = new Map<number, any[]>();
      for (const c of claims) { 
        if (!claimMap.has(c.garansiId)) claimMap.set(c.garansiId, []); 
        claimMap.get(c.garansiId)!.push(c); 
      }

      const now = new Date();
      const enriched = rows.map((g: any) => {
        const diffMs = new Date(g.endDate).getTime() - now.getTime();
        const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        let computedStatus = g.status;
        if (daysLeft <= 0) computedStatus = 'expired';
        else if (daysLeft <= 7) computedStatus = 'hampir';
        else computedStatus = 'aktif';
        
        return {
          ...g, daysLeft, computedStatus,
          claims: claimMap.get(g.id) || [],
        };
      });

      sendSuccess(res, enriched, 'Daftar garansi berhasil diambil');
    } catch (error) {
      next(error);
    }
  },

  async claimGaransi(req: Request, res: Response, next: NextFunction) {
    try {
      // @ts-ignore
      const customerId = req.customerId;
      const { garansiId, reason } = req.body;

      if (!garansiId || !reason) throw new BadRequestError('garansiId dan alasan klaim wajib diisi');

      const garansi = await db.queryOne<any>(`
        SELECT g.* FROM garansi g
        JOIN spk s ON s.id = g.spkId
        WHERE g.id = ? AND s.pelangganId = ?
      `, [garansiId, customerId]);

      if (!garansi) throw new NotFoundError('Garansi tidak ditemukan atau Anda tidak memiliki akses');
      if (new Date(garansi.endDate) < new Date() || garansi.status === 'expired') {
        throw new BadRequestError('Masa berlaku garansi ini sudah habis dan tidak dapat diklaim.');
      }

      const claimId = await db.insert('garansi_claims', { garansiId, reason });
      const claim = await db.queryOne('SELECT * FROM garansi_claims WHERE id = ?', [claimId]);
      
      sendSuccess(res, claim, 'Klaim garansi berhasil diajukan', 201);
    } catch (error) {
      next(error);
    }
  },

  async getNotifikasi(req: Request, res: Response, next: NextFunction) {
    try {
      // @ts-ignore
      const customerId = req.customerId;
      const { page = 1, limit = 20 } = req.query;
      const limitNum = Math.min(100, Math.max(1, Number(limit)));
      const skip = (Math.max(1, Number(page)) - 1) * limitNum;

      const spkIdsRes = await db.query("SELECT id FROM spk WHERE pelangganId = ?", [customerId]);
      const spkIds = spkIdsRes.map((r: any) => r.id);

      let whereClause = "pelangganId = ?";
      let params: any[] = [customerId];

      if (spkIds.length > 0) {
        whereClause = `(pelangganId = ? OR spkId IN (?))`;
        params.push(spkIds);
      }

      const rows = await db.query(`SELECT * FROM notifikasi WHERE ${whereClause} ORDER BY createdAt DESC LIMIT ? OFFSET ?`, [...params, limitNum, skip]);
      const totalRes = await db.queryOne<{ c: number }>(`SELECT COUNT(*) AS c FROM notifikasi WHERE ${whereClause}`, params);
      const unreadRes = await db.queryOne<{ c: number }>(`SELECT COUNT(*) AS c FROM notifikasi WHERE ${whereClause} AND isRead = 0`, params);

      res.status(200).json({
        success: true,
        data: {
          notifikasi: rows,
          unreadCount: unreadRes?.c || 0,
          total: totalRes?.c || 0,
          page: Number(page),
          limit: limitNum
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async markReadAllNotifikasi(req: Request, res: Response, next: NextFunction) {
    try {
      // @ts-ignore
      const customerId = req.customerId;

      const spkIdsRes = await db.query("SELECT id FROM spk WHERE pelangganId = ?", [customerId]);
      const spkIds = spkIdsRes.map((r: any) => r.id);

      let whereClause = "pelangganId = ?";
      let params: any[] = [customerId];

      if (spkIds.length > 0) {
        whereClause = `(pelangganId = ? OR spkId IN (?))`;
        params.push(spkIds);
      }

      await db.execute(`UPDATE notifikasi SET isRead = 1 WHERE ${whereClause} AND isRead = 0`, params);
      sendSuccess(res, null, 'Semua notifikasi ditandai dibaca');
    } catch (error) {
      next(error);
    }
  },

  async submitReview(req: Request, res: Response, next: NextFunction) {
    try {
      // @ts-ignore
      const customerId = req.customerId;
      const { spkId, rating, comment, tags } = req.body;

      if (!spkId || !rating || rating < 1 || rating > 5) {
        throw new BadRequestError('SPK ID dan Rating (1-5) wajib diisi');
      }

      const spk = await db.queryOne<{ id: number, status: string }>("SELECT id, status FROM spk WHERE id = ? AND pelangganId = ?", [spkId, customerId]);
      if (!spk) throw new NotFoundError('SPK tidak ditemukan atau Anda tidak memiliki akses');
      if (spk.status !== 'selesai') throw new BadRequestError('Review hanya dapat diberikan untuk servis yang sudah selesai');

      const existing = await db.queryOne("SELECT id FROM customer_reviews WHERE spkId = ?", [spkId]);
      if (existing) throw new ConflictError('Anda sudah memberikan review untuk SPK ini');

      await db.insert('customer_reviews', {
        spkId, pelangganId: customerId, rating, comment,
        tags: tags ? JSON.stringify(tags) : null,
        isPublic: true
      });

      sendSuccess(res, null, 'Terima kasih atas ulasan Anda!', 201);
    } catch (error) {
      next(error);
    }
  },

  async checkReview(req: Request, res: Response, next: NextFunction) {
    try {
      // @ts-ignore
      const customerId = req.customerId;
      const spkId = Number(req.params.spkId);

      const review = await db.queryOne("SELECT * FROM customer_reviews WHERE spkId = ? AND pelangganId = ?", [spkId, customerId]);
      
      sendSuccess(res, review || null, 'Data review berhasil diambil');
    } catch (error) {
      next(error);
    }
  }
};
