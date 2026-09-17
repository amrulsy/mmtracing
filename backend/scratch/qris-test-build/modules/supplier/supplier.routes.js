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
    email: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
    address: zod_1.z.string().optional(),
});
const updateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    phone: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
    address: zod_1.z.string().optional(),
});
// GET /supplier — list all with sparepart count + search
router.get('/', async (req, res, next) => {
    try {
        const { search } = req.query;
        const conds = [];
        const params = [];
        if (search) {
            conds.push('(s.name LIKE ? OR s.phone LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }
        const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
        const data = await db_1.default.query(`SELECT s.*,
              (SELECT COUNT(*) FROM sparepart sp WHERE sp.supplierId = s.id) AS _countSparepart,
              (SELECT COUNT(*) FROM inventaris_log il WHERE il.supplierId = s.id) AS _countInventarisLog
       FROM supplier s ${where}
       ORDER BY s.name ASC`, params);
        (0, utils_1.sendSuccess)(res, data);
    }
    catch (e) {
        next(e);
    }
});
// GET /supplier/:id — detail with spareparts + purchase history
router.get('/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const data = await db_1.default.queryOne('SELECT * FROM supplier WHERE id = ?', [id]);
        if (!data)
            throw new errors_1.NotFoundError('Supplier');
        const [spareparts, logs] = await Promise.all([
            db_1.default.query(`SELECT sp.*, ks.id AS kategoriId, ks.name AS kategoriName
         FROM sparepart sp
         LEFT JOIN kategori_sparepart ks ON ks.id = sp.kategoriId
         WHERE sp.supplierId = ?
         ORDER BY sp.name ASC`, [id]),
            db_1.default.query(`SELECT il.*, sp.id AS sparepartId, sp.kode AS sparepartKode, sp.name AS sparepartName
         FROM inventaris_log il
         LEFT JOIN sparepart sp ON sp.id = il.sparepartId
         WHERE il.supplierId = ?
         ORDER BY il.createdAt DESC LIMIT 30`, [id]),
        ]);
        data.sparepart = spareparts.map((sp) => ({
            ...sp,
            kategori: sp.kategoriId ? { id: sp.kategoriId, name: sp.kategoriName } : null,
        }));
        data.inventarisLog = logs.map((l) => ({
            ...l,
            sparepart: { id: l.sparepartId, kode: l.sparepartKode, name: l.sparepartName },
        }));
        (0, utils_1.sendSuccess)(res, data);
    }
    catch (e) {
        next(e);
    }
});
// POST /supplier
router.post('/', (0, validate_1.validate)(createSchema), async (req, res, next) => {
    try {
        const id = await db_1.default.insert('supplier', req.body);
        const data = await db_1.default.queryOne('SELECT * FROM supplier WHERE id = ?', [id]);
        await db_1.default.insert('activity_logs', {
            userId: req.user?.id ?? null,
            action: 'create', module: 'master',
            targetId: id, targetName: req.body.name,
        });
        (0, utils_1.sendCreated)(res, data, 'Supplier berhasil ditambahkan');
    }
    catch (e) {
        next(e);
    }
});
// PUT /supplier/:id
router.put('/:id', (0, validate_1.validate)(updateSchema), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        await db_1.default.update('supplier', { ...req.body, updatedAt: new Date() }, 'id = ?', [id]);
        const data = await db_1.default.queryOne('SELECT * FROM supplier WHERE id = ?', [id]);
        await db_1.default.insert('activity_logs', {
            userId: req.user?.id ?? null,
            action: 'update', module: 'master',
            targetId: id, targetName: data?.name,
        });
        (0, utils_1.sendSuccess)(res, data, 'Supplier berhasil diperbarui');
    }
    catch (e) {
        next(e);
    }
});
// PATCH /supplier/:id
router.patch('/:id', (0, validate_1.validate)(updateSchema), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        await db_1.default.update('supplier', { ...req.body, updatedAt: new Date() }, 'id = ?', [id]);
        const data = await db_1.default.queryOne('SELECT * FROM supplier WHERE id = ?', [id]);
        await db_1.default.insert('activity_logs', {
            userId: req.user?.id ?? null,
            action: 'update', module: 'master',
            targetId: id, targetName: data?.name,
        });
        (0, utils_1.sendSuccess)(res, data, 'Supplier berhasil diperbarui');
    }
    catch (e) {
        next(e);
    }
});
// DELETE /supplier/:id — with protection
router.delete('/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        // Cek apakah supplier masih punya sparepart
        const sparepartCount = await db_1.default.queryVal('SELECT COUNT(*) FROM sparepart WHERE supplierId = ?', [id]);
        if (sparepartCount > 0) {
            throw new errors_1.BadRequestError(`Supplier ini masih terhubung dengan ${sparepartCount} sparepart dan tidak dapat dihapus. Pindahkan sparepart ke supplier lain terlebih dahulu.`);
        }
        // Cek apakah supplier masih punya log inventaris
        const logCount = await db_1.default.queryVal('SELECT COUNT(*) FROM inventaris_log WHERE supplierId = ?', [id]);
        if (logCount > 0) {
            throw new errors_1.BadRequestError(`Supplier ini memiliki ${logCount} riwayat transaksi inventaris dan tidak dapat dihapus untuk menjaga integritas data historis.`);
        }
        const supplier = await db_1.default.queryOne('SELECT name FROM supplier WHERE id = ?', [id]);
        await db_1.default.execute('DELETE FROM supplier WHERE id = ?', [id]);
        await db_1.default.insert('activity_logs', {
            userId: req.user?.id ?? null,
            action: 'delete', module: 'master',
            targetId: id, targetName: supplier?.name,
        });
        (0, utils_1.sendSuccess)(res, null, 'Supplier berhasil dihapus');
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=supplier.routes.js.map