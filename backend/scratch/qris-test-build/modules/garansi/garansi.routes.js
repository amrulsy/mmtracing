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
const claimSchema = zod_1.z.object({
    garansiId: zod_1.z.number().int().positive(),
    reason: zod_1.z.string().min(3, 'Alasan klaim minimal 3 karakter'),
});
const claimUpdateSchema = zod_1.z.object({
    status: zod_1.z.enum(['pending', 'approved', 'rejected', 'resolved']),
    resolution: zod_1.z.string().optional(),
});
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// GET /garansi
router.get('/', async (req, res, next) => {
    try {
        const { status, type } = req.query;
        const conds = [];
        const params = [];
        if (status && status !== 'semua') {
            conds.push('g.status = ?');
            params.push(status);
        }
        if (type) {
            conds.push('g.type = ?');
            params.push(type);
        }
        const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
        const rows = await db_1.default.query(`SELECT g.*, s.noWo, s.pelangganId, s.kendaraanId,
              p.name AS pelangganName, p.phone AS pelangganPhone,
              k.name AS kendaraanName, k.plat AS kendaraanPlat
       FROM garansi g
       LEFT JOIN work_orders s ON s.id = g.woId
       LEFT JOIN pelanggan p ON p.id = s.pelangganId
       LEFT JOIN kendaraan k ON k.id = s.kendaraanId
       ${where} ORDER BY g.endDate ASC`, params);
        // Fetch claims for all garansi
        const gIds = rows.map((r) => r.id);
        const claims = gIds.length ? await db_1.default.query('SELECT * FROM garansi_claims WHERE garansiId IN (?)', [gIds]) : [];
        const claimMap = new Map();
        for (const c of claims) {
            if (!claimMap.has(c.garansiId))
                claimMap.set(c.garansiId, []);
            claimMap.get(c.garansiId).push(c);
        }
        const now = new Date();
        const enriched = rows.map((g) => {
            const diffMs = new Date(g.endDate).getTime() - now.getTime();
            const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            let computedStatus = g.status;
            if (daysLeft <= 0)
                computedStatus = 'expired';
            else if (daysLeft <= 7)
                computedStatus = 'hampir';
            else
                computedStatus = 'aktif';
            return {
                ...g, daysLeft, computedStatus,
                spk: { id: g.woId, noWo: g.noWo, pelanggan: { id: g.pelangganId, name: g.pelangganName, phone: g.pelangganPhone }, kendaraan: g.kendaraanId ? { id: g.kendaraanId, name: g.kendaraanName, plat: g.kendaraanPlat } : null },
                claims: claimMap.get(g.id) || [],
            };
        });
        (0, utils_1.sendSuccess)(res, enriched);
    }
    catch (e) {
        next(e);
    }
});
// POST /garansi/sync-status — Auto-update garansi statuses in DB
router.post('/sync-status', (0, auth_1.requirePermission)('monitoring', 'full'), async (_req, res, next) => {
    try {
        const now = new Date();
        const almostExpiredDate = new Date();
        almostExpiredDate.setDate(now.getDate() + 7);
        const result = await db_1.default.transaction(async (tx) => {
            const r1 = await tx.execute("UPDATE garansi SET status = 'expired' WHERE endDate <= ? AND status != 'expired'", [now]);
            const r2 = await tx.execute("UPDATE garansi SET status = 'hampir' WHERE endDate > ? AND endDate <= ? AND status NOT IN ('expired','hampir')", [now, almostExpiredDate]);
            const r3 = await tx.execute("UPDATE garansi SET status = 'aktif' WHERE endDate > ? AND status != 'aktif'", [almostExpiredDate]);
            return { expired: r1.affectedRows, hampir: r2.affectedRows, aktif: r3.affectedRows };
        });
        (0, utils_1.sendSuccess)(res, result, 'Sinkronisasi status garansi berhasil');
    }
    catch (e) {
        next(e);
    }
});
// GET /garansi/claims
router.get('/claims', async (_req, res, next) => {
    try {
        const data = await db_1.default.query(`SELECT gc.*, g.itemName, g.type AS garansiType, g.startDate, g.endDate, g.status AS garansiStatus,
              s.noWo, p.name AS pelangganName, p.phone AS pelangganPhone
       FROM garansi_claims gc
       LEFT JOIN garansi g ON g.id = gc.garansiId
       LEFT JOIN work_orders s ON s.id = g.woId
       LEFT JOIN pelanggan p ON p.id = s.pelangganId
       ORDER BY gc.createdAt DESC`);
        const rows = data.map((r) => ({
            ...r,
            garansi: { id: r.garansiId, itemName: r.itemName, type: r.garansiType, startDate: r.startDate, endDate: r.endDate, status: r.garansiStatus,
                spk: { noWo: r.noWo, pelanggan: { name: r.pelangganName, phone: r.pelangganPhone } } },
        }));
        (0, utils_1.sendSuccess)(res, rows);
    }
    catch (e) {
        next(e);
    }
});
// POST /garansi/claim
router.post('/claim', (0, validate_1.validate)(claimSchema), async (req, res, next) => {
    try {
        const { garansiId, reason } = req.body;
        // Validasi apakah garansi sudah expired
        const garansi = await db_1.default.queryOne('SELECT * FROM garansi WHERE id = ?', [garansiId]);
        if (!garansi)
            throw new errors_1.NotFoundError('Garansi');
        if (new Date(garansi.endDate) < new Date() || garansi.status === 'expired') {
            throw new errors_1.BadRequestError('Masa berlaku garansi ini sudah habis dan tidak dapat diklaim lagi.');
        }
        const claimId = await db_1.default.insert('garansi_claims', { garansiId, reason });
        const claim = await db_1.default.queryOne('SELECT * FROM garansi_claims WHERE id = ?', [claimId]);
        (0, utils_1.sendCreated)(res, claim, 'Klaim garansi berhasil dibuat');
    }
    catch (e) {
        next(e);
    }
});
// PUT /garansi/claim/:id — resolve claim
router.put('/claim/:id', (0, auth_1.requirePermission)('monitoring', 'full'), (0, validate_1.validate)(claimUpdateSchema), async (req, res, next) => {
    try {
        const claimId = Number(req.params.id);
        await db_1.default.update('garansi_claims', { status: req.body.status, resolution: req.body.resolution, updatedAt: new Date() }, 'id = ?', [claimId]);
        const data = await db_1.default.queryOne('SELECT * FROM garansi_claims WHERE id = ?', [claimId]);
        (0, utils_1.sendSuccess)(res, data, 'Klaim berhasil diperbarui');
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=garansi.routes.js.map