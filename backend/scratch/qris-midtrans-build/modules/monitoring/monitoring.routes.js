"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../../config/db"));
const auth_1 = require("../../middleware/auth");
const utils_1 = require("../../shared/utils");
const upload_1 = require("../../middleware/upload");
const wo_service_1 = require("../work-order/wo.service");
const errors_1 = require("../../shared/errors");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// GET /monitoring — Kanban board data
router.get('/', async (_req, res, next) => {
    try {
        const spks = await db_1.default.query(`SELECT s.*, p.name AS pelangganName,
              k.name AS kendaraanName, k.plat AS kendaraanPlat,
              m.id AS mekanikId2, m.name AS mekanikName, m.initial AS mekanikInitial, m.color AS mekanikColor
       FROM work_orders s
       LEFT JOIN pelanggan p ON p.id = s.pelangganId
       LEFT JOIN kendaraan k ON k.id = s.kendaraanId
       LEFT JOIN mekanik m ON m.id = s.mekanikId
       WHERE s.status IN ('antri','dikerjakan','kendala','selesai')
       ORDER BY s.prioritas DESC, s.createdAt ASC`);
        // Batch fetch stages & photos
        const spkIds = spks.map((s) => s.id);
        const [stages, photos] = spkIds.length ? await Promise.all([
            db_1.default.query('SELECT * FROM wo_stages WHERE woId IN (?) ORDER BY urutan ASC', [spkIds]),
            db_1.default.query('SELECT * FROM wo_photos WHERE woId IN (?) ORDER BY createdAt DESC', [spkIds]),
        ]) : [[], []];
        const stageMap = new Map();
        for (const st of stages) {
            if (!stageMap.has(st.woId))
                stageMap.set(st.woId, []);
            stageMap.get(st.woId).push(st);
        }
        const photoMap = new Map();
        for (const ph of photos) {
            if (!photoMap.has(ph.woId))
                photoMap.set(ph.woId, []);
            photoMap.get(ph.woId).push(ph);
        }
        const enriched = spks.map((s) => ({
            ...s,
            pelanggan: { name: s.pelangganName },
            kendaraan: s.kendaraanName ? { name: s.kendaraanName, plat: s.kendaraanPlat } : null,
            mekanik: s.mekanikId2 ? { id: s.mekanikId2, name: s.mekanikName, initial: s.mekanikInitial, color: s.mekanikColor } : null,
            stages: stageMap.get(s.id) || [],
            photos: (photoMap.get(s.id) || []).slice(0, 3),
        }));
        const kanban = {
            antri: enriched.filter((s) => s.status === 'antri'),
            dikerjakan: enriched.filter((s) => s.status === 'dikerjakan'),
            kendala: enriched.filter((s) => s.status === 'kendala'),
            selesai: enriched.filter((s) => s.status === 'selesai'),
        };
        (0, utils_1.sendSuccess)(res, kanban);
    }
    catch (e) {
        next(e);
    }
});
// GET /monitoring/:id — detail
router.get('/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const data = await db_1.default.queryOne('SELECT * FROM work_orders WHERE id = ?', [id]);
        if (!data)
            throw new errors_1.NotFoundError('Work Order');
        const [pelanggan, kendaraan, mekanik, items, stages, photos] = await Promise.all([
            db_1.default.queryOne('SELECT * FROM pelanggan WHERE id = ?', [data.pelangganId]),
            data.kendaraanId ? db_1.default.queryOne('SELECT * FROM kendaraan WHERE id = ?', [data.kendaraanId]) : null,
            data.mekanikId ? db_1.default.queryOne('SELECT * FROM mekanik WHERE id = ?', [data.mekanikId]) : null,
            db_1.default.query('SELECT * FROM wo_items WHERE woId = ?', [id]),
            db_1.default.query('SELECT * FROM wo_stages WHERE woId = ? ORDER BY urutan ASC', [id]),
            db_1.default.query('SELECT * FROM wo_photos WHERE woId = ? ORDER BY createdAt DESC', [id]),
        ]);
        data.pelanggan = pelanggan;
        data.kendaraan = kendaraan;
        data.mekanik = mekanik;
        data.items = items;
        data.stages = stages;
        data.photos = photos;
        (0, utils_1.sendSuccess)(res, data);
    }
    catch (e) {
        next(e);
    }
});
// PUT /monitoring/:id/status — update status dari Kanban (via woService agar semua business logic berjalan)
router.put('/:id/status', async (req, res, next) => {
    try {
        const data = await wo_service_1.woService.updateStatus(Number(req.params.id), { status: req.body.status, catatan: req.body.catatan, progress: req.body.progress }, req.user?.id);
        (0, utils_1.sendSuccess)(res, data, 'Status berhasil diperbarui');
    }
    catch (e) {
        next(e);
    }
});
// POST /monitoring/:id/foto — upload progress photo
router.post('/:id/foto', upload_1.upload.single('photo'), async (req, res, next) => {
    try {
        const file = req.file;
        if (!file)
            return res.status(400).json({ success: false, message: 'File wajib diupload' });
        const photoId = await db_1.default.insert('wo_photos', {
            woId: Number(req.params.id),
            url: `/uploads/${file.filename}`,
            caption: req.body.caption || '',
            type: req.body.type || 'progress',
        });
        const photo = await db_1.default.queryOne('SELECT * FROM wo_photos WHERE id = ?', [photoId]);
        (0, utils_1.sendSuccess)(res, photo, 'Foto berhasil diupload');
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=monitoring.routes.js.map