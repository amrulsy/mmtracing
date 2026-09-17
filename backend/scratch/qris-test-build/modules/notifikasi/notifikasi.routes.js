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
// GET /notifikasi
router.get('/', async (req, res, next) => {
    try {
        const { page, limit, skip } = (0, utils_1.parsePagination)(req.query);
        const { type } = req.query;
        const userId = req.user.id;
        const conds = ['(userId = ? OR userId IS NULL)'];
        const params = [userId];
        if (type && type !== 'semua') {
            conds.push('type = ?');
            params.push(type);
        }
        const baseCond = conds.join(' AND ');
        const [data, totalRow, unreadRow] = await Promise.all([
            db_1.default.query(`SELECT * FROM notifikasi WHERE ${baseCond} ORDER BY createdAt DESC LIMIT ? OFFSET ?`, [...params, limit, skip]),
            db_1.default.queryOne(`SELECT COUNT(*) AS c FROM notifikasi WHERE ${baseCond}`, params),
            db_1.default.queryOne(`SELECT COUNT(*) AS c FROM notifikasi WHERE ${baseCond} AND isRead = 0`, params),
        ]);
        const unread = unreadRow?.c ?? 0;
        (0, utils_1.sendPaginated)(res, data, totalRow?.c ?? 0, page, limit, `${unread} belum dibaca`);
    }
    catch (e) {
        next(e);
    }
});
// PUT /notifikasi/read — mark all as read
router.put('/read', async (req, res, next) => {
    try {
        await db_1.default.execute('UPDATE notifikasi SET isRead = 1 WHERE (userId = ? OR userId IS NULL) AND isRead = 0', [req.user.id]);
        (0, utils_1.sendSuccess)(res, null, 'Semua notifikasi ditandai dibaca');
    }
    catch (e) {
        next(e);
    }
});
// PUT /notifikasi/:id/read  — mark single as read
router.put('/:id/read', async (req, res, next) => {
    try {
        await db_1.default.execute('UPDATE notifikasi SET isRead = 1 WHERE id = ?', [Number(req.params.id)]);
        (0, utils_1.sendSuccess)(res, null, 'Notifikasi ditandai dibaca');
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=notifikasi.routes.js.map