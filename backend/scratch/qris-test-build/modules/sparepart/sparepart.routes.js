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
const cache_1 = require("../../shared/cache");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
const createSchema = zod_1.z.object({
    kode: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    merk: zod_1.z.string().optional(),
    kategoriId: zod_1.z.number().int().positive().optional(),
    supplierId: zod_1.z.number().int().positive().optional(),
    hargaBeli: zod_1.z.number().min(0),
    hargaJual: zod_1.z.number().min(0),
    stok: zod_1.z.number().int().min(0).default(0),
    stokMinimum: zod_1.z.number().int().min(0).default(5),
    satuan: zod_1.z.string().default('pcs'),
    lokasi: zod_1.z.string().optional(),
});
const updateSchema = zod_1.z.object({
    kode: zod_1.z.string().min(1).optional(),
    name: zod_1.z.string().min(1).optional(),
    merk: zod_1.z.string().optional(),
    kategoriId: zod_1.z.number().int().positive().optional(),
    supplierId: zod_1.z.number().int().positive().optional(),
    hargaBeli: zod_1.z.number().min(0).optional(),
    hargaJual: zod_1.z.number().min(0).optional(),
    stokMinimum: zod_1.z.number().int().min(0).optional(),
    satuan: zod_1.z.string().optional(),
    lokasi: zod_1.z.string().optional(),
});
router.get('/', async (req, res, next) => {
    try {
        const { page, limit, skip } = (0, utils_1.parsePagination)(req.query);
        const { search, kategoriId, lowStock } = req.query;
        const conds = [];
        const params = [];
        if (search) {
            conds.push('(sp.name LIKE ? OR sp.kode LIKE ? OR sp.merk LIKE ?)');
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (kategoriId) {
            conds.push('sp.kategoriId = ?');
            params.push(Number(kategoriId));
        }
        if (lowStock === 'true')
            conds.push('sp.stok > 0');
        const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
        const [data, totalRow] = await Promise.all([
            db_1.default.query(`SELECT sp.*, ks.id AS katId, ks.name AS katName,
                su.id AS supId, su.name AS supName
         FROM sparepart sp
         LEFT JOIN kategori_sparepart ks ON ks.id = sp.kategoriId
         LEFT JOIN supplier su ON su.id = sp.supplierId
         ${where} ORDER BY sp.name ASC LIMIT ? OFFSET ?`, [...params, limit, skip]),
            db_1.default.queryOne(`SELECT COUNT(*) AS c FROM sparepart sp ${where}`, params),
        ]);
        const rows = data.map((r) => ({ ...r, kategori: r.katId ? { id: r.katId, name: r.katName } : null, supplier: r.supId ? { id: r.supId, name: r.supName } : null }));
        (0, utils_1.sendPaginated)(res, rows, totalRow?.c ?? 0, page, limit);
    }
    catch (e) {
        next(e);
    }
});
router.get('/low-stock', async (_req, res, next) => {
    try {
        const data = await db_1.default.query('SELECT * FROM sparepart WHERE stok <= stokMinimum ORDER BY stok ASC');
        (0, utils_1.sendSuccess)(res, data);
    }
    catch (e) {
        next(e);
    }
});
router.get('/categories', async (_req, res, next) => {
    try {
        const data = await cache_1.appCache.getOrSet('sparepart:categories', () => db_1.default.query('SELECT * FROM kategori_sparepart ORDER BY name ASC'), cache_1.CACHE_TTL.LONG // 5 minutes
        );
        (0, utils_1.sendSuccess)(res, data);
    }
    catch (e) {
        next(e);
    }
});
router.post('/categories', (0, auth_1.requirePermission)('master', 'full'), async (req, res, next) => {
    try {
        const newId = await db_1.default.insert('kategori_sparepart', { name: req.body.name });
        const data = await db_1.default.queryOne('SELECT * FROM kategori_sparepart WHERE id = ?', [newId]);
        await db_1.default.insert('activity_logs', {
            userId: req.user?.id ?? null,
            action: 'create_kategori', module: 'master',
            targetId: newId, targetName: req.body.name,
        });
        cache_1.appCache.invalidate('sparepart:categories');
        (0, utils_1.sendCreated)(res, data);
    }
    catch (e) {
        next(e);
    }
});
router.put('/categories/:id', (0, auth_1.requirePermission)('master', 'full'), async (req, res, next) => {
    try {
        const katId = Number(req.params.id);
        await db_1.default.update('kategori_sparepart', { name: req.body.name }, 'id = ?', [katId]);
        const data = await db_1.default.queryOne('SELECT * FROM kategori_sparepart WHERE id = ?', [katId]);
        await db_1.default.insert('activity_logs', {
            userId: req.user?.id ?? null,
            action: 'update_kategori', module: 'master',
            targetId: katId, targetName: data?.name,
        });
        cache_1.appCache.invalidate('sparepart:categories');
        (0, utils_1.sendSuccess)(res, data, 'Kategori berhasil diperbarui');
    }
    catch (e) {
        next(e);
    }
});
router.delete('/categories/:id', (0, auth_1.requirePermission)('master', 'full'), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const kategori = await db_1.default.queryOne('SELECT name FROM kategori_sparepart WHERE id = ?', [id]);
        const inUse = await db_1.default.queryVal('SELECT COUNT(*) FROM sparepart WHERE kategoriId = ?', [id]);
        if (inUse > 0) {
            throw new errors_1.BadRequestError(`Kategori ini masih digunakan oleh ${inUse} sparepart dan tidak dapat dihapus.`);
        }
        await db_1.default.execute('DELETE FROM kategori_sparepart WHERE id = ?', [id]);
        await db_1.default.insert('activity_logs', {
            userId: req.user?.id ?? null,
            action: 'delete_kategori', module: 'master',
            targetId: id, targetName: kategori?.name,
        });
        cache_1.appCache.invalidate('sparepart:categories');
        (0, utils_1.sendSuccess)(res, null, 'Kategori berhasil dihapus');
    }
    catch (e) {
        next(e);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const spId = Number(req.params.id);
        const data = await db_1.default.queryOne('SELECT * FROM sparepart WHERE id = ?', [spId]);
        if (!data)
            throw new errors_1.NotFoundError('Sparepart');
        const [kategori, supplier, logs] = await Promise.all([
            data.kategoriId ? db_1.default.queryOne('SELECT * FROM kategori_sparepart WHERE id = ?', [data.kategoriId]) : null,
            data.supplierId ? db_1.default.queryOne('SELECT * FROM supplier WHERE id = ?', [data.supplierId]) : null,
            db_1.default.query('SELECT * FROM inventaris_log WHERE sparepartId = ? ORDER BY createdAt DESC LIMIT 20', [spId]),
        ]);
        data.kategori = kategori;
        data.supplier = supplier;
        data.inventarisLog = logs;
        (0, utils_1.sendSuccess)(res, data);
    }
    catch (e) {
        next(e);
    }
});
router.post('/', (0, auth_1.requirePermission)('master', 'full'), (0, validate_1.validate)(createSchema), async (req, res, next) => {
    try {
        const newId = await db_1.default.insert('sparepart', req.body);
        const data = await db_1.default.queryOne('SELECT * FROM sparepart WHERE id = ?', [newId]);
        await db_1.default.insert('activity_logs', {
            userId: req.user?.id ?? null,
            action: 'create', module: 'master',
            targetId: newId, targetName: req.body.name,
        });
        (0, utils_1.sendCreated)(res, data, 'Sparepart berhasil ditambahkan');
    }
    catch (e) {
        next(e);
    }
});
router.put('/:id', (0, auth_1.requirePermission)('master', 'full'), (0, validate_1.validate)(updateSchema), async (req, res, next) => {
    try {
        const spId = Number(req.params.id);
        await db_1.default.update('sparepart', { ...req.body, updatedAt: new Date() }, 'id = ?', [spId]);
        const data = await db_1.default.queryOne('SELECT * FROM sparepart WHERE id = ?', [spId]);
        await db_1.default.insert('activity_logs', {
            userId: req.user?.id ?? null,
            action: 'update', module: 'master',
            targetId: spId, targetName: data?.name,
        });
        (0, utils_1.sendSuccess)(res, data, 'Sparepart berhasil diperbarui');
    }
    catch (e) {
        next(e);
    }
});
router.delete('/:id', (0, auth_1.requirePermission)('master', 'full'), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        // Cek apakah sparepart masih dipakai di SPK
        const usedInSpk = await db_1.default.queryVal('SELECT COUNT(*) FROM wo_items WHERE sparepartId = ?', [id]);
        if (usedInSpk > 0) {
            throw new errors_1.BadRequestError(`Sparepart ini masih digunakan di ${usedInSpk} item SPK dan tidak dapat dihapus.`);
        }
        const usedInJasa = await db_1.default.queryVal('SELECT COUNT(*) FROM jasa_sparepart WHERE sparepartId = ?', [id]);
        if (usedInJasa > 0) {
            throw new errors_1.BadRequestError(`Sparepart ini masih terhubung dengan ${usedInJasa} paket jasa dan tidak dapat dihapus.`);
        }
        const usedInOpname = await db_1.default.queryVal('SELECT COUNT(*) FROM stok_opname_items WHERE sparepartId = ?', [id]);
        if (usedInOpname > 0) {
            throw new errors_1.BadRequestError(`Sparepart ini memiliki ${usedInOpname} riwayat opname dan tidak dapat dihapus untuk menjaga integritas data.`);
        }
        const sp = await db_1.default.queryOne('SELECT name FROM sparepart WHERE id = ?', [id]);
        await db_1.default.transaction(async (tx) => {
            await tx.execute('DELETE FROM inventaris_log WHERE sparepartId = ?', [id]);
            await tx.execute('DELETE FROM sparepart WHERE id = ?', [id]);
            await tx.insert('activity_logs', {
                userId: req.user?.id ?? null,
                action: 'delete', module: 'master',
                targetId: id, targetName: sp?.name,
            });
        });
        (0, utils_1.sendSuccess)(res, null, 'Sparepart berhasil dihapus');
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=sparepart.routes.js.map