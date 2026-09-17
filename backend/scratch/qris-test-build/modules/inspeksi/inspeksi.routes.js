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
const createInspeksiSchema = zod_1.z.object({
    kendaraanId: zod_1.z.number().int().positive(),
    tanggal: zod_1.z.string().transform(v => new Date(v)).optional(),
    odometer: zod_1.z.number().int().min(0).optional(),
    catatan: zod_1.z.string().optional(),
    kondisi: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    foto: zod_1.z.array(zod_1.z.string()).optional(),
});
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
router.get('/', async (req, res, next) => {
    try {
        const { kendaraanId } = req.query;
        const conds = [];
        const params = [];
        if (kendaraanId) {
            conds.push('i.kendaraanId = ?');
            params.push(Number(kendaraanId));
        }
        const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
        const rows = await db_1.default.query(`SELECT i.*, k.name AS kName, k.plat AS kPlat, k.pelangganId,
              p.name AS pName, p.phone AS pPhone
       FROM inspeksi i
       LEFT JOIN kendaraan k ON k.id = i.kendaraanId
       LEFT JOIN pelanggan p ON p.id = k.pelangganId
       ${where} ORDER BY i.tanggal DESC`, params);
        const data = rows.map((r) => ({
            ...r,
            kondisi: typeof r.kondisi === 'string' ? JSON.parse(r.kondisi) : r.kondisi,
            foto: typeof r.foto === 'string' ? JSON.parse(r.foto) : r.foto,
            kendaraan: { id: r.kendaraanId, name: r.kName, plat: r.kPlat, pelanggan: { id: r.pelangganId, name: r.pName, phone: r.pPhone } },
        }));
        (0, utils_1.sendSuccess)(res, data);
    }
    catch (e) {
        next(e);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const r = await db_1.default.queryOne(`SELECT i.*, k.name AS kName, k.plat AS kPlat, k.pelangganId,
              p.name AS pName, p.phone AS pPhone
       FROM inspeksi i
       LEFT JOIN kendaraan k ON k.id = i.kendaraanId
       LEFT JOIN pelanggan p ON p.id = k.pelangganId
       WHERE i.id = ?`, [id]);
        if (!r)
            throw new errors_1.NotFoundError('Inspeksi');
        r.kondisi = typeof r.kondisi === 'string' ? JSON.parse(r.kondisi) : r.kondisi;
        r.foto = typeof r.foto === 'string' ? JSON.parse(r.foto) : r.foto;
        r.kendaraan = { id: r.kendaraanId, name: r.kName, plat: r.kPlat, pelanggan: { id: r.pelangganId, name: r.pName, phone: r.pPhone } };
        (0, utils_1.sendSuccess)(res, r);
    }
    catch (e) {
        next(e);
    }
});
router.post('/', (0, validate_1.validate)(createInspeksiSchema), async (req, res, next) => {
    try {
        // Validasi odometer tidak boleh lebih kecil dari nilai saat ini
        if (req.body.odometer && req.body.kendaraanId) {
            const kendaraan = await db_1.default.queryOne('SELECT odometer FROM kendaraan WHERE id = ?', [req.body.kendaraanId]);
            if (kendaraan && kendaraan.odometer !== null && req.body.odometer < kendaraan.odometer) {
                throw new errors_1.BadRequestError(`Odometer tidak boleh lebih kecil dari nilai terakhir (${kendaraan.odometer} km)`);
            }
        }
        const body = { ...req.body };
        if (body.kondisi && typeof body.kondisi === 'object')
            body.kondisi = JSON.stringify(body.kondisi);
        if (body.foto && Array.isArray(body.foto))
            body.foto = JSON.stringify(body.foto);
        const newId = await db_1.default.insert('inspeksi', body);
        const data = await db_1.default.queryOne('SELECT * FROM inspeksi WHERE id = ?', [newId]);
        if (req.body.odometer) {
            await db_1.default.update('kendaraan', { odometer: req.body.odometer, updatedAt: new Date() }, 'id = ?', [req.body.kendaraanId]);
        }
        (0, utils_1.sendCreated)(res, data, 'Inspeksi berhasil dicatat');
    }
    catch (e) {
        next(e);
    }
});
router.patch('/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        // Prevent editing locked inspeksi
        const existing = await db_1.default.queryOne('SELECT * FROM inspeksi WHERE id = ?', [id]);
        if (!existing)
            throw new errors_1.NotFoundError('Inspeksi');
        if (existing.status === 'locked' && req.body.status !== 'locked') {
            res.status(400).json({ success: false, message: 'Inspeksi ini sudah terkunci dan tidak dapat diubah.' });
            return;
        }
        const body = { ...req.body };
        if (body.kondisi && typeof body.kondisi === 'object')
            body.kondisi = JSON.stringify(body.kondisi);
        if (body.foto && Array.isArray(body.foto))
            body.foto = JSON.stringify(body.foto);
        await db_1.default.update('inspeksi', { ...body, updatedAt: new Date() }, 'id = ?', [id]);
        const data = await db_1.default.queryOne('SELECT * FROM inspeksi WHERE id = ?', [id]);
        (0, utils_1.sendSuccess)(res, data, 'Inspeksi berhasil diperbarui');
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=inspeksi.routes.js.map