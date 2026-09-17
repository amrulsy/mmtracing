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
router.get('/', async (req, res, next) => {
    try {
        const { page, limit, skip } = (0, utils_1.parsePagination)(req.query);
        const { module: mod, action, userId, search } = req.query;
        const conds = [];
        const params = [];
        if (mod) {
            conds.push('a.module = ?');
            params.push(mod);
        }
        if (action) {
            conds.push('a.action = ?');
            params.push(action);
        }
        if (userId) {
            conds.push('a.userId = ?');
            params.push(Number(userId));
        }
        if (search) {
            conds.push('(a.detail LIKE ? OR u.name LIKE ? OR a.action LIKE ?)');
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
        const [data, totalRow] = await Promise.all([
            db_1.default.query(`SELECT a.*, u.id AS uId, u.name AS uName, u.username AS uUsername
         FROM activity_logs a LEFT JOIN users u ON u.id = a.userId
         ${where} ORDER BY a.createdAt DESC LIMIT ? OFFSET ?`, [...params, limit, skip]),
            db_1.default.queryOne(`SELECT COUNT(*) AS c FROM activity_logs a LEFT JOIN users u ON u.id = a.userId ${where}`, params),
        ]);
        const rows = data.map((r) => ({ ...r, user: r.uId ? { id: r.uId, name: r.uName, username: r.uUsername } : null }));
        (0, utils_1.sendPaginated)(res, rows, totalRow?.c ?? 0, page, limit);
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=logAktivitas.routes.js.map