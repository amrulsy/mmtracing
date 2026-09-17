"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.woService = exports.WoService = void 0;
const db_1 = __importDefault(require("../../config/db"));
const errors_1 = require("../../shared/errors");
const utils_1 = require("../../shared/utils");
const crypto_1 = require("crypto");
const gate_pass_1 = require("../../shared/gate-pass");
const eventEmitter_1 = require("../../shared/eventEmitter");
const settingsCache_1 = require("../../shared/settingsCache");
/** Hitung minimum DP dinamis berdasarkan mode SPK & pengaturan persentase di Settings.
 * Default fallback: modifikasi 40%, bubut 40%, lainnya 0%. */
async function calcMinimumDp(mode, totalHarga) {
    if (!['modifikasi', 'bubut'].includes(mode))
        return 0;
    const key = mode === 'modifikasi' ? 'dp_modifikasi_persen' : 'dp_bubut_persen';
    const raw = await (0, settingsCache_1.getSetting)(key);
    let pct = 40; // default
    if (raw !== null) {
        const parsed = Number(raw);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 100)
            pct = parsed;
    }
    return Math.ceil((totalHarga * pct) / 100);
}
class WoService {
    async findAll(query) {
        const { status, mode, search, mekanikId, pembayaranStatus, prioritas, dateFrom, dateTo, overdue, includeDeleted, page = 1, limit = 20 } = query;
        const skip = (Number(page) - 1) * Number(limit);
        const conds = [];
        const params = [];
        if (includeDeleted !== 'true')
            conds.push('s.deletedAt IS NULL');
        if (status && status !== 'semua') {
            conds.push('s.status = ?');
            params.push(status);
        }
        if (mode && mode !== 'semua') {
            conds.push('s.mode = ?');
            params.push(mode);
        }
        if (prioritas) {
            conds.push('s.prioritas = ?');
            params.push(prioritas);
        }
        if (mekanikId) {
            conds.push('s.mekanikId = ?');
            params.push(Number(mekanikId));
        }
        if (dateFrom) {
            conds.push('s.createdAt >= ?');
            params.push(new Date(dateFrom));
        }
        if (dateTo) {
            const end = new Date(dateTo);
            end.setHours(23, 59, 59, 999);
            conds.push('s.createdAt <= ?');
            params.push(end);
        }
        if (overdue === 'true') {
            conds.push("s.estimasiSelesai IS NOT NULL AND s.estimasiSelesai < NOW() AND s.status IN ('antri','dikerjakan','kendala')");
        }
        if (pembayaranStatus) {
            conds.push('EXISTS (SELECT 1 FROM pembayaran pb WHERE pb.woId = s.id AND pb.status = ?)');
            params.push(pembayaranStatus);
        }
        if (search) {
            conds.push('(s.noWo LIKE ? OR p.name LIKE ? OR k.name LIKE ? OR k.plat LIKE ?)');
            const like = `%${search}%`;
            params.push(like, like, like, like);
        }
        const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
        const [rows, totalRow] = await Promise.all([
            db_1.default.query(`SELECT s.*, p.id AS pId, p.name AS pName, p.phone AS pPhone,
                k.id AS kId, k.name AS kName, k.plat AS kPlat,
                m.id AS mId, m.name AS mName, m.initial AS mInitial,
                (SELECT COUNT(*) FROM wo_items WHERE woId = s.id) AS _countItems,
                (SELECT COUNT(*) FROM wo_photos WHERE woId = s.id) AS _countPhotos
         FROM work_orders s
         LEFT JOIN pelanggan p ON p.id = s.pelangganId
         LEFT JOIN kendaraan k ON k.id = s.kendaraanId
         LEFT JOIN mekanik m ON m.id = s.mekanikId
         ${where} ORDER BY s.createdAt DESC LIMIT ? OFFSET ?`, [...params, Number(limit), skip]),
            db_1.default.queryOne(`SELECT COUNT(*) AS c FROM work_orders s LEFT JOIN pelanggan p ON p.id = s.pelangganId LEFT JOIN kendaraan k ON k.id = s.kendaraanId ${where}`, params),
        ]);
        const data = rows.map((r) => ({
            ...r,
            pelanggan: { id: r.pId, name: r.pName, phone: r.pPhone },
            kendaraan: r.kId ? { id: r.kId, name: r.kName, plat: r.kPlat } : null,
            mekanik: r.mId ? { id: r.mId, name: r.mName, initial: r.mInitial } : null,
            _count: { items: r._countItems, photos: r._countPhotos },
        }));
        return { data, total: totalRow?.c ?? 0, page: Number(page), limit: Number(limit) };
    }
    async findById(id) {
        const spk = await db_1.default.queryOne('SELECT * FROM work_orders WHERE id = ?', [id]);
        if (!spk)
            throw new errors_1.NotFoundError('work_orders');
        const [pelanggan, kendaraan, mekanik, createdBy, items, stages, photos, pembayaranRows, garansi] = await Promise.all([
            db_1.default.queryOne('SELECT * FROM pelanggan WHERE id = ?', [spk.pelangganId]),
            spk.kendaraanId ? db_1.default.queryOne('SELECT * FROM kendaraan WHERE id = ?', [spk.kendaraanId]) : null,
            spk.mekanikId ? db_1.default.queryOne('SELECT * FROM mekanik WHERE id = ?', [spk.mekanikId]) : null,
            spk.createdById ? db_1.default.queryOne('SELECT id, name FROM users WHERE id = ?', [spk.createdById]) : null,
            db_1.default.query('SELECT i.*, sp.name AS spName, sp.kode AS spKode, j.name AS jName FROM wo_items i LEFT JOIN sparepart sp ON sp.id = i.sparepartId LEFT JOIN jasa j ON j.id = i.jasaId WHERE i.woId = ?', [id]),
            db_1.default.query('SELECT * FROM wo_stages WHERE woId = ? ORDER BY urutan ASC', [id]),
            db_1.default.query('SELECT * FROM wo_photos WHERE woId = ? ORDER BY createdAt DESC', [id]),
            db_1.default.query('SELECT * FROM pembayaran WHERE woId = ?', [id]),
            db_1.default.query('SELECT * FROM garansi WHERE woId = ?', [id]),
        ]);
        // Attach sparepart/jasa objects on items
        const enrichedItems = items.map((i) => ({
            ...i,
            sparepart: i.sparepartId ? { id: i.sparepartId, name: i.spName, kode: i.spKode } : null,
            jasa: i.jasaId ? { id: i.jasaId, name: i.jName } : null,
        }));
        // Fetch pembayaran details
        const pbIds = pembayaranRows.map((p) => p.id);
        const pbDetails = pbIds.length ? await db_1.default.query('SELECT * FROM pembayaran_detail WHERE pembayaranId IN (?) ORDER BY tanggal DESC', [pbIds]) : [];
        const detMap = new Map();
        for (const d of pbDetails) {
            if (!detMap.has(d.pembayaranId))
                detMap.set(d.pembayaranId, []);
            detMap.get(d.pembayaranId).push(d);
        }
        const pembayaran = pembayaranRows.map((p) => ({ ...p, detail: detMap.get(p.id) || [] }));
        spk.pelanggan = pelanggan;
        spk.kendaraan = kendaraan;
        spk.mekanik = mekanik;
        spk.createdBy = createdBy;
        spk.items = enrichedItems;
        spk.stages = stages;
        spk.photos = photos;
        spk.pembayaran = pembayaran;
        spk.garansi = garansi;
        return spk;
    }
    async create(input, userId) {
        // Hitung total dari items + stages (modifikasi/bubut bisa punya keduanya)
        let totalHarga = 0;
        if (input.items?.length) {
            totalHarga += input.items.reduce((sum, item) => sum + (item.hargaSatuan * item.qty), 0);
        }
        if (input.stages?.length) {
            totalHarga += input.stages.reduce((sum, stage) => sum + stage.estimasiBiaya, 0);
        }
        const minimumDp = await calcMinimumDp(input.mode, totalHarga);
        // ETA: hitung estimasi selesai dari total durasi tahapan
        let estimasiSelesai = null;
        if (input.stages?.length) {
            const totalDays = input.stages.reduce((sum, s) => sum + s.durasiHari, 0);
            estimasiSelesai = new Date();
            estimasiSelesai.setDate(estimasiSelesai.getDate() + totalDays);
        }
        // Diskon
        const diskon = input.diskon ?? 0;
        // Semua operasi dalam satu transaksi untuk menjaga data konsisten
        const spk = await db_1.default.transaction(async (tx) => {
            const noWo = (0, utils_1.generateWoNo)();
            const itemsToCreate = [];
            const logsToCreate = [];
            if (input.items?.length) {
                for (const item of input.items) {
                    let hpp = 0;
                    if (item.type === 'jasa' && item.jasaId) {
                        const j = await tx.queryOne('SELECT hargaModal FROM jasa WHERE id = ?', [item.jasaId]);
                        hpp = Number(j?.hargaModal || 0);
                    }
                    if (item.type === 'sparepart' && item.sparepartId) {
                        const sp = await tx.queryOne('SELECT stok, name, hargaBeli FROM sparepart WHERE id = ? FOR UPDATE', [item.sparepartId]);
                        if (!sp)
                            throw new errors_1.BadRequestError(`Sparepart ID ${item.sparepartId} tidak ditemukan`);
                        if (sp.stok < item.qty) {
                            throw new errors_1.BadRequestError(`Stok "${sp.name}" tidak mencukupi (tersisa ${sp.stok}, butuh ${item.qty})`);
                        }
                        hpp = Number(sp.hargaBeli) || 0;
                        const r = await tx.execute('UPDATE sparepart SET stok = stok - ? WHERE id = ? AND stok >= ?', [item.qty, item.sparepartId, item.qty]);
                        if (r.affectedRows === 0) {
                            throw new errors_1.BadRequestError(`Stok "${sp.name}" tidak mencukupi saat proses simultan`);
                        }
                        logsToCreate.push({ sparepartId: item.sparepartId, type: 'keluar', qty: item.qty, keterangan: `Dipakai WO ${noWo}` });
                    }
                    itemsToCreate.push({
                        type: item.type, sparepartId: item.sparepartId || null, jasaId: item.jasaId || null,
                        nama: item.nama, qty: item.qty, hargaModal: hpp, hargaSatuan: item.hargaSatuan, subtotal: item.hargaSatuan * item.qty,
                    });
                }
            }
            const now = new Date();
            const woId = await tx.insert('work_orders', {
                noWo, pelangganId: input.pelangganId, kendaraanId: input.kendaraanId || null,
                mekanikId: input.mekanikId || null, createdById: userId, mode: input.mode,
                keluhan: input.keluhan, judulProyek: input.judulProyek, spesifikasi: input.spesifikasi,
                totalHarga, minimumDp, diskon, estimasiSelesai, prioritas: input.prioritas || 'normal', catatan: input.catatan,
                createdAt: now, updatedAt: now,
            });
            for (const it of itemsToCreate) {
                await tx.insert('wo_items', { woId, ...it });
            }
            if (input.stages?.length) {
                for (let i = 0; i < input.stages.length; i++) {
                    const stage = input.stages[i];
                    await tx.insert('wo_stages', { woId, urutan: i + 1, nama: stage.nama, estimasiBiaya: stage.estimasiBiaya, durasiHari: stage.durasiHari });
                }
            }
            for (const log of logsToCreate) {
                await tx.insert('inventaris_log', log);
            }
            await tx.update('pelanggan', { lastVisit: new Date() }, 'id = ?', [input.pelangganId]);
            if (input.kendaraanId && typeof input.odometerMasuk === 'number') {
                await tx.execute('UPDATE kendaraan SET odometer = ? WHERE id = ? AND (odometer IS NULL OR odometer < ?)', [input.odometerMasuk, input.kendaraanId, input.odometerMasuk]);
            }
            const jatuhTempo = new Date();
            jatuhTempo.setDate(jatuhTempo.getDate() + 30);
            const pin = String((0, crypto_1.randomInt)(0, 1000000)).padStart(6, '0');
            await tx.insert('pembayaran', {
                noInvoice: (0, utils_1.generateInvoiceNo)(), woId, totalTagihan: Math.max(0, totalHarga - diskon),
                sisaBayar: Math.max(0, totalHarga - diskon), jatuhTempo,
                createdAt: now, updatedAt: now, publicId: (0, crypto_1.randomUUID)(), accessPin: pin,
            });
            await tx.insert('activity_logs', {
                userId, action: 'create', module: 'work_orders', targetId: woId, targetName: noWo,
                detail: JSON.stringify({ mode: input.mode, totalHarga, pelangganId: input.pelangganId }),
            });
            return { woId, noWo };
        });
        eventEmitter_1.appEventEmitter.emit('wo:created', { woId: spk.woId, noWo: spk.noWo });
        return this.findById(spk.woId);
    }
    async updateStatus(id, input, userId) {
        const spk = await db_1.default.queryOne('SELECT * FROM work_orders WHERE id = ?', [id]);
        if (!spk)
            throw new errors_1.NotFoundError('work_orders');
        // Validasi transisi status yang masuk akal
        const validTransitions = {
            antri: ['dikerjakan', 'dibatalkan'],
            dikerjakan: ['kendala', 'selesai', 'dibatalkan'],
            kendala: ['dikerjakan', 'dibatalkan'],
            selesai: ['dikerjakan'], // Mengizinkan rollback apabila salah klik selesai
            dibatalkan: [],
        };
        const allowed = validTransitions[spk.status] ?? [];
        if (!allowed.includes(input.status)) {
            throw new errors_1.BadRequestError(`Tidak bisa mengubah status dari "${spk.status}" ke "${input.status}"`);
        }
        // C1: Tidak bisa dikerjakan tanpa mekanik
        if (input.status === 'dikerjakan' && !spk.mekanikId) {
            throw new errors_1.BadRequestError('Assign mekanik terlebih dahulu sebelum memulai pengerjaan');
        }
        // C2: Status 'kendala' wajib catatan (audit trail)
        if (input.status === 'kendala' && !input.catatan?.trim()) {
            throw new errors_1.BadRequestError('Catatan/alasan kendala wajib diisi agar bisa ditelusuri.');
        }
        // DP Hard-Lock: SPK modifikasi/bubut wajib DP minimum sebelum dikerjakan
        if (input.status === 'dikerjakan' && ['modifikasi', 'bubut'].includes(spk.mode)) {
            const minDp = Number(spk.minimumDp);
            const paid = Number(spk.totalBayar);
            if (minDp > 0 && paid < minDp) {
                throw new errors_1.BadRequestError(`WO ${spk.mode} memerlukan DP minimal Rp ${minDp.toLocaleString('id-ID')} sebelum mulai dikerjakan. Saat ini baru terbayar Rp ${paid.toLocaleString('id-ID')} (kurang Rp ${(minDp - paid).toLocaleString('id-ID')}).`);
            }
        }
        await db_1.default.transaction(async (tx) => {
            const updateData = {
                status: input.status,
                catatan: input.catatan !== undefined ? input.catatan : spk.catatan,
            };
            if (input.progress !== undefined)
                updateData.progress = input.progress;
            if (input.status === 'dikerjakan' && !spk.startedAt)
                updateData.startedAt = new Date();
            if (input.status === 'selesai') {
                updateData.completedAt = new Date();
                updateData.progress = 100;
            }
            // Update status mekanik
            if (spk.mekanikId) {
                if (input.status === 'dikerjakan') {
                    await tx.update('mekanik', { status: 'busy' }, 'id = ?', [spk.mekanikId]);
                }
                else if (input.status === 'selesai' || input.status === 'dibatalkan') {
                    const activeSpks = await tx.queryVal("SELECT COUNT(*) FROM work_orders WHERE mekanikId = ? AND status = 'dikerjakan' AND id != ?", [spk.mekanikId, id]);
                    if (activeSpks === 0) {
                        await tx.update('mekanik', { status: 'available' }, 'id = ?', [spk.mekanikId]);
                    }
                }
            }
            // Aksi saat SPK dibatalkan: Kembalikan stok sparepart
            if (spk.status !== 'dibatalkan' && input.status === 'dibatalkan') {
                const paid = await tx.queryOne('SELECT * FROM pembayaran WHERE woId = ? AND totalBayar > 0 LIMIT 1', [id]);
                if (paid) {
                    throw new errors_1.BadRequestError(`SPK tidak dapat dibatalkan karena sudah ada pembayaran masuk (Invoice ${paid.noInvoice}). Lakukan refund di modul Kasir terlebih dahulu.`);
                }
                const items = await tx.query("SELECT sparepartId, qty FROM wo_items WHERE woId = ? AND type = 'sparepart'", [id]);
                for (const item of items) {
                    if (item.sparepartId) {
                        await tx.execute('UPDATE sparepart SET stok = stok + ? WHERE id = ?', [item.qty, item.sparepartId]);
                        await tx.insert('inventaris_log', {
                            sparepartId: item.sparepartId, type: 'masuk', qty: item.qty,
                            keterangan: `Stok dikembalikan dari pembatalan WO ${spk.noWo}`,
                        });
                    }
                }
            }
            // Aksi Rollback saat SPK dibatalkan kesalahannya (selesai -> dikerjakan)
            if (spk.status === 'selesai' && input.status === 'dikerjakan') {
                const pembayaranAktif = await tx.queryOne('SELECT * FROM pembayaran WHERE woId = ? LIMIT 1', [id]);
                if (pembayaranAktif && pembayaranAktif.status === 'lunas') {
                    throw new errors_1.BadRequestError('Work Order yang tagihannya sudah lunas tidak dapat ditarik kembali/rollback ke dikerjakan. (Silahkan batalkan lunas di Kasir jika perlu).');
                }
                updateData.completedAt = null;
                // NOTE: Pembatalan Garansi dan Penghapusan Poin Loyalty kini ditangani oleh endpoint Pembayaran
                // jika terjadi rollback/refund dana lunas. Rolback SPK hanya mengunci ulang mekanik.
                // 4. Update status & counter mekanik
                if (spk.mekanikId) {
                    await tx.execute('UPDATE mekanik SET totalSpk = GREATEST(0, totalSpk - 1), status = ? WHERE id = ?', ['busy', spk.mekanikId]);
                }
            }
            // Aksi saat SPK selesai (Hanya Update Counter Mekanik & Gate Pass jika Lunas bayar di awal)
            if (input.status === 'selesai') {
                const pembayaranAktif = await tx.queryOne('SELECT * FROM pembayaran WHERE woId = ? LIMIT 1', [id]);
                // Gate-pass: Jika ternyata sudah bayar LUNAS sebelumnya, maka rilis Garansi & Point saat 'Selesai' ditekan.
                if (pembayaranAktif && pembayaranAktif.status === 'lunas') {
                    await (0, gate_pass_1.releaseGatePass)(tx, id);
                }
                // Update totalSpk mekanik
                if (spk.mekanikId) {
                    await tx.execute('UPDATE mekanik SET totalSpk = totalSpk + 1 WHERE id = ?', [spk.mekanikId]);
                }
                // Set reminder servis berikutnya (rutin): +6 bulan atau +5000 km dari odometer saat ini
                if (spk.kendaraanId && spk.mode === 'rutin') {
                    const ken = await tx.queryOne('SELECT odometer FROM kendaraan WHERE id = ?', [spk.kendaraanId]);
                    const nextDate = new Date();
                    nextDate.setMonth(nextDate.getMonth() + 6);
                    const nextKm = ken?.odometer ? ken.odometer + 5000 : null;
                    const kUpdateData = { nextServiceDate: nextDate };
                    if (nextKm)
                        kUpdateData.nextServiceKm = nextKm;
                    await tx.update('kendaraan', kUpdateData, 'id = ?', [spk.kendaraanId]);
                }
            }
            // Update SPK
            await tx.update('work_orders', updateData, 'id = ?', [id]);
            // Catat activity log
            await tx.insert('activity_logs', {
                userId: userId ?? null, action: 'update', module: 'work_orders',
                targetId: id, targetName: spk.noWo,
                detail: JSON.stringify({ oldStatus: spk.status, newStatus: input.status, progress: input.progress }),
            });
        });
        // Gunakan appEventEmitter agar dilanjutkan ke WA dan SSE melalui listener
        if (input.status === 'selesai') {
            const pembayaran = await db_1.default.queryOne('SELECT status, noInvoice FROM pembayaran WHERE woId = ? LIMIT 1', [id]);
            const lunas = pembayaran?.status === 'lunas';
            eventEmitter_1.appEventEmitter.emit('wo:selesai', { woId: id, noWo: spk.noWo, status: input.status, isLunas: lunas, noInvoice: pembayaran?.noInvoice });
        }
        else if (input.status === 'kendala') {
            eventEmitter_1.appEventEmitter.emit('wo:kendala', { woId: id, noWo: spk.noWo, status: input.status });
        }
        else if (input.status === 'dibatalkan') {
            eventEmitter_1.appEventEmitter.emit('wo:dibatalkan', { woId: id, noWo: spk.noWo, status: input.status });
        }
        else {
            eventEmitter_1.appEventEmitter.emit('wo:updated', { woId: id, noWo: spk.noWo, status: input.status });
        }
        // Return data terbaru
        return this.findById(id);
    }
    async updateProgress(id, progress, userId) {
        const spk = await db_1.default.queryOne('SELECT * FROM work_orders WHERE id = ?', [id]);
        if (!spk)
            throw new errors_1.NotFoundError('work_orders');
        if (spk.status === 'selesai' || spk.status === 'dibatalkan') {
            throw new errors_1.BadRequestError('Tidak bisa update progres SPK yang sudah selesai/dibatalkan');
        }
        await db_1.default.transaction(async (tx) => {
            await tx.update('work_orders', { progress }, 'id = ?', [id]);
            await tx.insert('activity_logs', {
                userId: userId ?? null, action: 'update', module: 'work_orders',
                targetId: id, targetName: spk.noWo, detail: JSON.stringify({ progress }),
            });
        });
        eventEmitter_1.appEventEmitter.emit('wo:progress', { woId: id, progress });
        return this.findById(id);
    }
    async delete(id, userId) {
        const spk = await db_1.default.queryOne('SELECT * FROM work_orders WHERE id = ?', [id]);
        if (!spk)
            throw new errors_1.NotFoundError('work_orders');
        if (spk.status === 'selesai') {
            throw new errors_1.BadRequestError('Work Order yang sudah selesai tidak dapat dihapus');
        }
        const pembayaranRows = await db_1.default.query('SELECT id, totalBayar FROM pembayaran WHERE woId = ?', [id]);
        const hasUangMasuk = pembayaranRows.some((p) => Number(p.totalBayar) > 0);
        if (hasUangMasuk) {
            throw new errors_1.BadRequestError('Work Order yang sudah menerima transaksi pembayaran tidak dapat dihapus!');
        }
        await db_1.default.transaction(async (tx) => {
            if (spk.status !== 'dibatalkan') {
                const items = await tx.query('SELECT type, sparepartId, qty FROM wo_items WHERE woId = ?', [id]);
                for (const item of items) {
                    if (item.type === 'sparepart' && item.sparepartId) {
                        const sp = await tx.queryOne('SELECT id FROM sparepart WHERE id = ?', [item.sparepartId]);
                        if (sp) {
                            await tx.execute('UPDATE sparepart SET stok = stok + ? WHERE id = ?', [item.qty, item.sparepartId]);
                            await tx.insert('inventaris_log', {
                                sparepartId: item.sparepartId, type: 'masuk', qty: item.qty,
                                keterangan: `Stok dikembalikan dari penghapusan WO ${spk.noWo}`,
                            });
                        }
                    }
                }
            }
            await tx.execute('DELETE FROM pembayaran WHERE woId = ?', [id]);
            await tx.update('work_orders', {
                deletedAt: new Date(),
                status: spk.status === 'dibatalkan' ? spk.status : 'dibatalkan',
            }, 'id = ?', [id]);
            await tx.insert('activity_logs', {
                userId: userId ?? null, action: 'soft_delete', module: 'work_orders',
                targetId: id, targetName: spk.noWo,
                detail: JSON.stringify({ previousStatus: spk.status }),
            });
        });
        return { message: `WO ${spk.noWo} berhasil dihapus (soft delete — histori tetap tersimpan)` };
    }
    /** Restore SPK dari soft delete (admin only) */
    async restore(id, userId) {
        const spk = await db_1.default.queryOne('SELECT * FROM work_orders WHERE id = ?', [id]);
        if (!spk)
            throw new errors_1.NotFoundError('work_orders');
        if (!spk.deletedAt)
            throw new errors_1.BadRequestError('Work Order ini tidak dalam status terhapus');
        await db_1.default.transaction(async (tx) => {
            await tx.update('work_orders', { deletedAt: null }, 'id = ?', [id]);
            await tx.insert('activity_logs', {
                userId: userId ?? null, action: 'restore', module: 'work_orders',
                targetId: id, targetName: spk.noWo,
                detail: JSON.stringify({ status: spk.status }),
            });
        });
        return { message: `WO ${spk.noWo} berhasil dipulihkan` };
    }
    // ============================================================
    // MANAJEMEN ITEM SPK (Tambah/Hapus/Edit saat dikerjakan)
    // ============================================================
    /** Hitung ulang totalHarga dan minimumDp SPK dari semua items atau stages */
    async recalcTotalHarga(tx, woId) {
        const [itemsRow, stagesRow, spkData] = await Promise.all([
            tx.queryOne('SELECT COALESCE(SUM(subtotal),0) AS t FROM wo_items WHERE woId = ?', [woId]),
            tx.queryOne('SELECT COALESCE(SUM(estimasiBiaya),0) AS t FROM wo_stages WHERE woId = ?', [woId]),
            tx.queryOne('SELECT mode, diskon FROM work_orders WHERE id = ?', [woId]),
        ]);
        const totalHarga = Number(itemsRow?.t || 0) + Number(stagesRow?.t || 0);
        const minimumDp = await calcMinimumDp(spkData?.mode || '', totalHarga);
        await tx.update('work_orders', { totalHarga, minimumDp }, 'id = ?', [woId]);
        // Sinkronisasi otomatis ke Modul Pembayaran
        const pembayaran = await tx.queryOne('SELECT * FROM pembayaran WHERE woId = ? LIMIT 1', [woId]);
        if (pembayaran) {
            const diskon = Number(spkData?.diskon ?? 0);
            const totalTagihan = Math.max(0, totalHarga - diskon);
            const sisaBayar = totalTagihan - Number(pembayaran.totalBayar);
            await tx.update('pembayaran', {
                totalTagihan,
                sisaBayar: Math.max(0, sisaBayar),
                status: sisaBayar <= 0 ? 'lunas' : (Number(pembayaran.totalBayar) > 0 ? 'parsial' : 'belum_bayar'),
            }, 'id = ?', [pembayaran.id]);
        }
        return totalHarga;
    }
    /** Hitung ulang progress SPK otomatis dari status checklist */
    async recalcProgress(tx, woId) {
        const spkData = await tx.queryOne('SELECT progress, status FROM work_orders WHERE id = ?', [woId]);
        if (!spkData)
            return 0;
        const [stages, items] = await Promise.all([
            tx.query('SELECT status FROM wo_stages WHERE woId = ?', [woId]),
            tx.query('SELECT status FROM wo_items WHERE woId = ?', [woId]),
        ]);
        let progress = spkData.progress;
        if (stages.length > 0) {
            const doneStages = stages.filter((s) => s.status === 'done').length;
            progress = Math.round((doneStages / stages.length) * 100);
        }
        else if (items.length > 0) {
            const doneItems = items.filter((i) => i.status === 'done').length;
            progress = Math.round((doneItems / items.length) * 100);
        }
        if (spkData.status !== 'selesai' && spkData.status !== 'dibatalkan') {
            await tx.update('work_orders', { progress }, 'id = ?', [woId]);
        }
        return progress;
    }
    // ── Tambah foto/gambar SPK (referensi/progress/lampiran) ──────
    async addPhoto(woId, input) {
        const spk = await db_1.default.queryOne('SELECT id, status FROM work_orders WHERE id = ?', [woId]);
        if (!spk)
            throw new errors_1.NotFoundError('work_orders');
        if (spk.status === 'dibatalkan')
            throw new errors_1.BadRequestError('Tidak bisa upload foto pada SPK yang sudah dibatalkan');
        const photoId = await db_1.default.insert('wo_photos', {
            woId, url: input.url, caption: input.caption || null, type: input.type || 'lampiran',
        });
        return db_1.default.queryOne('SELECT * FROM wo_photos WHERE id = ?', [photoId]);
    }
    // ── Stats ringkas untuk widget header list ────────────────────
    async stats() {
        const [antri, dikerjakan, kendala, overdue, pendingPayment] = await Promise.all([
            db_1.default.queryVal("SELECT COUNT(*) FROM work_orders WHERE status = 'antri' AND deletedAt IS NULL"),
            db_1.default.queryVal("SELECT COUNT(*) FROM work_orders WHERE status = 'dikerjakan' AND deletedAt IS NULL"),
            db_1.default.queryVal("SELECT COUNT(*) FROM work_orders WHERE status = 'kendala' AND deletedAt IS NULL"),
            db_1.default.queryVal("SELECT COUNT(*) FROM work_orders WHERE estimasiSelesai IS NOT NULL AND estimasiSelesai < NOW() AND status IN ('antri','dikerjakan','kendala') AND deletedAt IS NULL"),
            db_1.default.queryVal("SELECT COUNT(*) FROM pembayaran WHERE status IN ('belum','parsial')"),
        ]);
        return { antri, dikerjakan, kendala, overdue, pendingPayment };
    }
    // ── Analytics: breakdown per mode + top sparepart + performa mekanik ──
    async analytics(query) {
        const dateConds = [];
        const dateParams = [];
        if (query.dateFrom) {
            dateConds.push('s.createdAt >= ?');
            dateParams.push(new Date(query.dateFrom));
        }
        if (query.dateTo) {
            const end = new Date(query.dateTo);
            end.setHours(23, 59, 59, 999);
            dateConds.push('s.createdAt <= ?');
            dateParams.push(end);
        }
        const dateWhere = dateConds.length ? ' AND ' + dateConds.join(' AND ') : '';
        // 1. Breakdown per mode (count + omzet)
        const modeBreakdown = await db_1.default.query(`SELECT mode, status, COUNT(*) AS cnt, COALESCE(SUM(totalHarga),0) AS sumHarga, COALESCE(SUM(totalBayar),0) AS sumBayar
       FROM work_orders s WHERE s.deletedAt IS NULL ${dateWhere} GROUP BY mode, status`, dateParams);
        // 2. Total omzet per mode
        const omzetPerMode = {
            rutin: { count: 0, omzet: 0, outstanding: 0 },
            modifikasi: { count: 0, omzet: 0, outstanding: 0 },
            bubut: { count: 0, omzet: 0, outstanding: 0 },
        };
        for (const row of modeBreakdown) {
            const m = row.mode;
            if (!omzetPerMode[m])
                omzetPerMode[m] = { count: 0, omzet: 0, outstanding: 0 };
            omzetPerMode[m].count += Number(row.cnt);
            if (row.status === 'selesai') {
                omzetPerMode[m].omzet += Number(row.sumHarga);
            }
            else if (['antri', 'dikerjakan', 'kendala'].includes(row.status)) {
                omzetPerMode[m].outstanding += Math.max(0, Number(row.sumHarga) - Number(row.sumBayar));
            }
        }
        // 3. Top 10 sparepart paling sering dipakai
        const topSparepart = await db_1.default.query(`SELECT i.sparepartId, i.nama, SUM(i.qty) AS totalQty, SUM(i.subtotal) AS totalRevenue
       FROM wo_items i JOIN work_orders s ON s.id = i.woId
       WHERE i.type = 'sparepart' AND i.sparepartId IS NOT NULL AND s.status != 'dibatalkan' AND s.deletedAt IS NULL ${dateWhere.replace(/s\./g, 's.')}
       GROUP BY i.sparepartId, i.nama ORDER BY totalQty DESC LIMIT 10`, dateParams);
        // 4. Performa mekanik (top 10 berdasarkan SPK selesai)
        const mekanikPerf = await db_1.default.query(`SELECT s.mekanikId, COUNT(*) AS spkSelesai, SUM(s.totalHarga) AS totalRevenue
       FROM work_orders s WHERE s.status = 'selesai' AND s.mekanikId IS NOT NULL AND s.deletedAt IS NULL ${dateWhere}
       GROUP BY s.mekanikId ORDER BY spkSelesai DESC LIMIT 10`, dateParams);
        const mekanikIds = mekanikPerf.map((r) => r.mekanikId);
        const mekanikList = mekanikIds.length > 0 ? await db_1.default.query('SELECT id, name, initial FROM mekanik WHERE id IN (?)', [mekanikIds]) : [];
        const mekanikMap = {};
        for (const m of mekanikList)
            mekanikMap[m.id] = m;
        const performa = mekanikPerf.map((r) => ({
            mekanikId: r.mekanikId,
            nama: mekanikMap[r.mekanikId]?.name ?? '—',
            initial: mekanikMap[r.mekanikId]?.initial ?? '',
            spkSelesai: Number(r.spkSelesai),
            totalRevenue: Number(r.totalRevenue),
        }));
        // 5. Trend bulanan (12 bulan terakhir)
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
        twelveMonthsAgo.setDate(1);
        twelveMonthsAgo.setHours(0, 0, 0, 0);
        const trendRows = await db_1.default.query(`SELECT DATE_FORMAT(createdAt, '%Y-%m-01') AS month, COUNT(*) AS total,
              COALESCE(SUM(CASE WHEN status = 'selesai' THEN totalHarga ELSE 0 END), 0) AS revenue
       FROM work_orders WHERE createdAt >= ? AND deletedAt IS NULL
       GROUP BY DATE_FORMAT(createdAt, '%Y-%m-01') ORDER BY month ASC`, [twelveMonthsAgo]);
        const trend = trendRows.map((r) => ({
            month: typeof r.month === 'string' ? r.month : new Date(r.month).toISOString().slice(0, 10),
            total: Number(r.total),
            revenue: Number(r.revenue),
        }));
        return { omzetPerMode, topSparepart, performa, trend };
    }
    // ── Edit SPK: field non-finansial ─────────────────────────────
    async update(id, input, userId) {
        const spk = await db_1.default.queryOne('SELECT * FROM work_orders WHERE id = ?', [id]);
        if (!spk)
            throw new errors_1.NotFoundError('work_orders');
        if (spk.status === 'selesai' || spk.status === 'dibatalkan') {
            throw new errors_1.BadRequestError(`Tidak bisa mengedit SPK yang sudah ${spk.status}`);
        }
        const data = {};
        if (input.keluhan !== undefined)
            data.keluhan = input.keluhan;
        if (input.judulProyek !== undefined)
            data.judulProyek = input.judulProyek;
        if (input.spesifikasi !== undefined)
            data.spesifikasi = input.spesifikasi;
        if (input.prioritas !== undefined)
            data.prioritas = input.prioritas;
        if (input.catatan !== undefined)
            data.catatan = input.catatan;
        if (input.mekanikId !== undefined)
            data.mekanikId = input.mekanikId;
        if (input.estimasiSelesai !== undefined) {
            data.estimasiSelesai = input.estimasiSelesai ? new Date(input.estimasiSelesai) : null;
        }
        await db_1.default.update('work_orders', data, 'id = ?', [id]);
        await db_1.default.insert('activity_logs', {
            userId: userId ?? null, action: 'update', module: 'work_orders',
            targetId: id, targetName: spk.noWo,
            detail: JSON.stringify({ fields: Object.keys(data) }),
        });
        return this.findById(id);
    }
    // ── Assign / Ganti Mekanik ────────────────────────────────────
    async assignMekanik(id, mekanikId, userId) {
        const spk = await db_1.default.queryOne('SELECT * FROM work_orders WHERE id = ?', [id]);
        if (!spk)
            throw new errors_1.NotFoundError('work_orders');
        if (spk.status === 'selesai' || spk.status === 'dibatalkan') {
            throw new errors_1.BadRequestError(`Tidak bisa mengubah mekanik pada SPK yang sudah ${spk.status}`);
        }
        if (mekanikId) {
            const m = await db_1.default.queryOne('SELECT id FROM mekanik WHERE id = ?', [mekanikId]);
            if (!m)
                throw new errors_1.NotFoundError('Mekanik');
        }
        await db_1.default.transaction(async (tx) => {
            if (spk.mekanikId && spk.mekanikId !== mekanikId && spk.status === 'dikerjakan') {
                const activeSpks = await tx.queryVal("SELECT COUNT(*) FROM work_orders WHERE mekanikId = ? AND status = 'dikerjakan' AND id != ?", [spk.mekanikId, id]);
                if (activeSpks === 0) {
                    await tx.update('mekanik', { status: 'available' }, 'id = ?', [spk.mekanikId]);
                }
            }
            if (mekanikId && spk.status === 'dikerjakan') {
                await tx.update('mekanik', { status: 'busy' }, 'id = ?', [mekanikId]);
            }
            await tx.update('work_orders', { mekanikId }, 'id = ?', [id]);
        });
        await db_1.default.insert('activity_logs', {
            userId: userId ?? null, action: 'assign_mekanik', module: 'work_orders',
            targetId: id, targetName: spk.noWo,
            detail: JSON.stringify({ from: spk.mekanikId, to: mekanikId }),
        });
        return this.findById(id);
    }
}
exports.WoService = WoService;
exports.woService = new WoService();
//# sourceMappingURL=wo.service.js.map