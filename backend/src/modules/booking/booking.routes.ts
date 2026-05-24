import { Router, Request, Response, NextFunction } from 'express';
import db from '../../config/db';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { sendSuccess, generateSpkNo } from '../../shared/utils';

const router = Router();

// GET /booking — List all bookings (Admin) with search, date filters
router.get('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '20');
    const skip = (page - 1) * limit;

    const conds: string[] = [];
    const params: any[] = [];
    if (status && status !== 'semua') { conds.push('b.status = ?'); params.push(status); }
    if (search && search.trim()) {
      conds.push('(b.nama LIKE ? OR b.whatsapp LIKE ? OR b.layanan LIKE ? OR b.merkTipe LIKE ? OR b.platNomor LIKE ?)');
      const s = `%${search}%`; params.push(s, s, s, s, s);
    }
    if (dateFrom) { conds.push('b.createdAt >= ?'); params.push(new Date(dateFrom)); }
    if (dateTo) { const end = new Date(dateTo); end.setHours(23,59,59,999); conds.push('b.createdAt <= ?'); params.push(end); }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';

    const [data, totalRow] = await Promise.all([
      db.query(
        `SELECT b.*, p.id AS pId, p.name AS pName, p.phone AS pPhone,
                s.id AS sId, s.noSpk, s.status AS sStatus
         FROM bookings b
         LEFT JOIN pelanggan p ON p.id = b.pelangganId
         LEFT JOIN spk s ON s.id = b.spkId
         ${where} ORDER BY b.createdAt DESC LIMIT ? OFFSET ?`,
        [...params, limit, skip]),
      db.queryOne<{ c: number }>(`SELECT COUNT(*) AS c FROM bookings b ${where}`, params),
    ]);
    const total = totalRow?.c ?? 0;
    const rows = data.map((r: any) => ({
      ...r,
      pelanggan: r.pId ? { id: r.pId, name: r.pName, phone: r.pPhone } : null,
      spk: r.sId ? { id: r.sId, noSpk: r.noSpk, status: r.sStatus } : null,
    }));

    sendSuccess(res, {
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (e) {
    next(e);
  }
});

// GET /booking/stats — Booking statistics (Admin)
router.get('/stats', authMiddleware, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [r1, r2, r3, r4, r5] = await Promise.all([
      db.queryVal<number>('SELECT COUNT(*) FROM bookings'),
      db.queryVal<number>("SELECT COUNT(*) FROM bookings WHERE status = 'baru'"),
      db.queryVal<number>("SELECT COUNT(*) FROM bookings WHERE status = 'dikonfirmasi'"),
      db.queryVal<number>('SELECT COUNT(*) FROM bookings WHERE createdAt >= ?', [today]),
      db.queryVal<number>('SELECT COUNT(*) FROM bookings WHERE spkId IS NOT NULL'),
    ]);
    const total = r1, baru = r2, dikonfirmasi = r3, todayCount = r4, converted = r5;

    sendSuccess(res, {
      total,
      baru,
      dikonfirmasi,
      hari_ini: todayCount,
      converted,
      conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
    });
  } catch (e) {
    next(e);
  }
});

// PUT /booking/:id — Update booking status + catatan (Admin)
router.put('/:id', authMiddleware, requireRole('Admin', 'Kasir'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(String(req.params.id));
    const { status, catatan } = req.body;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (catatan !== undefined) updateData.catatan = catatan;

    // Auto-match pelanggan by WhatsApp saat dikonfirmasi
    if (status === 'dikonfirmasi') {
      const currentBooking = await db.queryOne<any>('SELECT * FROM bookings WHERE id = ?', [id]);
      if (currentBooking && !currentBooking.pelangganId) {
        const normalizedPhone = currentBooking.whatsapp.replace(/^0/, '62').replace(/[^0-9]/g, '');
        const existingPelanggan = await db.queryOne<{ id: number }>(
          'SELECT id FROM pelanggan WHERE phone IN (?, ?, ?) AND deletedAt IS NULL LIMIT 1',
          [currentBooking.whatsapp, normalizedPhone, currentBooking.whatsapp.replace(/^62/, '0')]);
        if (existingPelanggan) {
          updateData.pelangganId = existingPelanggan.id;
        }
      }
    }

    await db.update('bookings', { ...updateData, updatedAt: new Date() }, 'id = ?', [id]);
    const booking = await db.queryOne<any>(
      `SELECT b.*, p.id AS pId, p.name AS pName, s.id AS sId, s.noSpk
       FROM bookings b LEFT JOIN pelanggan p ON p.id = b.pelangganId LEFT JOIN spk s ON s.id = b.spkId
       WHERE b.id = ?`, [id]);
    if (booking) {
      booking.pelanggan = booking.pId ? { id: booking.pId, name: booking.pName } : null;
      booking.spk = booking.sId ? { id: booking.sId, noSpk: booking.noSpk } : null;
    }

    sendSuccess(res, booking, 'Status booking diperbarui');
  } catch (e) {
    next(e);
  }
});

