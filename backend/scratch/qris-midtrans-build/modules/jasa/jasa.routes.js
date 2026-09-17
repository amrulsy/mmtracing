"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = __importDefault(require("../../config/db"));
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const utils_1 = require("../../shared/utils");
const errors_1 = require("../../shared/errors");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
const sparepartBundleSchema = zod_1.z.object({
    sparepartId: zod_1.z.number().int().positive(),
    qtyDefault: zod_1.z.number().int().positive().default(1),
});
const createSchema = zod_1.z.object({
    kode: zod_1.z.string().min(1).optional(),
    name: zod_1.z.string().min(1),
    kategori: zod_1.z.string().optional(),
    harga: zod_1.z.number().min(0),
    hargaModal: zod_1.z.number().min(0).default(0),
    estimasiWaktu: zod_1.z.string().optional(),
    garansiHari: zod_1.z.number().int().default(30),
    sparepartBundles: zod_1.z.array(sparepartBundleSchema).optional(),
});
const updateSchema = zod_1.z.object({
    kode: zod_1.z.string().min(1).optional(),
    name: zod_1.z.string().min(1).optional(),
    kategori: zod_1.z.string().optional(),
    harga: zod_1.z.number().min(0).optional(),
    hargaModal: zod_1.z.number().min(0).optional(),
    estimasiWaktu: zod_1.z.string().optional(),
    garansiHari: zod_1.z.number().int().optional(),
    sparepartBundles: zod_1.z.array(sparepartBundleSchema).optional(),
});
// GET /jasa — list all with pagination
router.get('/', async (req, res, next) => {
    try {
        const { page, limit, skip } = (0, utils_1.parsePagination)(req.query);
        const { search, kategori } = req.query;
        const conds = [];
        const params = [];
        if (search) {
            conds.push('(j.name LIKE ? OR j.kode LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }
        if (kategori) {
            conds.push('j.kategori = ?');
            params.push(kategori);
        }
        const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
        const [rows, totalRow] = await Promise.all([
            db_1.default.query(`SELECT j.* FROM jasa j ${where} ORDER BY j.name ASC LIMIT ? OFFSET ?`, [...params, limit, skip]),
            db_1.default.queryOne(`SELECT COUNT(*) AS c FROM jasa j ${where}`, params),
        ]);
        // Attach sparepartBundles
        if (rows.length) {
            const ids = rows.map((r) => r.id);
            const bundles = await db_1.default.query(`SELECT js.*, sp.id AS spId, sp.kode AS spKode, sp.name AS spName, sp.hargaJual AS spHargaJual, sp.stok AS spStok
         FROM jasa_sparepart js
         LEFT JOIN sparepart sp ON sp.id = js.sparepartId
         WHERE js.jasaId IN (?)`, [ids]);
            const bmap = new Map();
            for (const b of bundles) {
                if (!bmap.has(b.jasaId))
                    bmap.set(b.jasaId, []);
                bmap.get(b.jasaId).push({ ...b, sparepart: { id: b.spId, kode: b.spKode, name: b.spName, hargaJual: b.spHargaJual, stok: b.spStok } });
            }
            for (const r of rows)
                r.sparepartBundles = bmap.get(r.id) || [];
        }
        (0, utils_1.sendPaginated)(res, rows, totalRow?.c ?? 0, page, limit);
    }
    catch (e) {
        next(e);
    }
});
// GET /jasa/:id — detail by ID
router.get('/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const data = await db_1.default.queryOne('SELECT * FROM jasa WHERE id = ?', [id]);
        if (!data)
            throw new errors_1.NotFoundError('Jasa');
        const [bundles, spkItems] = await Promise.all([
            db_1.default.query(`SELECT js.*, sp.* FROM jasa_sparepart js
         LEFT JOIN sparepart sp ON sp.id = js.sparepartId
         WHERE js.jasaId = ?`, [id]),
            db_1.default.query(`SELECT si.*, s.id AS woId, s.noWo, s.status AS woStatus, s.tanggal AS spkTanggal
         FROM wo_items si
         LEFT JOIN work_orders s ON s.id = si.woId
         WHERE si.jasaId = ?
         ORDER BY si.createdAt DESC LIMIT 20`, [id]),
        ]);
        data.sparepartBundles = bundles.map((b) => ({ ...b, sparepart: b }));
        data.spkItems = spkItems.map((si) => ({ ...si, spk: { id: si.woId, noWo: si.noWo, status: si.woStatus, tanggal: si.spkTanggal } }));
        (0, utils_1.sendSuccess)(res, data);
    }
    catch (e) {
        next(e);
    }
});
// POST /jasa — create with optional sparepartBundles
router.post('/', (0, auth_1.requirePermission)('master', 'full'), (0, validate_1.validate)(createSchema), async (req, res, next) => {
    try {
        const { sparepartBundles, kode, ...jasaData } = req.body;
        const finalKode = kode || `JS-${Date.now().toString(36).toUpperCase().slice(-5)}`;
        const jasaId = await db_1.default.insert('jasa', { ...jasaData, kode: finalKode });
        if (sparepartBundles?.length) {
            for (const b of sparepartBundles) {
                await db_1.default.insert('jasa_sparepart', { jasaId, sparepartId: b.sparepartId, qtyDefault: b.qtyDefault ?? 1 });
            }
        }
        const data = await db_1.default.queryOne('SELECT * FROM jasa WHERE id = ?', [jasaId]);
        await db_1.default.insert('activity_logs', {
            userId: req.user?.id ?? null,
            action: 'create', module: 'master',
            targetId: jasaId, targetName: jasaData.name,
        });
        (0, utils_1.sendCreated)(res, data, 'Jasa berhasil ditambahkan');
    }
    catch (e) {
        next(e);
    }
});
// PUT /jasa/:id — update with optional sparepartBundles sync
router.put('/:id', (0, auth_1.requirePermission)('master', 'full'), (0, validate_1.validate)(updateSchema), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const { sparepartBundles, ...jasaData } = req.body;
        await db_1.default.transaction(async (tx) => {
            if (Object.keys(jasaData).length > 0) {
                await tx.update('jasa', { ...jasaData, updatedAt: new Date() }, 'id = ?', [id]);
            }
            if (sparepartBundles !== undefined) {
                await tx.execute('DELETE FROM jasa_sparepart WHERE jasaId = ?', [id]);
                for (const b of sparepartBundles) {
                    await tx.insert('jasa_sparepart', { jasaId: id, sparepartId: b.sparepartId, qtyDefault: b.qtyDefault ?? 1 });
                }
            }
        });
        const data = await db_1.default.queryOne('SELECT * FROM jasa WHERE id = ?', [id]);
        await db_1.default.insert('activity_logs', {
            userId: req.user?.id ?? null,
            action: 'update', module: 'master',
            targetId: id, targetName: data?.name,
        });
        (0, utils_1.sendSuccess)(res, data, 'Jasa berhasil diperbarui');
    }
    catch (e) {
        next(e);
    }
});
// DELETE /jasa/:id — with protection
router.delete('/:id', (0, auth_1.requirePermission)('master', 'full'), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        // Cek apakah jasa masih dipakai di SPK
        const usedInSpk = await db_1.default.queryVal('SELECT COUNT(*) FROM wo_items WHERE jasaId = ?', [id]);
        if (usedInSpk > 0) {
            throw new errors_1.BadRequestError(`Jasa ini masih digunakan di ${usedInSpk} item SPK dan tidak dapat dihapus. Anda bisa menonaktifkan atau mengganti nama jasa ini.`);
        }
        const jasa = await db_1.default.queryOne('SELECT name FROM jasa WHERE id = ?', [id]);
        await db_1.default.transaction(async (tx) => {
            await tx.execute('DELETE FROM jasa_sparepart WHERE jasaId = ?', [id]);
            await tx.execute('DELETE FROM jasa WHERE id = ?', [id]);
            await tx.insert('activity_logs', {
                userId: req.user?.id ?? null,
                action: 'delete', module: 'master',
                targetId: id, targetName: jasa?.name,
            });
        });
        (0, utils_1.sendSuccess)(res, null, 'Jasa berhasil dihapus');
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=jasa.routes.js.map