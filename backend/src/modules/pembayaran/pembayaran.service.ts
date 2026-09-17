import db, { Queryable } from '../../config/db';
import { NotFoundError, BadRequestError } from '../../shared/errors';
import { sseManager } from '../../shared/sse';
import { releaseGatePass } from '../../shared/gate-pass';
import { parsePagination } from '../../shared/utils';
import { notifyReminderPembayaran } from '../whatsapp/whatsapp.notification';
import crypto from 'crypto';
import { confirmQrisAttempt, ensureQrisSchema, QrisConfirmation } from './qris.service';

// ═══════════════════════════════════════════════════════════════
// Pembayaran Service — Extracted from fat route file
// ═══════════════════════════════════════════════════════════════

export class PembayaranService {

  /**
   * Generate a cryptographically random 6-digit PIN for E-Kwitansi access.
   * This replaces the old "last 4 digits of phone" approach.
   */
  static generateSecurePin(): string {
    // Generate random 6-digit PIN (000000–999999)
    return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  }

  /** Fetch public E-Kwitansi by publicId, verifying PIN */
  async getPublicReceipt(publicId: string, pin: string) {
    if (!pin || pin.length < 4) {
      throw new BadRequestError('PIN diperlukan (minimal 4 digit).');
    }

    const data = await db.queryOne<any>('SELECT * FROM pembayaran WHERE publicId = ?', [publicId]);
    if (!data) throw new NotFoundError('Pembayaran');

    // Fetch related data early for PIN check fallback
    const spk = await db.queryOne<any>('SELECT * FROM work_orders WHERE id = ?', [data.woId]);
    
    let isPinValid = false;
    if (data.accessPin && pin === data.accessPin) {
      isPinValid = true;
    }
    
    if (!isPinValid && spk) {
      const pelanggan = await db.queryOne<any>('SELECT phone FROM pelanggan WHERE id = ?', [spk.pelangganId]);
      if (pelanggan && pelanggan.phone) {
        const phoneStr = String(pelanggan.phone).replace(/\D/g, '');
        if (phoneStr.length >= 4 && pin === phoneStr.slice(-4)) {
          isPinValid = true;
        }
      }
    }

    if (!isPinValid) {
      throw new BadRequestError('PIN yang Anda masukkan salah. Gunakan 4 digit terakhir nomor HP Anda.');
    }
    if (spk) {
      const [pelanggan, kendaraan, items, stages] = await Promise.all([
        db.queryOne('SELECT * FROM pelanggan WHERE id = ?', [spk.pelangganId]),
        spk.kendaraanId ? db.queryOne('SELECT * FROM kendaraan WHERE id = ?', [spk.kendaraanId]) : null,
        db.query('SELECT * FROM wo_items WHERE woId = ?', [spk.id]),
        db.query('SELECT * FROM wo_stages WHERE woId = ? ORDER BY urutan ASC', [spk.id]),
      ]);
      spk.pelanggan = pelanggan; spk.kendaraan = kendaraan; spk.items = items; spk.stages = stages;
    }
    data.spk = spk;
    data.detail = await db.query('SELECT * FROM pembayaran_detail WHERE pembayaranId = ? ORDER BY tanggal DESC', [data.id]);

    return data;
  }

