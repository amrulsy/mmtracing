import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../../config/db';
import { ensureNotificationSchema } from '../whatsapp/whatsapp.notification';
import { ensureVoucherSchema, issueVoucher } from '../loyalty/voucher.service';
import { env } from '../../config/env';
import { sendSuccess } from '../../shared/utils';
import { UnauthorizedError, BadRequestError, NotFoundError, ConflictError } from '../../shared/errors';
import { ensureEstimateApprovalSchema } from '../work-order/estimate-approval';
import type { CustomerAuthRequest } from '../../middleware/customerAuth';
import { notifyBookingRescheduled, notifyBookingStatus, notifyEstimateApprovalResponse } from '../whatsapp/whatsapp.notification';

const REFRESH_COOKIE = 'mmt_customer_refresh';

function readCookie(req: Request, name: string): string | undefined {
  return req.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'lax',
    path: '/api/v1/customer-auth',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export const pelangganAuthController = {
  async logout(_req: Request, res: Response) {
    res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/customer-auth' });
    sendSuccess(res, null, 'Sesi berhasil diakhiri');
  },

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

      setRefreshCookie(res, refreshToken);

      sendSuccess(res, {
        token,
        user: { id: user.id, name: user.name, phone }
      }, 'Login berhasil');
    } catch (error) {
      next(error);
    }
  },

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.body?.refreshToken || readCookie(req, REFRESH_COOKIE);
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

      setRefreshCookie(res, newRefreshToken);

      sendSuccess(res, { token: newToken }, 'Token berhasil diperbarui');
    } catch (error) {
      next(new UnauthorizedError('Refresh token tidak valid atau sudah kedaluwarsa'));
    }
  },

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      // @ts-ignore
      const customerId = req.customerId;
      
      const user = await db.queryOne("SELECT id, name, phone, email, address, totalTrx, photoUrl AS avatar, loyaltyTierId, createdAt FROM pelanggan WHERE id = ?", [customerId]);
      if (!user) throw new UnauthorizedError('User tidak ditemukan');

      // Also fetch registered vehicles
      const kendaraan = await db.query("SELECT id, name, plat, tahun, warna, noRangka, noMesin, odometer, createdAt, updatedAt FROM kendaraan WHERE pelangganId = ? AND deletedAt IS NULL", [customerId]);
      (user as any).kendaraan = kendaraan;

      sendSuccess(res, user, 'Data pelanggan berhasil diambil');
    } catch (error) {
      next(error);
    }
  },

  async dashboard(req: Request, res: Response, next: NextFunction) {
    try {
      // @ts-ignore
      const customerId = req.customerId;
      const user = await db.queryOne<any>('SELECT id, name, phone, email, address, totalTrx, photoUrl AS avatar, loyaltyTierId, createdAt FROM pelanggan WHERE id = ?', [customerId]);
      if (!user) throw new UnauthorizedError('User tidak ditemukan');
      const [spks, bookings] = await Promise.all([
        db.query('SELECT id, noWo, status, progress, totalHarga, totalBayar, (totalHarga - COALESCE(totalBayar,0)) AS sisaTagihan, (totalHarga - COALESCE(diskon,0)) AS totalTagihan, mode, createdAt FROM work_orders WHERE pelangganId = ? ORDER BY createdAt DESC LIMIT 20', [customerId]),
        db.query('SELECT b.id, b.jenisKendaraan, b.merkTipe, b.layanan, b.tanggal, b.jamPreferensi, b.status, b.createdAt FROM bookings b JOIN pelanggan p ON p.phone = b.whatsapp WHERE p.id = ? ORDER BY b.createdAt DESC LIMIT 10', [customerId]),
      ]);
      user.kendaraan = await db.query('SELECT id, name, plat, tahun, warna, createdAt, updatedAt FROM kendaraan WHERE pelangganId = ? AND deletedAt IS NULL', [customerId]);
      sendSuccess(res, { profile: user, spks, activeWo: spks, bookings, unreadCount: 0 }, 'Dashboard pelanggan berhasil diambil');
    } catch (error) { next(error); }
  },

  async history(req: Request, res: Response, next: NextFunction) {
    try {
      // @ts-ignore
      const customerId = req.customerId;
      
      // Get SPKs (Surat Perintah Kerja)
      const spk = await db.query(
        `SELECT id, noWo, status, progress, totalHarga, totalBayar, 
                (totalHarga - COALESCE(totalBayar,0)) AS sisaTagihan,
                (totalHarga - COALESCE(diskon,0)) AS totalTagihan,
                mode, createdAt
         FROM work_orders 
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

      sendSuccess(res, { spk, activeWo: spk, workOrder: spk, bookings }, 'Riwayat berhasil diambil');
    } catch (error) {
      next(error);
    }
  },

  async bookings(req: Request, res: Response, next: NextFunction) {
    try {
      const customerId = (req as CustomerAuthRequest).customerId!;
      const customer = await db.queryOne<{ phone: string }>('SELECT phone FROM pelanggan WHERE id = ?', [customerId]);
      if (!customer) throw new UnauthorizedError('Akun pelanggan tidak ditemukan');
      const phone = customer.phone.replace(/[^0-9]/g, '');
      const variants = [phone, phone.replace(/^62/, '0'), phone.replace(/^0/, '62')];
      const rows = await db.query(`SELECT id, jenisKendaraan, merkTipe, layanan, tanggal, jamPreferensi, status, catatan, alasanPenolakan, woId, createdAt, updatedAt
        FROM bookings WHERE pelangganId = ? OR whatsapp IN (?, ?, ?) ORDER BY createdAt DESC LIMIT 50`, [customerId, ...variants]);
      sendSuccess(res, rows, 'Booking berhasil diambil');
    } catch (error) { next(error); }
  },

  async cancelBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const customerId = (req as CustomerAuthRequest).customerId!;
      const id = Number(req.params.id);
      const customer = await db.queryOne<{ phone: string }>('SELECT phone FROM pelanggan WHERE id = ?', [customerId]);
      const phone = customer?.phone.replace(/[^0-9]/g, '') || '';
      const booking = await db.queryOne<any>('SELECT * FROM bookings WHERE id = ? AND (pelangganId = ? OR whatsapp IN (?, ?, ?))', [id, customerId, phone, phone.replace(/^62/, '0'), phone.replace(/^0/, '62')]);
      if (!booking) throw new NotFoundError('Booking tidak ditemukan atau Anda tidak memiliki akses');
      if (!['baru', 'dikonfirmasi'].includes(booking.status)) throw new BadRequestError('Booking ini tidak dapat dibatalkan');
      await db.transaction(async (tx) => {
        await tx.update('bookings', { pelangganId: customerId, status: 'dibatalkan', updatedAt: new Date() }, 'id = ?', [id]);
        await tx.execute('DELETE FROM jadwal WHERE pekerjaan = ?', [`Booking #${id}`]);
      });
      notifyBookingStatus(id, 'dibatalkan').catch(() => {});
      sendSuccess(res, null, 'Booking berhasil dibatalkan');
    } catch (error) { next(error); }
  },

  async rescheduleBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const customerId = (req as CustomerAuthRequest).customerId!;
      const id = Number(req.params.id);
      const { tanggal, jamPreferensi } = req.body as { tanggal?: string; jamPreferensi?: string };
      if (!tanggal || !jamPreferensi || Number.isNaN(new Date(tanggal).getTime())) throw new BadRequestError('Tanggal dan jam baru wajib valid');
      const target = new Date(tanggal); target.setHours(0, 0, 0, 0);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (target <= today) throw new BadRequestError('Jadwal baru harus minimal besok');
      const customer = await db.queryOne<{ phone: string }>('SELECT phone FROM pelanggan WHERE id = ?', [customerId]);
      const phone = customer?.phone.replace(/[^0-9]/g, '') || '';
      const booking = await db.queryOne<any>('SELECT * FROM bookings WHERE id = ? AND (pelangganId = ? OR whatsapp IN (?, ?, ?))', [id, customerId, phone, phone.replace(/^62/, '0'), phone.replace(/^0/, '62')]);
      if (!booking) throw new NotFoundError('Booking tidak ditemukan atau Anda tidak memiliki akses');
      if (!['baru', 'dikonfirmasi'].includes(booking.status)) throw new BadRequestError('Booking ini tidak dapat dijadwalkan ulang');
      const occupied = await db.queryVal<number>("SELECT COUNT(*) FROM bookings WHERE id <> ? AND DATE(tanggal) = DATE(?) AND jamPreferensi = ? AND status IN ('baru', 'dikonfirmasi')", [id, tanggal, jamPreferensi]);
      if ((occupied || 0) > 0) throw new BadRequestError('Slot waktu tersebut sudah terisi. Pilih jam lain.');
      await db.transaction(async (tx) => {
        await tx.update('bookings', { pelangganId: customerId, tanggal: target, jamPreferensi, updatedAt: new Date() }, 'id = ?', [id]);
        if (booking.status === 'dikonfirmasi') await tx.update('jadwal', { tanggal: target, jamMulai: jamPreferensi, updatedAt: new Date() }, 'pekerjaan = ?', [`Booking #${id}`]);
      });
      notifyBookingRescheduled(id).catch(() => {});
      sendSuccess(res, null, 'Jadwal booking berhasil diperbarui');
    } catch (error) { next(error); }
  },

  async spkDetail(req: Request, res: Response, next: NextFunction) {
    try {
      await ensureEstimateApprovalSchema();
      // @ts-ignore
      const customerId = req.customerId;
      const woId = Number(req.params.id);

      // Verify ownership
      const spk = await db.queryOne<any>("SELECT * FROM work_orders WHERE id = ? AND pelangganId = ?", [woId, customerId]);
      if (!spk) throw new NotFoundError('Work Order tidak ditemukan atau Anda tidak memiliki akses');

      // Fetch related data
      const [kendaraan, mekanik, items, stages, photos, pembayaran] = await Promise.all([
        spk.kendaraanId ? db.queryOne("SELECT * FROM kendaraan WHERE id = ?", [spk.kendaraanId]) : null,
        spk.mekanikId ? db.queryOne("SELECT * FROM mekanik WHERE id = ?", [spk.mekanikId]) : null,
        db.query("SELECT i.*, sp.name AS spName, j.name AS jName FROM wo_items i LEFT JOIN sparepart sp ON sp.id = i.sparepartId LEFT JOIN jasa j ON j.id = i.jasaId WHERE i.woId = ?", [woId]),
        db.query("SELECT * FROM wo_stages WHERE woId = ? ORDER BY urutan ASC", [woId]),
        db.query("SELECT * FROM wo_photos WHERE woId = ? ORDER BY createdAt DESC", [woId]),
        db.query("SELECT * FROM pembayaran WHERE woId = ? LIMIT 1", [woId])
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

  async respondEstimateApproval(req: Request, res: Response, next: NextFunction) {
    try {
      await ensureEstimateApprovalSchema();
      const customerId = (req as CustomerAuthRequest).customerId!;
      const woId = Number(req.params.id);
      const { decision, note } = req.body as { decision?: string; note?: string };
      if (!['approved', 'rejected'].includes(String(decision))) throw new BadRequestError('Keputusan estimasi tidak valid');
      const wo = await db.queryOne<any>('SELECT id, estimateApprovalStatus FROM work_orders WHERE id = ? AND pelangganId = ?', [woId, customerId]);
      if (!wo) throw new NotFoundError('Work Order tidak ditemukan atau Anda tidak memiliki akses');
      if (wo.estimateApprovalStatus !== 'pending') throw new BadRequestError('Tidak ada estimasi yang menunggu persetujuan');
      await db.update('work_orders', { estimateApprovalStatus: decision, estimateApprovalNote: note?.trim() || null, estimateApprovedAt: new Date(), updatedAt: new Date() }, 'id = ?', [woId]);
      notifyEstimateApprovalResponse(woId, decision as 'approved' | 'rejected').catch(() => {});
      sendSuccess(res, null, decision === 'approved' ? 'Estimasi disetujui. Pengerjaan dapat dilanjutkan.' : 'Estimasi ditolak. Tim bengkel akan menghubungi Anda.');
    } catch (error) { next(error); }
  },

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      // @ts-ignore
      const customerId = req.customerId;
      const { name, email, address } = req.body;

      if (!name) throw new BadRequestError('Nama wajib diisi');

      await db.update('pelanggan', { name, email, address, updatedAt: new Date() }, 'id = ?', [customerId]);

      const updatedUser = await db.queryOne("SELECT id, name, phone, email, address, totalTrx, photoUrl AS avatar, loyaltyTierId, createdAt FROM pelanggan WHERE id = ?", [customerId]);
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
        SELECT p.*, s.noWo, s.status AS woStatus
        FROM pembayaran p
        JOIN work_orders s ON s.id = p.woId
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

      await ensureVoucherSchema();
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
        const voucher = await issueVoucher(tx, customerId, rewardId);
        
        const r = await tx.execute('UPDATE loyalty_rewards SET stock = stock - 1 WHERE id = ? AND stock > 0', [rewardId]);
        if (r.affectedRows === 0) throw new Error('Stok reward habis saat proses simultan');

        return { balance: balance - reward.pointsCost, voucher };
      });

      sendSuccess(res, result, 'Poin berhasil ditukar');
    } catch (error: any) {
      if (error.message && !error.code) return res.status(400).json({ success: false, message: error.message });
      next(error);
    }
  },

  async getVouchers(req: Request, res: Response, next: NextFunction) {
    try {
      // @ts-ignore
      const customerId = req.customerId;
      await ensureVoucherSchema();
      const data = await db.query(`SELECT v.*, r.name AS rewardName, r.description AS rewardDescription FROM vouchers v LEFT JOIN loyalty_rewards r ON r.id = v.rewardId WHERE v.pelangganId = ? ORDER BY v.createdAt DESC`, [customerId]);
      sendSuccess(res, data, 'Voucher berhasil diambil');
    } catch (error) { next(error); }
  },

  async getGaransi(req: Request, res: Response, next: NextFunction) {
    try {
      // @ts-ignore
      const customerId = req.customerId;

      const rows = await db.query(`
        SELECT g.*, s.noWo 
        FROM garansi g
        JOIN work_orders s ON s.id = g.woId
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
        JOIN work_orders s ON s.id = g.woId
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
      if (!(await ensureNotificationSchema())) {
        return res.status(503).json({ success: false, message: 'Notifikasi sedang dipersiapkan. Silakan coba lagi.' });
      }
      // @ts-ignore
      const customerId = req.customerId;
      const { page = 1, limit = 20 } = req.query;
      const limitNum = Math.min(100, Math.max(1, Number(limit)));
      const skip = (Math.max(1, Number(page)) - 1) * limitNum;

      const spkIdsRes = await db.query("SELECT id FROM work_orders WHERE pelangganId = ?", [customerId]);
      const spkIds = spkIdsRes.map((r: any) => r.id);

      // Notifications are scoped by the customer and, when available, by WO.
      // The notification module adds these columns lazily for legacy installs.
      let whereClause = "pelangganId = ?";
      let params: any[] = [customerId];

      if (spkIds.length > 0) {
        whereClause = `(pelangganId = ? OR woId IN (${spkIds.map(() => '?').join(',')}))`;
        params = [customerId, ...spkIds];
      }

      const rows = await db.query<any>(`SELECT * FROM notifikasi WHERE ${whereClause} ORDER BY createdAt DESC LIMIT ? OFFSET ?`, [...params, limitNum, skip]);
      // Backfill tujuan kwitansi untuk notifikasi pembayaran lama yang masih
      // menyimpan link umum ke daftar pembayaran.
      const woIds = rows.filter((row: any) => row.type === 'pembayaran' && row.woId).map((row: any) => row.woId);
      if (woIds.length) {
        const payments = await db.query<any>(`SELECT woId, publicId, accessPin FROM pembayaran WHERE woId IN (${woIds.map(() => '?').join(',')})`, woIds);
        const paymentByWo = new Map(payments.map((payment: any) => [payment.woId, payment]));
        for (const row of rows) {
          const payment = paymentByWo.get(row.woId);
          if (row.type === 'pembayaran' && payment?.publicId && (!row.link || row.link.includes('/portal/pembayaran'))) {
            row.link = `/pub/pembayaran/${encodeURIComponent(payment.publicId)}/kwitansi${payment.accessPin ? `?pin=${encodeURIComponent(payment.accessPin)}` : ''}`;
          }
        }
      }
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
      if (!(await ensureNotificationSchema())) {
        return res.status(503).json({ success: false, message: 'Notifikasi sedang dipersiapkan. Silakan coba lagi.' });
      }
      // @ts-ignore
      const customerId = req.customerId;

      const spkIdsRes = await db.query("SELECT id FROM work_orders WHERE pelangganId = ?", [customerId]);
      const spkIds = spkIdsRes.map((r: any) => r.id);

      let whereClause = "pelangganId = ?";
      let params: any[] = [customerId];

      if (spkIds.length > 0) {
        whereClause = `(pelangganId = ? OR woId IN (${spkIds.map(() => '?').join(',')}))`;
        params = [customerId, ...spkIds];
      }

      await db.execute(`UPDATE notifikasi SET isRead = 1 WHERE ${whereClause} AND isRead = 0`, params);
      sendSuccess(res, null, 'Semua notifikasi ditandai dibaca');
    } catch (error) {
      next(error);
    }
  },

  async markReadNotifikasi(req: Request, res: Response, next: NextFunction) {
    try {
      if (!(await ensureNotificationSchema())) {
        return res.status(503).json({ success: false, message: 'Notifikasi sedang dipersiapkan. Silakan coba lagi.' });
      }
      // @ts-ignore
      const customerId = req.customerId;
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: 'ID notifikasi tidak valid' });
      await db.execute('UPDATE notifikasi SET isRead = 1 WHERE id = ? AND pelangganId = ?', [id, customerId]);
      sendSuccess(res, null, 'Notifikasi ditandai dibaca');
    } catch (error) { next(error); }
  },

  async submitReview(req: Request, res: Response, next: NextFunction) {
    try {
      // @ts-ignore
      const customerId = req.customerId;
      const { woId, rating, comment, tags } = req.body;

      if (!woId || !rating || rating < 1 || rating > 5) {
        throw new BadRequestError('Work Order ID dan Rating (1-5) wajib diisi');
      }

      const spk = await db.queryOne<{ id: number, status: string }>("SELECT id, status FROM work_orders WHERE id = ? AND pelangganId = ?", [woId, customerId]);
      if (!spk) throw new NotFoundError('Work Order tidak ditemukan atau Anda tidak memiliki akses');
      if (spk.status !== 'selesai') throw new BadRequestError('Review hanya dapat diberikan untuk servis yang sudah selesai');

      const existing = await db.queryOne("SELECT id FROM customer_reviews WHERE woId = ?", [woId]);
      if (existing) throw new ConflictError('Anda sudah memberikan review untuk SPK ini');

      await db.insert('customer_reviews', {
        woId, pelangganId: customerId, rating, comment,
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
      const woId = Number(req.params.woId);

      const review = await db.queryOne("SELECT * FROM customer_reviews WHERE woId = ? AND pelangganId = ?", [woId, customerId]);
      
      sendSuccess(res, review || null, 'Data review berhasil diambil');
    } catch (error) {
      next(error);
    }
  }
};