// POST /booking/:id/convert-to-spk — Convert booking to SPK
router.post('/:id/convert-to-spk', authMiddleware, requireRole('Admin', 'Kasir'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bookingId = parseInt(String(req.params.id));
    const booking = await db.queryOne<any>('SELECT * FROM bookings WHERE id = ?', [bookingId]);
    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking tidak ditemukan' });
      return;
    }
    if (booking.spkId) {
      res.status(400).json({ success: false, message: `Booking sudah dikonversi ke SPK #${booking.spkId}` });
      return;
    }

    // Determine mode from layanan
    let mode = 'rutin';
    const layananLower = booking.layanan.toLowerCase();
    if (layananLower.includes('modif')) mode = 'modifikasi';
    else if (layananLower.includes('bubut')) mode = 'bubut';

    // Find or create pelanggan
    let pelangganId = booking.pelangganId;
    if (!pelangganId) {
      const normalizedPhone = booking.whatsapp.replace(/^0/, '62').replace(/[^0-9]/g, '');
      const existing = await db.queryOne<{ id: number }>(
        'SELECT id FROM pelanggan WHERE phone IN (?, ?, ?) AND deletedAt IS NULL LIMIT 1',
        [booking.whatsapp, normalizedPhone, booking.whatsapp.replace(/^62/, '0')]);
      if (existing) {
        pelangganId = existing.id;
      } else {
        pelangganId = await db.insert('pelanggan', {
          name: booking.nama,
          phone: booking.whatsapp,
          type: mode === 'bubut' ? 'bubut' : 'kendaraan',
        });
      }
    }

    // Find kendaraan by plat if available
    let kendaraanId: number | null = null;
    if (booking.platNomor && mode !== 'bubut') {
      const kendaraan = await db.queryOne<{ id: number }>(
        'SELECT id FROM kendaraan WHERE pelangganId = ? AND plat LIKE ? AND deletedAt IS NULL LIMIT 1',
        [pelangganId!, `%${booking.platNomor}%`]);
      if (kendaraan) {
        kendaraanId = kendaraan.id;
      } else if (booking.merkTipe || booking.jenisKendaraan) {
        kendaraanId = await db.insert('kendaraan', {
          pelangganId: pelangganId!,
          name: booking.merkTipe || booking.jenisKendaraan,
          plat: booking.platNomor || '-',
        });
      }
    }

    // Get user from auth
    const userId = (req as any).user?.id || 1;

    // Create SPK
    const noSpk = generateSpkNo();
    const spkId = await db.insert('spk', {
      noSpk,
      pelangganId: pelangganId!,
      kendaraanId,
      mode,
      keluhan: booking.keluhan || `Booking Online #${booking.id}: ${booking.layanan}`,
      createdById: userId,
      status: 'antri',
    });

    // Link booking to SPK and update status
    await db.update('bookings', { spkId, pelangganId, status: 'dikonfirmasi', updatedAt: new Date() }, 'id = ?', [bookingId]);

    sendSuccess(res, {
      spkId,
      noSpk,
      pelangganId,
      kendaraanId,
    }, `Booking berhasil dikonversi ke SPK ${noSpk}`);
  } catch (e) {
    next(e);
  }
});

// DELETE /booking/:id — Delete booking (Admin)
router.delete('/:id', authMiddleware, requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(String(req.params.id));
    await db.execute('DELETE FROM bookings WHERE id = ?', [id]);
    sendSuccess(res, null, 'Booking dihapus');
  } catch (e) {
    next(e);
  }
});

export default router;