  /** List all pembayaran with pagination, search, and related data */
  async findAll(query: any) {
    const { page, limit, skip } = parsePagination(query);
    const { status, search } = query;
    const conds: string[] = [];
    const params: any[] = [];

    if (status && status !== 'semua') { conds.push('pb.status = ?'); params.push(status); }
    if (search) {
      conds.push('(pb.noInvoice LIKE ? OR s.noWo LIKE ? OR p.name LIKE ?)');
      const like = `%${search}%`; params.push(like, like, like);
    }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';

    const [rows, totalRow] = await Promise.all([
      db.query(
        `SELECT pb.*, s.noWo, s.pelangganId, s.kendaraanId, s.mode, s.status AS woStatus,
                p.name AS pName, p.phone AS pPhone,
                k.name AS kName, k.plat AS kPlat
         FROM pembayaran pb
         LEFT JOIN work_orders s ON s.id = pb.woId
         LEFT JOIN pelanggan p ON p.id = s.pelangganId
         LEFT JOIN kendaraan k ON k.id = s.kendaraanId
         ${where} ORDER BY pb.createdAt DESC LIMIT ? OFFSET ?`,
        [...params, limit, skip]),
      db.queryOne<{ c: number }>(`SELECT COUNT(*) AS c FROM pembayaran pb LEFT JOIN work_orders s ON s.id = pb.woId LEFT JOIN pelanggan p ON p.id = s.pelangganId ${where}`, params),
    ]);

    // Batch fetch items, stages, details
    const pbIds = rows.map((r: any) => r.id);
    const spkIds = [...new Set(rows.map((r: any) => r.woId).filter(Boolean))];
    const [details, items, stages] = pbIds.length ? await Promise.all([
      db.query('SELECT * FROM pembayaran_detail WHERE pembayaranId IN (?) ORDER BY tanggal DESC', [pbIds]),
      spkIds.length ? db.query('SELECT * FROM wo_items WHERE woId IN (?)', [spkIds]) : [],
      spkIds.length ? db.query('SELECT * FROM wo_stages WHERE woId IN (?)', [spkIds]) : [],
    ]) : [[], [], []];

    const detMap = new Map<number, any[]>(); for (const d of details) { if (!detMap.has(d.pembayaranId)) detMap.set(d.pembayaranId, []); detMap.get(d.pembayaranId)!.push(d); }
    const itemMap = new Map<number, any[]>(); for (const i of items) { if (!itemMap.has(i.woId)) itemMap.set(i.woId, []); itemMap.get(i.woId)!.push(i); }
    const stageMap = new Map<number, any[]>(); for (const st of stages) { if (!stageMap.has(st.woId)) stageMap.set(st.woId, []); stageMap.get(st.woId)!.push(st); }

    const data = rows.map((r: any) => ({
      ...r,
      spk: {
        id: r.woId, noWo: r.noWo, mode: r.mode, status: r.woStatus,
        pelanggan: { id: r.pelangganId, name: r.pName, phone: r.pPhone },
        kendaraan: r.kendaraanId ? { id: r.kendaraanId, name: r.kName, plat: r.kPlat } : null,
        items: itemMap.get(r.woId) || [], stages: stageMap.get(r.woId) || [],
      },
      detail: detMap.get(r.id) || [],
    }));

    return { data, total: totalRow?.c ?? 0, page, limit };
  }

  /** Get financial summary */
  async getSummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [menungguRow, hariIniRow, bulanIniRow] = await Promise.all([
      db.queryOne<{ t: number; c: number }>("SELECT COALESCE(SUM(sisaBayar),0) AS t, COUNT(*) AS c FROM pembayaran WHERE status != 'lunas'"),
      db.queryOne<{ t: number; c: number }>('SELECT COALESCE(SUM(jumlah),0) AS t, COUNT(*) AS c FROM pembayaran_detail WHERE tanggal >= ?', [today]),
      db.queryOne<{ t: number }>('SELECT COALESCE(SUM(jumlah),0) AS t FROM pembayaran_detail WHERE tanggal >= ?', [thisMonth]),
    ]);

