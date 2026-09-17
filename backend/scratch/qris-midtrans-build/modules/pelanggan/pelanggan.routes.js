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
const validators_1 = require("../../shared/validators");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// Schemas
const createSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    phone: zod_1.z.string().min(1),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
    address: zod_1.z.string().optional(),
    photoUrl: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
    type: zod_1.z.enum(['kendaraan', 'bubut', 'both']).default('kendaraan'),
    loyaltyTierId: zod_1.z.number().int().optional(),
});
const kendaraanItemSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    plat: zod_1.z.string().min(1).refine(validators_1.isValidPlat, { message: 'Format plat tidak valid (contoh: B 1234 ABC)' }),
    tahun: zod_1.z.string().optional(),
    warna: zod_1.z.string().optional(),
    noRangka: zod_1.z.string().optional(),
    noMesin: zod_1.z.string().optional(),
    odometer: zod_1.z.number().int().optional(),
});
const createWithKendaraanSchema = createSchema.extend({
    kendaraan: zod_1.z.array(kendaraanItemSchema).optional(),
});
const updateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    phone: zod_1.z.string().min(1).optional(),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
    address: zod_1.z.string().optional(),
    photoUrl: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
    type: zod_1.z.enum(['kendaraan', 'bubut', 'both']).optional(),
    loyaltyTierId: zod_1.z.number().int().optional(),
});
const mergeSchema = zod_1.z.object({
    targetId: zod_1.z.number().int().positive(),
});
// GET /pelanggan
router.get('/', async (req, res, next) => {
    try {
        const { page, limit, skip } = (0, utils_1.parsePagination)(req.query);
        const { search, type, includeDeleted } = req.query;
        const conds = [];
        const params = [];
        if (!includeDeleted)
            conds.push('p.deletedAt IS NULL');
        if (type && type !== 'semua') {
            conds.push('p.type = ?');
            params.push(type);
        }
        if (search) {
            conds.push('(p.name LIKE ? OR p.phone LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }
        const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
        const [rows, totalRow] = await Promise.all([
            db_1.default.query(`SELECT p.*, lt.name AS loyaltyTierName, lt.minPoints AS loyaltyTierMinPoints,
                (SELECT COUNT(*) FROM work_orders WHERE pelangganId = p.id) AS _countSpk
         FROM pelanggan p
         LEFT JOIN loyalty_tiers lt ON lt.id = p.loyaltyTierId
         ${where} ORDER BY p.updatedAt DESC LIMIT ? OFFSET ?`, [...params, limit, skip]),
            db_1.default.queryOne(`SELECT COUNT(*) AS c FROM pelanggan p ${where}`, params),
        ]);
        // Attach kendaraan
        if (rows.length) {
            const ids = rows.map((r) => r.id);
            const kendaraans = await db_1.default.query('SELECT * FROM kendaraan WHERE pelangganId IN (?) AND deletedAt IS NULL', [ids]);
            const kmap = new Map();
            for (const k of kendaraans) {
                if (!kmap.has(k.pelangganId))
                    kmap.set(k.pelangganId, []);
                kmap.get(k.pelangganId).push(k);
            }
            for (const r of rows) {
                r.kendaraan = kmap.get(r.id) || [];
                r.loyaltyTier = r.loyaltyTierId ? { id: r.loyaltyTierId, name: r.loyaltyTierName, minPoints: r.loyaltyTierMinPoints } : null;
            }
        }
        (0, utils_1.sendPaginated)(res, rows, totalRow?.c ?? 0, page, limit);
    }
    catch (e) {
        next(e);
    }
});
// GET /pelanggan/:id
router.get('/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const data = await db_1.default.queryOne('SELECT * FROM pelanggan WHERE id = ? AND deletedAt IS NULL', [id]);
        if (!data)
            throw new errors_1.NotFoundError('Pelanggan');
        const [kendaraans, spks, loyaltyPts, loyaltyTier] = await Promise.all([
            db_1.default.query('SELECT * FROM kendaraan WHERE pelangganId = ? AND deletedAt IS NULL', [id]),
            db_1.default.query(`SELECT s.*, m.name AS mekanikName FROM work_orders s LEFT JOIN mekanik m ON m.id = s.mekanikId
         WHERE s.pelangganId = ? ORDER BY s.createdAt DESC LIMIT 10`, [id]),
            db_1.default.query('SELECT * FROM loyalty_points WHERE pelangganId = ? ORDER BY createdAt DESC LIMIT 20', [id]),
            data.loyaltyTierId ? db_1.default.queryOne('SELECT * FROM loyalty_tiers WHERE id = ?', [data.loyaltyTierId]) : null,
        ]);
        data.kendaraan = kendaraans;
        data.loyaltyTier = loyaltyTier;
        data.spk = spks.map((s) => ({ ...s, mekanik: s.mekanikName ? { name: s.mekanikName } : null }));
        data.loyaltyPoints = loyaltyPts;
        (0, utils_1.sendSuccess)(res, data);
    }
    catch (e) {
        next(e);
    }
});
// POST /pelanggan
router.post('/', (0, validate_1.validate)(createSchema), async (req, res, next) => {
    try {
        const body = { ...req.body, phone: (0, validators_1.normalizePhone)(req.body.phone), updatedAt: new Date() };
        const newId = await db_1.default.insert('pelanggan', body);
        const data = await db_1.default.queryOne('SELECT * FROM pelanggan WHERE id = ?', [newId]);
        await db_1.default.insert('activity_logs', {
            userId: req.user?.id ?? null,
            action: 'create', module: 'pelanggan',
            targetId: newId, targetName: body.name,
        });
        (0, utils_1.sendCreated)(res, data, 'Pelanggan berhasil ditambahkan');
    }
    catch (e) {
        next(e);
    }
});
// POST /pelanggan/with-kendaraan — registrasi pelanggan + kendaraan dalam 1 transaksi
router.post('/with-kendaraan', (0, auth_1.requirePermission)('master', 'edit'), (0, validate_1.validate)(createWithKendaraanSchema), async (req, res, next) => {
    try {
        const { kendaraan, ...pelangganBody } = req.body;
        pelangganBody.phone = (0, validators_1.normalizePhone)(pelangganBody.phone);
        const result = await db_1.default.transaction(async (tx) => {
            pelangganBody.updatedAt = new Date();
            const pelangganId = await tx.insert('pelanggan', pelangganBody);
            const pelanggan = await tx.queryOne('SELECT * FROM pelanggan WHERE id = ?', [pelangganId]);
            const kendaraanCreated = [];
            if (Array.isArray(kendaraan) && kendaraan.length) {
                for (const k of kendaraan) {
                    const kId = await tx.insert('kendaraan', { ...k, plat: (0, validators_1.normalizePlat)(k.plat), pelangganId, updatedAt: new Date() });
                    const created = await tx.queryOne('SELECT * FROM kendaraan WHERE id = ?', [kId]);
                    kendaraanCreated.push(created);
                }
            }
            await tx.insert('activity_logs', {
                userId: req.user?.id ?? null,
                action: 'create', module: 'pelanggan',
                targetId: pelangganId,
                targetName: `${pelangganBody.name} (+${kendaraanCreated.length} kendaraan)`,
            });
            return { ...pelanggan, kendaraan: kendaraanCreated };
        });
        (0, utils_1.sendCreated)(res, result, 'Pelanggan & kendaraan berhasil ditambahkan');
    }
    catch (e) {
        next(e);
    }
});
// PUT /pelanggan/:id
router.put('/:id', (0, auth_1.requirePermission)('master', 'full'), (0, validate_1.validate)(updateSchema), async (req, res, next) => {
    try {
        const body = { ...req.body };
        if (body.phone)
            body.phone = (0, validators_1.normalizePhone)(body.phone);
        const id = Number(req.params.id);
        await db_1.default.update('pelanggan', { ...body, updatedAt: new Date() }, 'id = ?', [id]);
        const data = await db_1.default.queryOne('SELECT * FROM pelanggan WHERE id = ?', [id]);
        await db_1.default.insert('activity_logs', {
            userId: req.user?.id ?? null,
            action: 'update', module: 'pelanggan',
            targetId: id, targetName: data?.name,
        });
        (0, utils_1.sendSuccess)(res, data, 'Pelanggan berhasil diperbarui');
    }
    catch (e) {
        next(e);
    }
});
// DELETE /pelanggan/:id — soft delete (set deletedAt)
router.delete('/:id', (0, auth_1.requirePermission)('master', 'full'), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const pelanggan = await db_1.default.queryOne('SELECT name FROM pelanggan WHERE id = ? AND deletedAt IS NULL', [id]);
        if (!pelanggan)
            throw new errors_1.NotFoundError('Pelanggan');
        await db_1.default.transaction(async (tx) => {
            await tx.update('pelanggan', { deletedAt: new Date() }, 'id = ?', [id]);
            await tx.execute('UPDATE kendaraan SET deletedAt = NOW() WHERE pelangganId = ? AND deletedAt IS NULL', [id]);
            await tx.insert('activity_logs', {
                userId: req.user?.id ?? null,
                action: 'delete', module: 'pelanggan',
                targetId: id, targetName: pelanggan.name,
            });
        });
        (0, utils_1.sendSuccess)(res, null, 'Pelanggan berhasil dihapus (soft delete)');
    }
    catch (e) {
        next(e);
    }
});
// POST /pelanggan/:id/restore — kembalikan pelanggan yang di-soft-delete
router.post('/:id/restore', (0, auth_1.requirePermission)('master', 'full'), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        await db_1.default.update('pelanggan', { deletedAt: null, updatedAt: new Date() }, 'id = ?', [id]);
        await db_1.default.execute('UPDATE kendaraan SET deletedAt = NULL WHERE pelangganId = ?', [id]);
        const data = await db_1.default.queryOne('SELECT * FROM pelanggan WHERE id = ?', [id]);
        await db_1.default.insert('activity_logs', {
            userId: req.user?.id ?? null,
            action: 'restore', module: 'pelanggan',
            targetId: id, targetName: data?.name,
        });
        (0, utils_1.sendSuccess)(res, data, 'Pelanggan berhasil dikembalikan');
    }
    catch (e) {
        next(e);
    }
});
// POST /pelanggan/:id/merge-into — gabungkan sourceId ke targetId
// Semua kendaraan & SPK & loyaltyPoints dipindahkan ke targetId,
// lalu source di-soft-delete.
router.post('/:id/merge-into', (0, auth_1.requirePermission)('master', 'full'), (0, validate_1.validate)(mergeSchema), async (req, res, next) => {
    try {
        const sourceId = Number(req.params.id);
        const { targetId } = req.body;
        if (sourceId === targetId)
            throw new errors_1.BadRequestError('Source dan target tidak boleh sama');
        const [source, target] = await Promise.all([
            db_1.default.queryOne('SELECT * FROM pelanggan WHERE id = ? AND deletedAt IS NULL', [sourceId]),
            db_1.default.queryOne('SELECT * FROM pelanggan WHERE id = ? AND deletedAt IS NULL', [targetId]),
        ]);
        if (!source)
            throw new errors_1.NotFoundError('Pelanggan sumber');
        if (!target)
            throw new errors_1.NotFoundError('Pelanggan target');
        const result = await db_1.default.transaction(async (tx) => {
            const ken = await tx.execute('UPDATE kendaraan SET pelangganId = ? WHERE pelangganId = ?', [targetId, sourceId]);
            const spk = await tx.execute('UPDATE work_orders SET pelangganId = ? WHERE pelangganId = ?', [targetId, sourceId]);
            const loy = await tx.execute('UPDATE loyalty_points SET pelangganId = ? WHERE pelangganId = ?', [targetId, sourceId]);
            await tx.update('pelanggan', { deletedAt: new Date() }, 'id = ?', [sourceId]);
            await tx.insert('activity_logs', {
                userId: req.user?.id ?? null,
                action: 'merge', module: 'pelanggan',
                targetId: targetId,
                targetName: `${source.name} → ${target.name}`,
                detail: JSON.stringify({ sourceId, targetId, kendaraan: ken.affectedRows, spk: spk.affectedRows, loyaltyPoints: loy.affectedRows }),
            });
            return { kendaraan: ken.affectedRows, spk: spk.affectedRows, loyaltyPoints: loy.affectedRows };
        });
        (0, utils_1.sendSuccess)(res, result, `Berhasil menggabungkan "${source.name}" ke "${target.name}"`);
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=pelanggan.routes.js.map