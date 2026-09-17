"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../../config/db"));
const auth_1 = require("../../middleware/auth");
const utils_1 = require("../../shared/utils");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// GET /search?q=keyword
router.get('/', async (req, res, next) => {
    try {
        const q = (req.query.q || '').trim();
        // Minimum 2 karakter, otherwise return empty
        if (q.length < 2) {
            return (0, utils_1.sendSuccess)(res, { pelanggan: [], kendaraan: [], spk: [] });
        }
        const like = `%${q}%`;
        const [pelanggan, kendaraanRows, spkRows] = await Promise.all([
            db_1.default.query('SELECT id, name, phone FROM pelanggan WHERE (name LIKE ? OR phone LIKE ?) AND deletedAt IS NULL ORDER BY updatedAt DESC LIMIT 5', [like, like]),
            db_1.default.query(`SELECT k.id, k.name, k.plat, p.name AS pelangganName
         FROM kendaraan k LEFT JOIN pelanggan p ON p.id = k.pelangganId
         WHERE (k.name LIKE ? OR k.plat LIKE ?) AND k.deletedAt IS NULL ORDER BY k.updatedAt DESC LIMIT 5`, [like, like]),
            db_1.default.query(`SELECT s.id, s.noWo, s.status, p.name AS pelangganName, k.plat AS kendaraanPlat
         FROM work_orders s
         LEFT JOIN pelanggan p ON p.id = s.pelangganId
         LEFT JOIN kendaraan k ON k.id = s.kendaraanId
         WHERE (s.noWo LIKE ? OR p.name LIKE ? OR k.plat LIKE ?)
         ORDER BY s.updatedAt DESC LIMIT 5`, [like, like, like]),
        ]);
        const kendaraan = kendaraanRows.map((r) => ({ id: r.id, name: r.name, plat: r.plat, pelanggan: { name: r.pelangganName } }));
        const spk = spkRows.map((r) => ({ id: r.id, noWo: r.noWo, status: r.status, pelanggan: { name: r.pelangganName }, kendaraan: r.kendaraanPlat ? { plat: r.kendaraanPlat } : null }));
        (0, utils_1.sendSuccess)(res, { pelanggan, kendaraan, spk, workOrder: spk });
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=search.routes.js.map