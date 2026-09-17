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
const createSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    phone: zod_1.z.string().optional(),
    spesialisasi: zod_1.z.string().optional(),
    initial: zod_1.z.string().max(5).optional(),
    color: zod_1.z.string().optional(),
});
const updateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    phone: zod_1.z.string().optional(),
    spesialisasi: zod_1.z.string().optional(),
    initial: zod_1.z.string().max(5).optional(),
    color: zod_1.z.string().optional(),
    status: zod_1.z.enum(['available', 'busy', 'offline']).optional(),
});
router.get('/', async (req, res, next) => {
    try {
        const { status } = req.query;
        const conds = [];
        const params = [];
        if (status) {
            conds.push('m.status = ?');
            params.push(status);
        }
        const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
        const mekaniks = await db_1.default.query(`SELECT m.*, (SELECT COUNT(*) FROM work_orders WHERE mekanikId = m.id) AS _countSpk
       FROM mekanik m ${where} ORDER BY m.name ASC`, params);
        // Attach active SPKs
        if (mekaniks.length) {
            const ids = mekaniks.map((m) => m.id);
            const activeSpk = await db_1.default.query('SELECT id, noWo, status, mekanikId FROM work_orders WHERE mekanikId IN (?) AND status = ?', [ids, 'dikerjakan']);
            const map = new Map();
            for (const s of activeSpk) {
                if (!map.has(s.mekanikId))
                    map.set(s.mekanikId, []);
                map.get(s.mekanikId).push(s);
            }
            for (const m of mekaniks)
                m.spk = map.get(m.id) || [];
        }
        (0, utils_1.sendSuccess)(res, mekaniks);
    }
    catch (e) {
        next(e);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const data = await db_1.default.queryOne('SELECT * FROM mekanik WHERE id = ?', [id]);
        if (!data)
            throw new errors_1.NotFoundError('Mekanik');
        const [spks, jadwals] = await Promise.all([
            db_1.default.query(`SELECT s.*, p.id AS pelangganId, p.name AS pelangganName, p.phone AS pelangganPhone,
                k.id AS kendaraanId, k.name AS kendaraanName, k.plat AS kendaraanPlat
         FROM work_orders s
         LEFT JOIN pelanggan p ON p.id = s.pelangganId
         LEFT JOIN kendaraan k ON k.id = s.kendaraanId
         WHERE s.mekanikId = ? ORDER BY s.createdAt DESC LIMIT 20`, [id]),
            db_1.default.query('SELECT * FROM jadwal WHERE mekanikId = ? ORDER BY tanggal DESC LIMIT 10', [id]),
        ]);
        data.spk = spks.map((s) => ({
            ...s,
            pelanggan: { id: s.pelangganId, name: s.pelangganName, phone: s.pelangganPhone },
            kendaraan: s.kendaraanId ? { id: s.kendaraanId, name: s.kendaraanName, plat: s.kendaraanPlat } : null,
        }));
        data.jadwal = jadwals;
        (0, utils_1.sendSuccess)(res, data);
    }
    catch (e) {
        next(e);
    }
});
router.post('/', (0, auth_1.requirePermission)('master', 'full'), (0, validate_1.validate)(createSchema), async (req, res, next) => {
    try {
        const newId = await db_1.default.insert('mekanik', req.body);
        const data = await db_1.default.queryOne('SELECT * FROM mekanik WHERE id = ?', [newId]);
        await db_1.default.insert('activity_logs', {
            userId: req.user?.id ?? null,
            action: 'create', module: 'master',
            targetId: newId, targetName: req.body.name,
        });
        (0, utils_1.sendCreated)(res, data, 'Mekanik berhasil ditambahkan');
    }
    catch (e) {
        next(e);
    }
});
router.put('/:id', (0, auth_1.requirePermission)('master', 'full'), (0, validate_1.validate)(updateSchema), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        await db_1.default.update('mekanik', { ...req.body, updatedAt: new Date() }, 'id = ?', [id]);
        const data = await db_1.default.queryOne('SELECT * FROM mekanik WHERE id = ?', [id]);
        await db_1.default.insert('activity_logs', {
            userId: req.user?.id ?? null,
            action: 'update', module: 'master',
            targetId: id, targetName: data?.name,
        });
        (0, utils_1.sendSuccess)(res, data, 'Mekanik berhasil diperbarui');
    }
    catch (e) {
        next(e);
    }
});
router.delete('/:id', (0, auth_1.requirePermission)('master', 'full'), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const mekanik = await db_1.default.queryOne('SELECT name FROM mekanik WHERE id = ?', [id]);
        const spkCount = await db_1.default.queryVal('SELECT COUNT(*) FROM work_orders WHERE mekanikId = ?', [id]);
        if (spkCount > 0) {
            throw new errors_1.BadRequestError(`Mekanik ini masih terhubung dengan ${spkCount} SPK dan tidak dapat dihapus.`);
        }
        await db_1.default.execute('DELETE FROM mekanik WHERE id = ?', [id]);
        await db_1.default.insert('activity_logs', {
            userId: req.user?.id ?? null,
            action: 'delete', module: 'master',
            targetId: id, targetName: mekanik?.name,
        });
        (0, utils_1.sendSuccess)(res, null, 'Mekanik berhasil dihapus');
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=mekanik.routes.js.map