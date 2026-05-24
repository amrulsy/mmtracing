import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import db from '../../config/db';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { sendSuccess, sendCreated } from '../../shared/utils';
import { NotFoundError, BadRequestError } from '../../shared/errors';

const router = Router();
router.use(authMiddleware);

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
});

// GET /supplier — list all with sparepart count + search
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search } = req.query;
    const conds: string[] = [];
    const params: any[] = [];
    if (search) {
      conds.push('(s.name LIKE ? OR s.phone LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const data = await db.query(
      `SELECT s.*,
              (SELECT COUNT(*) FROM sparepart sp WHERE sp.supplierId = s.id) AS _countSparepart,
              (SELECT COUNT(*) FROM inventaris_log il WHERE il.supplierId = s.id) AS _countInventarisLog
       FROM supplier s ${where}
       ORDER BY s.name ASC`,
      params,
    );
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

// GET /supplier/:id — detail with spareparts + purchase history
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const data = await db.queryOne('SELECT * FROM supplier WHERE id = ?', [id]);
    if (!data) throw new NotFoundError('Supplier');

    const [spareparts, logs] = await Promise.all([
      db.query(
        `SELECT sp.*, ks.id AS kategoriId, ks.name AS kategoriName
         FROM sparepart sp
         LEFT JOIN kategori_sparepart ks ON ks.id = sp.kategoriId
         WHERE sp.supplierId = ?
         ORDER BY sp.name ASC`,
        [id],
      ),
      db.query(
        `SELECT il.*, sp.id AS sparepartId, sp.kode AS sparepartKode, sp.name AS sparepartName
         FROM inventaris_log il
         LEFT JOIN sparepart sp ON sp.id = il.sparepartId
         WHERE il.supplierId = ?
         ORDER BY il.createdAt DESC LIMIT 30`,
        [id],
      ),
    ]);

    (data as any).sparepart = spareparts.map((sp: any) => ({
      ...sp,
      kategori: sp.kategoriId ? { id: sp.kategoriId, name: sp.kategoriName } : null,
    }));
    (data as any).inventarisLog = logs.map((l: any) => ({
      ...l,
      sparepart: { id: l.sparepartId, kode: l.sparepartKode, name: l.sparepartName },
    }));

    sendSuccess(res, data);
  } catch (e) { next(e); }
});

// POST /supplier
router.post('/', validate(createSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = await db.insert('supplier', req.body);
    const data = await db.queryOne('SELECT * FROM supplier WHERE id = ?', [id]);
    await db.insert('activity_logs', {
      userId: (req as any).user?.id ?? null,
      action: 'create', module: 'master',
      targetId: id, targetName: req.body.name,
    });
    sendCreated(res, data, 'Supplier berhasil ditambahkan');
  } catch (e) { next(e); }
});

// PUT /supplier/:id
router.put('/:id', validate(updateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    await db.update('supplier', { ...req.body, updatedAt: new Date() }, 'id = ?', [id]);
    const data = await db.queryOne('SELECT * FROM supplier WHERE id = ?', [id]);
    await db.insert('activity_logs', {
      userId: (req as any).user?.id ?? null,
      action: 'update', module: 'master',
      targetId: id, targetName: data?.name,
    });
    sendSuccess(res, data, 'Supplier berhasil diperbarui');
  } catch (e) { next(e); }
});

// PATCH /supplier/:id
router.patch('/:id', validate(updateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    await db.update('supplier', { ...req.body, updatedAt: new Date() }, 'id = ?', [id]);
    const data = await db.queryOne('SELECT * FROM supplier WHERE id = ?', [id]);
    await db.insert('activity_logs', {
      userId: (req as any).user?.id ?? null,
      action: 'update', module: 'master',
      targetId: id, targetName: data?.name,
    });
    sendSuccess(res, data, 'Supplier berhasil diperbarui');
  } catch (e) { next(e); }
});

// DELETE /supplier/:id — with protection
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);

    // Cek apakah supplier masih punya sparepart
    const sparepartCount = await db.queryVal<number>('SELECT COUNT(*) FROM sparepart WHERE supplierId = ?', [id]);
    if (sparepartCount > 0) {
      throw new BadRequestError(
        `Supplier ini masih terhubung dengan ${sparepartCount} sparepart dan tidak dapat dihapus. Pindahkan sparepart ke supplier lain terlebih dahulu.`
      );
    }

    // Cek apakah supplier masih punya log inventaris
    const logCount = await db.queryVal<number>('SELECT COUNT(*) FROM inventaris_log WHERE supplierId = ?', [id]);
    if (logCount > 0) {
      throw new BadRequestError(
        `Supplier ini memiliki ${logCount} riwayat transaksi inventaris dan tidak dapat dihapus untuk menjaga integritas data historis.`
      );
    }

    const supplier = await db.queryOne<{ name: string }>('SELECT name FROM supplier WHERE id = ?', [id]);
    await db.execute('DELETE FROM supplier WHERE id = ?', [id]);
    await db.insert('activity_logs', {
      userId: (req as any).user?.id ?? null,
      action: 'delete', module: 'master',
      targetId: id, targetName: supplier?.name,
    });
    sendSuccess(res, null, 'Supplier berhasil dihapus');
  } catch (e) { next(e); }
});

export default router;
