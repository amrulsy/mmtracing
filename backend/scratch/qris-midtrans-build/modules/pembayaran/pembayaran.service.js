"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pembayaranService = exports.PembayaranService = void 0;
const db_1 = __importDefault(require("../../config/db"));
const errors_1 = require("../../shared/errors");
const sse_1 = require("../../shared/sse");
const gate_pass_1 = require("../../shared/gate-pass");
const utils_1 = require("../../shared/utils");
const whatsapp_notification_1 = require("../whatsapp/whatsapp.notification");
const crypto_1 = __importDefault(require("crypto"));
const qris_service_1 = require("./qris.service");
// ═══════════════════════════════════════════════════════════════
// Pembayaran Service — Extracted from fat route file
// ═══════════════════════════════════════════════════════════════
class PembayaranService {
    /**
     * Generate a cryptographically random 6-digit PIN for E-Kwitansi access.
     * This replaces the old "last 4 digits of phone" approach.
     */
    static generateSecurePin() {
        // Generate random 6-digit PIN (000000–999999)
        return String(crypto_1.default.randomInt(0, 1000000)).padStart(6, '0');
    }
    /** Fetch public E-Kwitansi by publicId, verifying PIN */
    async getPublicReceipt(publicId, pin) {
        if (!pin || pin.length < 4) {
            throw new errors_1.BadRequestError('PIN diperlukan (minimal 4 digit).');
        }
        const data = await db_1.default.queryOne('SELECT * FROM pembayaran WHERE publicId = ?', [publicId]);
        if (!data)
            throw new errors_1.NotFoundError('Pembayaran');
        // Verify PIN stored on the pembayaran record
        if (!data.accessPin || pin !== data.accessPin) {
            throw new errors_1.BadRequestError('PIN yang Anda masukkan salah.');
        }
        // Fetch related data
        const spk = await db_1.default.queryOne('SELECT * FROM work_orders WHERE id = ?', [data.woId]);
        if (spk) {
            const [pelanggan, kendaraan, items, stages] = await Promise.all([
                db_1.default.queryOne('SELECT * FROM pelanggan WHERE id = ?', [spk.pelangganId]),
                spk.kendaraanId ? db_1.default.queryOne('SELECT * FROM kendaraan WHERE id = ?', [spk.kendaraanId]) : null,
                db_1.default.query('SELECT * FROM wo_items WHERE woId = ?', [spk.id]),
                db_1.default.query('SELECT * FROM wo_stages WHERE woId = ? ORDER BY urutan ASC', [spk.id]),
            ]);
            spk.pelanggan = pelanggan;
            spk.kendaraan = kendaraan;
            spk.items = items;
            spk.stages = stages;
        }
        data.spk = spk;
        data.detail = await db_1.default.query('SELECT * FROM pembayaran_detail WHERE pembayaranId = ? ORDER BY tanggal DESC', [data.id]);
        return data;
    }
    /** List all pembayaran with pagination, search, and related data */
    async findAll(query) {
        const { page, limit, skip } = (0, utils_1.parsePagination)(query);
        const { status, search } = query;
        const conds = [];
        const params = [];
        if (status && status !== 'semua') {
            conds.push('pb.status = ?');
            params.push(status);
        }
        if (search) {
            conds.push('(pb.noInvoice LIKE ? OR s.noWo LIKE ? OR p.name LIKE ?)');
            const like = `%${search}%`;
            params.push(like, like, like);
        }
        const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
        const [rows, totalRow] = await Promise.all([
            db_1.default.query(`SELECT pb.*, s.noWo, s.pelangganId, s.kendaraanId, s.mode, s.status AS woStatus,
                p.name AS pName, p.phone AS pPhone,
                k.name AS kName, k.plat AS kPlat
         FROM pembayaran pb
         LEFT JOIN work_orders s ON s.id = pb.woId
         LEFT JOIN pelanggan p ON p.id = s.pelangganId
         LEFT JOIN kendaraan k ON k.id = s.kendaraanId
         ${where} ORDER BY pb.createdAt DESC LIMIT ? OFFSET ?`, [...params, limit, skip]),
            db_1.default.queryOne(`SELECT COUNT(*) AS c FROM pembayaran pb LEFT JOIN work_orders s ON s.id = pb.woId LEFT JOIN pelanggan p ON p.id = s.pelangganId ${where}`, params),
        ]);
        // Batch fetch items, stages, details
        const pbIds = rows.map((r) => r.id);
        const spkIds = [...new Set(rows.map((r) => r.woId).filter(Boolean))];
        const [details, items, stages] = pbIds.length ? await Promise.all([
            db_1.default.query('SELECT * FROM pembayaran_detail WHERE pembayaranId IN (?) ORDER BY tanggal DESC', [pbIds]),
            spkIds.length ? db_1.default.query('SELECT * FROM wo_items WHERE woId IN (?)', [spkIds]) : [],
            spkIds.length ? db_1.default.query('SELECT * FROM wo_stages WHERE woId IN (?)', [spkIds]) : [],
        ]) : [[], [], []];
        const detMap = new Map();
        for (const d of details) {
            if (!detMap.has(d.pembayaranId))
                detMap.set(d.pembayaranId, []);
            detMap.get(d.pembayaranId).push(d);
        }
        const itemMap = new Map();
        for (const i of items) {
            if (!itemMap.has(i.woId))
                itemMap.set(i.woId, []);
            itemMap.get(i.woId).push(i);
        }
        const stageMap = new Map();
        for (const st of stages) {
            if (!stageMap.has(st.woId))
                stageMap.set(st.woId, []);
            stageMap.get(st.woId).push(st);
        }
        const data = rows.map((r) => ({
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
            db_1.default.queryOne("SELECT COALESCE(SUM(sisaBayar),0) AS t, COUNT(*) AS c FROM pembayaran WHERE status != 'lunas'"),
            db_1.default.queryOne('SELECT COALESCE(SUM(jumlah),0) AS t, COUNT(*) AS c FROM pembayaran_detail WHERE tanggal >= ?', [today]),
            db_1.default.queryOne('SELECT COALESCE(SUM(jumlah),0) AS t FROM pembayaran_detail WHERE tanggal >= ?', [thisMonth]),
        ]);
        return {
            menunggu: { total: Number(menungguRow?.t || 0), count: menungguRow?.c || 0 },
            hariIni: { total: Number(hariIniRow?.t || 0), count: hariIniRow?.c || 0 },
            bulanIni: Number(bulanIniRow?.t || 0),
        };
    }
    /** Get single pembayaran by id with all relations */
    async findById(id) {
        const data = await db_1.default.queryOne('SELECT * FROM pembayaran WHERE id = ?', [id]);
        if (!data)
            throw new errors_1.NotFoundError('Pembayaran');
        const spk = await db_1.default.queryOne('SELECT * FROM work_orders WHERE id = ?', [data.woId]);
        if (spk) {
            const [pelanggan, kendaraan, items, stages] = await Promise.all([
                db_1.default.queryOne('SELECT * FROM pelanggan WHERE id = ?', [spk.pelangganId]),
                spk.kendaraanId ? db_1.default.queryOne('SELECT * FROM kendaraan WHERE id = ?', [spk.kendaraanId]) : null,
                db_1.default.query('SELECT * FROM wo_items WHERE woId = ?', [spk.id]),
                db_1.default.query('SELECT * FROM wo_stages WHERE woId = ? ORDER BY urutan ASC', [spk.id]),
            ]);
            spk.pelanggan = pelanggan;
            spk.kendaraan = kendaraan;
            spk.items = items;
            spk.stages = stages;
        }
        data.spk = spk;
        data.detail = await db_1.default.query('SELECT * FROM pembayaran_detail WHERE pembayaranId = ? ORDER BY tanggal DESC', [id]);
        return data;
    }
    /** Process payment (partial or full) */
    async bayar(id, input, userId) {
        const isQris = input.metode.trim().toLowerCase() === 'qris';
        if (isQris)
            await (0, qris_service_1.ensureQrisSchema)();
        const pembayaran = await db_1.default.queryOne('SELECT * FROM pembayaran WHERE id = ?', [id]);
        if (!pembayaran)
            throw new errors_1.NotFoundError('Pembayaran');
        const spkRow = await db_1.default.queryOne('SELECT * FROM work_orders WHERE id = ?', [pembayaran.woId]);
        pembayaran.spk = spkRow;
        const jumlah = Number(input.jumlah);
        if (pembayaran.status === 'lunas') {
            throw new errors_1.BadRequestError('Invoice ini sudah lunas dan tidak dapat menerima pembayaran lagi');
        }
        const updated = await db_1.default.transaction(async (tx) => {
            const freshPay = await tx.queryOne('SELECT * FROM pembayaran WHERE id = ? FOR UPDATE', [pembayaran.id]);
            if (!freshPay)
                throw new errors_1.BadRequestError('Invoice tidak ditemukan');
            if (freshPay.status === 'lunas')
                throw new errors_1.BadRequestError('Invoice ini sudah lunas');
            if (jumlah > Number(freshPay.sisaBayar)) {
                throw new errors_1.BadRequestError(`Jumlah pembayaran (Rp ${jumlah.toLocaleString('id-ID')}) melebihi sisa tagihan (Rp ${Number(freshPay.sisaBayar).toLocaleString('id-ID')})`);
            }
            const newTotalBayar = Number(freshPay.totalBayar) + jumlah;
            const newSisa = Number(freshPay.totalTagihan) - newTotalBayar;
            const newStatus = newSisa <= 0 ? 'lunas' : 'parsial';
            const qrisNote = isQris ? await (0, qris_service_1.confirmQrisAttempt)(tx, id, jumlah, input, userId) : undefined;
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
                const spk = await tx.queryOne('SELECT * FROM work_orders WHERE id = ?', [pembayaran.woId]);
                if (spk && spk.status === 'selesai') {
                    await (0, gate_pass_1.releaseGatePass)(tx, pembayaran.woId);
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
            const updatedPay = await tx.queryOne('SELECT * FROM pembayaran WHERE id = ?', [pembayaran.id]);
            updatedPay.detail = await tx.query('SELECT * FROM pembayaran_detail WHERE pembayaranId = ? ORDER BY tanggal DESC', [pembayaran.id]);
            updatedPay.spk = spkRow;
            return updatedPay;
        });
        // Broadcast SSE event
        const sseEvent = updated.status === 'lunas' ? 'pembayaran:lunas' : 'pembayaran:bayar';
        sse_1.sseManager.broadcast(sseEvent, { pembayaranId: updated.id, noInvoice: updated.noInvoice, status: updated.status });
        // WhatsApp: Send payment reminder if partially paid
        if (updated.status === 'parsial') {
            (0, whatsapp_notification_1.notifyReminderPembayaran)(updated.id);
        }
        return updated;
    }
    /** Refund — rollback lunas status, delete garansi & loyalty points */
    async refund(id, userId) {
        const pembayaran = await db_1.default.queryOne('SELECT * FROM pembayaran WHERE id = ?', [id]);
        if (!pembayaran)
            throw new errors_1.NotFoundError('Pembayaran');
        if (pembayaran.status !== 'lunas') {
            throw new errors_1.BadRequestError('Hanya invoice berstatus lunas yang dapat di-refund');
        }
        const spkRow = await db_1.default.queryOne('SELECT * FROM work_orders WHERE id = ?', [pembayaran.woId]);
        const result = await db_1.default.transaction(async (tx) => {
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
                const pelanggan = await tx.queryOne('SELECT * FROM pelanggan WHERE id = ?', [spkRow.pelangganId]);
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
exports.PembayaranService = PembayaranService;
exports.pembayaranService = new PembayaranService();
//# sourceMappingURL=pembayaran.service.js.map