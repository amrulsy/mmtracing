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
const platMsg = { message: 'Format plat tidak valid (contoh: B 1234 ABC)' };
const createSchema = zod_1.z.object({
    pelangganId: zod_1.z.number().int().positive(),
    name: zod_1.z.string().min(1),
    plat: zod_1.z.string().min(1).refine(validators_1.isValidPlat, platMsg),
    tahun: zod_1.z.string().optional(),
    warna: zod_1.z.string().optional(),
    noRangka: zod_1.z.string().optional(),
    noMesin: zod_1.z.string().optional(),
    odometer: zod_1.z.number().int().optional(),
    photoUrl: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
    nextServiceDate: zod_1.z.string().datetime().optional().or(zod_1.z.literal('')),
    nextServiceKm: zod_1.z.number().int().optional(),
});
const updateSchema = zod_1.z.object({
    pelangganId: zod_1.z.number().int().positive().optional(),
    name: zod_1.z.string().min(1).optional(),
    plat: zod_1.z.string().min(1).refine(validators_1.isValidPlat, platMsg).optional(),
    tahun: zod_1.z.string().optional(),
    warna: zod_1.z.string().optional(),
    noRangka: zod_1.z.string().optional(),
    noMesin: zod_1.z.string().optional(),
    odometer: zod_1.z.number().int().optional(),
    photoUrl: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
    nextServiceDate: zod_1.z.string().datetime().optional().or(zod_1.z.literal('')).nullable(),
    nextServiceKm: zod_1.z.number().int().optional().nullable(),
});
router.get('/', async (req, res, next) => {
    try {
        const { page, limit, skip } = (0, utils_1.parsePagination)(req.query);
        const { pelangganId, search, includeDeleted } = req.query;
        const conds = [];
        const params = [];
        if (!includeDeleted)
            conds.push('k.deletedAt IS NULL');
        if (pelangganId) {
            conds.push('k.pelangganId = ?');
            params.push(Number(pelangganId));
        }
        if (search) {
            conds.push('(k.name LIKE ? OR k.plat LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }
        const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
        const [data, totalRow] = await Promise.all([
            db_1.default.query(`SELECT k.*, p.id AS pId, p.name AS pName, p.phone AS pPhone
         FROM kendaraan k LEFT JOIN pelanggan p ON p.id = k.pelangganId
         ${where} ORDER BY k.updatedAt DESC LIMIT ? OFFSET ?`, [...params, limit, skip]),
            db_1.default.queryOne(`SELECT COUNT(*) AS c FROM kendaraan k ${where}`, params),
        ]);
        const rows = data.map((r) => ({ ...r, pelanggan: { id: r.pId, name: r.pName, phone: r.pPhone } }));
        (0, utils_1.sendPaginated)(res, rows, totalRow?.c ?? 0, page, limit);
    }
    catch (e) {
        next(e);
    }
});
// GET /kendaraan/reminders — kendaraan yang butuh servis (by date atau km)
router.get('/reminders', async (req, res, next) => {
    try {
        const today = new Date();
        const in7Days = new Date();
        in7Days.setDate(today.getDate() + 7);
        const in30Days = new Date();
        in30Days.setDate(today.getDate() + 30);
        const due = await db_1.default.query(`SELECT k.*, p.id AS pId, p.name AS pName, p.phone AS pPhone, lt.name AS tierName
       FROM kendaraan k
       LEFT JOIN pelanggan p ON p.id = k.pelangganId
       LEFT JOIN loyalty_tiers lt ON lt.id = p.loyaltyTierId
       WHERE k.deletedAt IS NULL AND k.nextServiceDate IS NOT NULL AND k.nextServiceDate <= ?
       ORDER BY k.nextServiceDate ASC LIMIT 100`, [in30Days]);
        const items = due.map((k) => {
            const date = k.nextServiceDate ? new Date(k.nextServiceDate) : null;
            const isOverdue = !!(date && date < today);
            const isDueSoon = !!(date && date >= today && date <= in7Days);
            return {
                ...k,
                pelanggan: { id: k.pId, name: k.pName, phone: k.pPhone, loyaltyTier: k.tierName ? { name: k.tierName } : null },
                reminderStatus: isOverdue ? 'overdue' : isDueSoon ? 'due_soon' : 'upcoming',
            };
        });
        (0, utils_1.sendSuccess)(res, items);
    }
    catch (e) {
        next(e);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const data = await db_1.default.queryOne('SELECT * FROM kendaraan WHERE id = ? AND deletedAt IS NULL', [id]);
        if (!data)
            throw new errors_1.NotFoundError('Kendaraan');
        const [pelanggan, spks, inspeksis] = await Promise.all([
            db_1.default.queryOne('SELECT * FROM pelanggan WHERE id = ?', [data.pelangganId]),
            db_1.default.query(`SELECT s.*, m.name AS mekanikName FROM work_orders s LEFT JOIN mekanik m ON m.id = s.mekanikId
         WHERE s.kendaraanId = ? ORDER BY s.createdAt DESC LIMIT 10`, [id]),
            db_1.default.query('SELECT * FROM inspeksi WHERE kendaraanId = ? ORDER BY tanggal DESC LIMIT 5', [id]),
        ]);
        data.pelanggan = pelanggan;
        data.spk = spks.map((s) => ({ ...s, mekanik: s.mekanikName ? { name: s.mekanikName } : null }));
        data.inspeksi = inspeksis;
        (0, utils_1.sendSuccess)(res, data);
    }
    catch (e) {
        next(e);
    }
});
router.post('/', (0, auth_1.requirePermission)('master', 'edit'), (0, validate_1.validate)(createSchema), async (req, res, next) => {
    try {
        const body = { ...req.body, plat: (0, validators_1.normalizePlat)(req.body.plat), updatedAt: new Date() };
        const newId = await db_1.default.insert('kendaraan', body);
        const data = await db_1.default.queryOne('SELECT * FROM kendaraan WHERE id = ?', [newId]);
        await db_1.default.insert('activity_logs', {
            userId: req.user?.id ?? null,
            action: 'create', module: 'master',
            targetId: newId, targetName: `${body.name} (${body.plat})`,
        });
        (0, utils_1.sendCreated)(res, data, 'Kendaraan berhasil ditambahkan');
    }
    catch (e) {
        next(e);
    }
});
router.put('/:id', (0, auth_1.requirePermission)('master', 'edit'), (0, validate_1.validate)(updateSchema), async (req, res, next) => {
    try {
        const body = { ...req.body };
        if (body.plat)
            body.plat = (0, validators_1.normalizePlat)(body.plat);
        if (body.nextServiceDate === '' || body.nextServiceDate === null)
            body.nextServiceDate = null;
        else if (body.nextServiceDate)
            body.nextServiceDate = new Date(body.nextServiceDate);
        const id = Number(req.params.id);
        await db_1.default.update('kendaraan', { ...body, updatedAt: new Date() }, 'id = ?', [id]);
        const data = await db_1.default.queryOne('SELECT * FROM kendaraan WHERE id = ?', [id]);
        await db_1.default.insert('activity_logs', {
            userId: req.user?.id ?? null,
            action: 'update', module: 'master',
            targetId: id, targetName: `${data?.name} (${data?.plat})`,
        });
        (0, utils_1.sendSuccess)(res, data, 'Kendaraan berhasil diperbarui');
    }
    catch (e) {
        next(e);
    }
});
// DELETE /kendaraan/:id — soft delete
router.delete('/:id', (0, auth_1.requirePermission)('master', 'full'), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const kendaraan = await db_1.default.queryOne('SELECT name, plat FROM kendaraan WHERE id = ? AND deletedAt IS NULL', [id]);
        if (!kendaraan)
            throw new errors_1.NotFoundError('Kendaraan');
        await db_1.default.transaction(async (tx) => {
            await tx.update('kendaraan', { deletedAt: new Date() }, 'id = ?', [id]);
            await tx.insert('activity_logs', {
                userId: req.user?.id ?? null,
                action: 'delete', module: 'master',
                targetId: id, targetName: `${kendaraan.name} (${kendaraan.plat})`,
            });
        });
        (0, utils_1.sendSuccess)(res, null, 'Kendaraan berhasil dihapus');
    }
    catch (e) {
        next(e);
    }
});
// POST /kendaraan/:id/restore
router.post('/:id/restore', (0, auth_1.requirePermission)('master', 'full'), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        await db_1.default.update('kendaraan', { deletedAt: null, updatedAt: new Date() }, 'id = ?', [id]);
        const data = await db_1.default.queryOne('SELECT * FROM kendaraan WHERE id = ?', [id]);
        await db_1.default.insert('activity_logs', {
            userId: req.user?.id ?? null,
            action: 'restore', module: 'master',
            targetId: id, targetName: `${data?.name} (${data?.plat})`,
        });
        (0, utils_1.sendSuccess)(res, data, 'Kendaraan berhasil dikembalikan');
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=kendaraan.routes.js.map