    return {
      menunggu: { total: Number(menungguRow?.t || 0), count: menungguRow?.c || 0 },
      hariIni: { total: Number(hariIniRow?.t || 0), count: hariIniRow?.c || 0 },
      bulanIni: Number(bulanIniRow?.t || 0),
    };
  }

  /** Get single pembayaran by id with all relations */
  async findById(id: number) {
    const data = await db.queryOne<any>('SELECT * FROM pembayaran WHERE id = ?', [id]);
    if (!data) throw new NotFoundError('Pembayaran');

    const spk = await db.queryOne<any>('SELECT * FROM work_orders WHERE id = ?', [data.woId]);
    if (spk) {
      const [pelanggan, kendaraan, items, stages] = await Promise.all([
        db.queryOne('SELECT * FROM pelanggan WHERE id = ?', [spk.pelangganId]),
        spk.kendaraanId ? db.queryOne('SELECT * FROM kendaraan WHERE id = ?', [spk.kendaraanId]) : null,
        db.query('SELECT * FROM wo_items WHERE woId = ?', [spk.id]),
        db.query('SELECT * FROM wo_stages WHERE woId = ? ORDER BY urutan ASC', [spk.id]),
      ]);
      spk.pelanggan = pelanggan; spk.kendaraan = kendaraan; spk.items = items; spk.stages = stages;
    }
    data.spk = spk;
    data.detail = await db.query('SELECT * FROM pembayaran_detail WHERE pembayaranId = ? ORDER BY tanggal DESC', [id]);
    return data;
  }

  /** Process payment (partial or full) */
  async bayar(id: number, input: { jumlah: number; metode: string; keterangan?: string } & QrisConfirmation, userId?: number) {
    const isQris = input.metode.trim().toLowerCase() === 'qris';
    if (isQris) await ensureQrisSchema();
    const pembayaran = await db.queryOne<any>('SELECT * FROM pembayaran WHERE id = ?', [id]);
    if (!pembayaran) throw new NotFoundError('Pembayaran');
    const spkRow = await db.queryOne<any>('SELECT * FROM work_orders WHERE id = ?', [pembayaran.woId]);
    pembayaran.spk = spkRow;

    const jumlah = Number(input.jumlah);
    if (pembayaran.status === 'lunas') {
      throw new BadRequestError('Invoice ini sudah lunas dan tidak dapat menerima pembayaran lagi');
    }

    const updated = await db.transaction(async (tx) => {
      const freshPay = await tx.queryOne<any>('SELECT * FROM pembayaran WHERE id = ? FOR UPDATE', [pembayaran.id]);
      if (!freshPay) throw new BadRequestError('Invoice tidak ditemukan');
      if (freshPay.status === 'lunas') throw new BadRequestError('Invoice ini sudah lunas');
      if (jumlah > Number(freshPay.sisaBayar)) {
        throw new BadRequestError(`Jumlah pembayaran (Rp ${jumlah.toLocaleString('id-ID')}) melebihi sisa tagihan (Rp ${Number(freshPay.sisaBayar).toLocaleString('id-ID')})`);
      }

      const newTotalBayar = Number(freshPay.totalBayar) + jumlah;
      const newSisa = Number(freshPay.totalTagihan) - newTotalBayar;
      const newStatus = newSisa <= 0 ? 'lunas' : 'parsial';

      const qrisNote = isQris ? await confirmQrisAttempt(tx, id, jumlah, input, userId) : undefined;

      await tx.insert('pembayaran_detail', {
        pembayaranId: pembayaran.id,
        jumlah,
        metode: isQris ? 'qris' : input.metode,
        keterangan: qrisNote ? [qrisNote, input.keterangan].filter(Boolean).join('; ') : input.keterangan,
      });

      await tx.update('pembayaran', {
        totalBayar: newTotalBayar,
        sisaBayar: Math.max(0, newSisa),
        status: newStatus,
        updatedAt: new Date(),
      }, 'id = ?', [pembayaran.id]);

      await tx.execute('UPDATE work_orders SET totalBayar = totalBayar + ? WHERE id = ?', [jumlah, pembayaran.woId]);
      await tx.execute('UPDATE pelanggan SET totalTrx = totalTrx + ? WHERE id = ?', [jumlah, spkRow.pelangganId]);

      // Gate-Pass Delivery
      if (newStatus === 'lunas' && pembayaran.status !== 'lunas') {
        const spk = await tx.queryOne<any>('SELECT * FROM work_orders WHERE id = ?', [pembayaran.woId]);
        if (spk && spk.status === 'selesai') {
          await releaseGatePass(tx, pembayaran.woId);
        }
      }

      // Activity log
      await tx.insert('activity_logs', {
        userId: userId ?? null,
        action: 'bayar',
        module: 'pembayaran',
        targetId: pembayaran.id,
        targetName: pembayaran.noInvoice,
        detail: JSON.stringify({ jumlah, metode: input.metode, newStatus, ...(isQris ? { qrisAttemptId: input.qrisAttemptId, qrisReference: input.qrisReference, verification: 'manual' } : {}) }),
      });

      const updatedPay = await tx.queryOne<any>('SELECT * FROM pembayaran WHERE id = ?', [pembayaran.id]);
      updatedPay!.detail = await tx.query('SELECT * FROM pembayaran_detail WHERE pembayaranId = ? ORDER BY tanggal DESC', [pembayaran.id]);
      updatedPay!.spk = spkRow;
      return updatedPay;
    });

    // Broadcast SSE event
    const sseEvent = updated.status === 'lunas' ? 'pembayaran:lunas' : 'pembayaran:bayar';
    sseManager.broadcast(sseEvent as any, { pembayaranId: updated.id, noInvoice: updated.noInvoice, status: updated.status });

    // WhatsApp: Send payment reminder if partially paid
    if (updated.status === 'parsial') {
      notifyReminderPembayaran(updated.id);
    }

    return updated;
  }

  /** Refund — rollback lunas status, delete garansi & loyalty points */
  async refund(id: number, userId?: number) {
    const pembayaran = await db.queryOne<any>('SELECT * FROM pembayaran WHERE id = ?', [id]);
    if (!pembayaran) throw new NotFoundError('Pembayaran');
    if (pembayaran.status !== 'lunas') {
      throw new BadRequestError('Hanya invoice berstatus lunas yang dapat di-refund');
    }
    const spkRow = await db.queryOne<any>('SELECT * FROM work_orders WHERE id = ?', [pembayaran.woId]);

    const result = await db.transaction(async (tx) => {
      // 1. Hapus semua detail pembayaran
      await tx.execute('DELETE FROM pembayaran_detail WHERE pembayaranId = ?', [pembayaran.id]);

      // 2. Reset invoice ke belum_bayar
      await tx.update('pembayaran', {
        totalBayar: 0,
        sisaBayar: Number(pembayaran.totalTagihan),
        status: 'belum_bayar',
        updatedAt: new Date(),
      }, 'id = ?', [pembayaran.id]);

      // 3. Kurangi totalBayar di SPK
      await tx.execute('UPDATE work_orders SET totalBayar = GREATEST(0, totalBayar - ?) WHERE id = ?', [Number(pembayaran.totalBayar), pembayaran.woId]);

      // 4. Reset totalTrx pelanggan
      if (spkRow) {
        const pelanggan = await tx.queryOne<any>('SELECT * FROM pelanggan WHERE id = ?', [spkRow.pelangganId]);
        if (pelanggan) {
          const currentTrx = Number(pelanggan.totalTrx);
          const refundAmount = Number(pembayaran.totalBayar);
          await tx.update('pelanggan', { totalTrx: Math.max(0, currentTrx - refundAmount) }, 'id = ?', [pelanggan.id]);
        }
      }

      // 5. Hapus garansi terkait SPK ini
      await tx.execute('DELETE FROM garansi WHERE woId = ?', [pembayaran.woId]);

      // 6. Hapus loyalty points terkait SPK ini (hanya tipe 'earn')
      await tx.execute("DELETE FROM loyalty_points WHERE refType = 'transaksi' AND refId = ? AND type = 'earn'", [pembayaran.woId]);

      // 7. Activity log
      await tx.insert('activity_logs', {
        userId: userId ?? null,
        action: 'refund',
        module: 'pembayaran',
        targetId: pembayaran.id,
        targetName: pembayaran.noInvoice,
        detail: JSON.stringify({ woId: pembayaran.woId, jumlahRefund: Number(pembayaran.totalBayar) }),
      });

      return await tx.queryOne('SELECT * FROM pembayaran WHERE id = ?', [pembayaran.id]);
    });

    return result;
  }
}

export const pembayaranService = new PembayaranService();
