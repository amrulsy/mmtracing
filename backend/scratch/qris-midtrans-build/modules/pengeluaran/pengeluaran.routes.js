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
    kategoriId: zod_1.z.number().int().positive(),
    tanggal: zod_1.z.string().transform(v => new Date(v)).optional(),
    deskripsi: zod_1.z.string().min(1),
    jumlah: zod_1.z.number().positive(),
    metode: zod_1.z.string().min(1),
    oleh: zod_1.z.string().optional(),
});
router.get('/', async (req, res, next) => {
    try {
        const { page, limit, skip } = (0, utils_1.parsePagination)(req.query);
        const { kategoriId, month, year } = req.query;
        const conds = [];
        const params = [];
        if (kategoriId) {
            conds.push('pe.kategoriId = ?');
            params.push(Number(kategoriId));
        }
        if (month && year) {
            const start = new Date(Number(year), Number(month) - 1, 1);
            const end = new Date(Number(year), Number(month), 0, 23, 59, 59);
            conds.push('pe.tanggal >= ? AND pe.tanggal <= ?');
            params.push(start, end);
        }
        const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
        const [data, totalRow] = await Promise.all([
            db_1.default.query(`SELECT pe.*, kp.name AS kategoriName
         FROM pengeluaran pe LEFT JOIN kategori_pengeluaran kp ON kp.id = pe.kategoriId
         ${where} ORDER BY pe.tanggal DESC LIMIT ? OFFSET ?`, [...params, limit, skip]),
            db_1.default.queryOne(`SELECT COUNT(*) AS c FROM pengeluaran pe ${where}`, params),
        ]);
        const rows = data.map((r) => ({ ...r, kategori: r.kategoriId ? { id: r.kategoriId, name: r.kategoriName } : null }));
        (0, utils_1.sendPaginated)(res, rows, totalRow?.c ?? 0, page, limit);
    }
    catch (e) {
        next(e);
    }
});
router.get('/summary', async (req, res, next) => {
    try {
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        const [bulanIniRow, bulanLaluRow, byKategori, categories] = await Promise.all([
            db_1.default.queryOne('SELECT COALESCE(SUM(jumlah),0) AS total, COUNT(*) AS cnt FROM pengeluaran WHERE tanggal >= ?', [thisMonth]),
            db_1.default.queryOne('SELECT COALESCE(SUM(jumlah),0) AS total FROM pengeluaran WHERE tanggal >= ? AND tanggal <= ?', [lastMonth, lastMonthEnd]),
            db_1.default.query(`SELECT kategoriId, COALESCE(SUM(jumlah),0) AS _sumJumlah, COUNT(*) AS _count
         FROM pengeluaran WHERE tanggal >= ? GROUP BY kategoriId`, [thisMonth]),
            db_1.default.query('SELECT * FROM kategori_pengeluaran'),
        ]);
        const breakdown = byKategori.map((k) => ({
            ...k,
            kategori: categories.find((c) => c.id === k.kategoriId)?.name || 'Lainnya',
        }));
        (0, utils_1.sendSuccess)(res, {
            bulanIni: bulanIniRow?.total || 0,
            bulanIniCount: bulanIniRow?.cnt || 0,
            bulanLalu: bulanLaluRow?.total || 0,
            breakdown,
        });
    }
    catch (e) {
        next(e);
    }
});
router.get('/categories', async (_req, res, next) => {
    try {
        const data = await db_1.default.query('SELECT * FROM kategori_pengeluaran ORDER BY name ASC');
        (0, utils_1.sendSuccess)(res, data);
    }
    catch (e) {
        next(e);
    }
});
router.post('/categories', (0, auth_1.requirePermission)('pembayaran', 'full'), async (req, res, next) => {
    try {
        const newId = await db_1.default.insert('kategori_pengeluaran', { name: req.body.name });
        const data = await db_1.default.queryOne('SELECT * FROM kategori_pengeluaran WHERE id = ?', [newId]);
        (0, utils_1.sendCreated)(res, data);
    }
    catch (e) {
        next(e);
    }
});
router.put('/categories/:id', (0, auth_1.requirePermission)('pembayaran', 'full'), async (req, res, next) => {
    try {
        const katId = Number(req.params.id);
        await db_1.default.update('kategori_pengeluaran', { name: req.body.name }, 'id = ?', [katId]);
        const data = await db_1.default.queryOne('SELECT * FROM kategori_pengeluaran WHERE id = ?', [katId]);
        (0, utils_1.sendSuccess)(res, data, 'Kategori berhasil diperbarui');
    }
    catch (e) {
        next(e);
    }
});
router.delete('/categories/:id', (0, auth_1.requirePermission)('pembayaran', 'full'), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const inUse = await db_1.default.queryVal('SELECT COUNT(*) FROM pengeluaran WHERE kategoriId = ?', [id]);
        if (inUse > 0) {
            throw new errors_1.BadRequestError(`Kategori ini masih digunakan oleh ${inUse} pengeluaran dan tidak dapat dihapus.`);
        }
        await db_1.default.execute('DELETE FROM kategori_pengeluaran WHERE id = ?', [id]);
        (0, utils_1.sendSuccess)(res, null, 'Kategori berhasil dihapus');
    }
    catch (e) {
        next(e);
    }
});
router.post('/', (0, auth_1.requirePermission)('pengeluaran', 'edit'), (0, validate_1.validate)(createSchema), async (req, res, next) => {
    try {
        const newId = await db_1.default.insert('pengeluaran', req.body);
        const data = await db_1.default.queryOne('SELECT * FROM pengeluaran WHERE id = ?', [newId]);
        (0, utils_1.sendCreated)(res, data, 'Pengeluaran berhasil dicatat');
    }
    catch (e) {
        next(e);
    }
});
router.put('/:id', (0, auth_1.requirePermission)('pembayaran', 'full'), async (req, res, next) => {
    try {
        const peId = Number(req.params.id);
        await db_1.default.update('pengeluaran', { ...req.body, updatedAt: new Date() }, 'id = ?', [peId]);
        const data = await db_1.default.queryOne('SELECT * FROM pengeluaran WHERE id = ?', [peId]);
        (0, utils_1.sendSuccess)(res, data, 'Pengeluaran berhasil diperbarui');
    }
    catch (e) {
        next(e);
    }
});
router.delete('/:id', (0, auth_1.requirePermission)('pembayaran', 'full'), async (req, res, next) => {
    try {
        await db_1.default.execute('DELETE FROM pengeluaran WHERE id = ?', [Number(req.params.id)]);
        (0, utils_1.sendSuccess)(res, null, 'Pengeluaran berhasil dihapus');
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=pengeluaran.routes.js.map