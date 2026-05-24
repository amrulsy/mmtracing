import { Router, Request, Response, NextFunction } from 'express';
import db from '../../config/db';
import { authMiddleware, AuthRequest } from '../../middleware/auth';
import { sendSuccess, sendPaginated, parsePagination } from '../../shared/utils';

const router = Router();
router.use(authMiddleware);

// GET /notifikasi
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { type } = req.query;
    const userId = req.user!.id;
    const conds: string[] = ['(userId = ? OR userId IS NULL)'];
    const params: any[] = [userId];
    if (type && type !== 'semua') { conds.push('type = ?'); params.push(type); }
    const baseCond = conds.join(' AND ');
    const [data, totalRow, unreadRow] = await Promise.all([
      db.query(`SELECT * FROM notifikasi WHERE ${baseCond} ORDER BY createdAt DESC LIMIT ? OFFSET ?`, [...params, limit, skip]),
      db.queryOne<{ c: number }>(`SELECT COUNT(*) AS c FROM notifikasi WHERE ${baseCond}`, params),
      db.queryOne<{ c: number }>(`SELECT COUNT(*) AS c FROM notifikasi WHERE ${baseCond} AND isRead = 0`, params),
    ]);
    const unread = unreadRow?.c ?? 0;
    sendPaginated(res, data, totalRow?.c ?? 0, page, limit, `${unread} belum dibaca`);
  } catch (e) { next(e); }
});

// PUT /notifikasi/read — mark all as read
router.put('/read', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await db.execute(
      'UPDATE notifikasi SET isRead = 1 WHERE (userId = ? OR userId IS NULL) AND isRead = 0',
      [req.user!.id],
    );
    sendSuccess(res, null, 'Semua notifikasi ditandai dibaca');
  } catch (e) { next(e); }
});

// PUT /notifikasi/:id/read  — mark single as read
router.put('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db.execute('UPDATE notifikasi SET isRead = 1 WHERE id = ?', [Number(req.params.id)]);
    sendSuccess(res, null, 'Notifikasi ditandai dibaca');
  } catch (e) { next(e); }
});

export default router;
