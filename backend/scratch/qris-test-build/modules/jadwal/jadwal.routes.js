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
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
const createSchema = zod_1.z.object({
    woId: zod_1.z.number().int().positive().optional(),
    mekanikId: zod_1.z.number().int().positive().optional(),
    tanggal: zod_1.z.string().transform(v => new Date(v)),
    jamMulai: zod_1.z.string().min(1),
    jamSelesai: zod_1.z.string().min(1),
    namaBooking: zod_1.z.string().min(1),
    pekerjaan: zod_1.z.string().optional(),
    kategori: zod_1.z.enum(['servis', 'modifikasi', 'bubut', 'booking', 'fleet']).default('servis'),
    warna: zod_1.z.string().optional(),
});
// GET /jadwal — week-based
router.get('/', async (req, res, next) => {
    try {
        const { startDate, endDate, mekanikId } = req.query;
        const conds = [];
        const params = [];
        if (startDate && endDate) {
            conds.push('j.tanggal >= ? AND j.tanggal <= ?');
            params.push(new Date(startDate), new Date(endDate));
        }
        if (mekanikId) {
            conds.push('j.mekanikId = ?');
            params.push(Number(mekanikId));
        }
        const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
        const data = await db_1.default.query(`SELECT j.*, s.noWo, s.status AS woStatus,
              m.name AS mekanikName, m.initial AS mekanikInitial
       FROM jadwal j
       LEFT JOIN work_orders s ON s.id = j.woId
       LEFT JOIN mekanik m ON m.id = j.mekanikId
       ${where} ORDER BY j.tanggal ASC`, params);
        const result = data.map((r) => ({
            ...r,
            spk: r.noWo ? { noWo: r.noWo, status: r.woStatus } : null,
            mekanik: r.mekanikName ? { name: r.mekanikName, initial: r.mekanikInitial } : null,
        }));
        (0, utils_1.sendSuccess)(res, result);
    }
    catch (e) {
        next(e);
    }
});
// POST /jadwal
router.post('/', (0, validate_1.validate)(createSchema), async (req, res, next) => {
    try {
        const id = await db_1.default.insert('jadwal', req.body);
        const data = await db_1.default.queryOne('SELECT * FROM jadwal WHERE id = ?', [id]);
        (0, utils_1.sendCreated)(res, data, 'Jadwal berhasil ditambahkan');
    }
    catch (e) {
        next(e);
    }
});
// PUT /jadwal/:id
router.put('/:id', (0, auth_1.requirePermission)('monitoring', 'edit'), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        await db_1.default.update('jadwal', { ...req.body, updatedAt: new Date() }, 'id = ?', [id]);
        const data = await db_1.default.queryOne('SELECT * FROM jadwal WHERE id = ?', [id]);
        (0, utils_1.sendSuccess)(res, data, 'Jadwal berhasil diperbarui');
    }
    catch (e) {
        next(e);
    }
});
// DELETE /jadwal/:id
router.delete('/:id', (0, auth_1.requirePermission)('monitoring', 'full'), async (req, res, next) => {
    try {
        await db_1.default.execute('DELETE FROM jadwal WHERE id = ?', [Number(req.params.id)]);
        (0, utils_1.sendSuccess)(res, null, 'Jadwal berhasil dihapus');
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=jadwal.routes.js.map