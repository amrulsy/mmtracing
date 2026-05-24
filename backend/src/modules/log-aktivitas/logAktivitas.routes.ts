import { Router, Request, Response, NextFunction } from 'express';
import db from '../../config/db';
import { authMiddleware } from '../../middleware/auth';
import { sendSuccess, sendPaginated, parsePagination } from '../../shared/utils';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { module: mod, action, userId, search } = req.query;
    const conds: string[] = [];
    const params: any[] = [];
    if (mod) { conds.push('a.module = ?'); params.push(mod); }
    if (action) { conds.push('a.action = ?'); params.push(action); }
    if (userId) { conds.push('a.userId = ?'); params.push(Number(userId)); }
    if (search) {
      conds.push('(a.detail LIKE ? OR u.name LIKE ? OR a.action LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const [data, totalRow] = await Promise.all([
      db.query(
        `SELECT a.*, u.id AS uId, u.name AS uName, u.username AS uUsername
         FROM activity_logs a LEFT JOIN users u ON u.id = a.userId
         ${where} ORDER BY a.createdAt DESC LIMIT ? OFFSET ?`,
        [...params, limit, skip]),
      db.queryOne<{ c: number }>(`SELECT COUNT(*) AS c FROM activity_logs a LEFT JOIN users u ON u.id = a.userId ${where}`, params),
    ]);
    const rows = data.map((r: any) => ({ ...r, user: r.uId ? { id: r.uId, name: r.uName, username: r.uUsername } : null }));
    sendPaginated(res, rows, totalRow?.c ?? 0, page, limit);
  } catch (e) { next(e); }
});

export default router;
