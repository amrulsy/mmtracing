import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../../config/database';
import { authMiddleware, requireRole, AuthRequest } from '../../middleware/auth';
import { sendSuccess, sendCreated } from '../../shared/utils';

const router = Router();
router.use(authMiddleware);

// ===== USER MANAGEMENT =====
router.get('/users', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, username: true, email: true, roleId: true, status: true, lastLogin: true, role: true },
    });
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

router.post('/users', requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { password, ...rest } = req.body;
    const hashed = await bcrypt.hash(password, 12);
    const data = await prisma.user.create({ data: { ...rest, password: hashed } });
    sendCreated(res, { ...data, password: undefined }, 'User berhasil ditambahkan');
  } catch (e) { next(e); }
});

router.put('/users/:id', requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { password, ...rest } = req.body;
    const updateData: any = rest;
    if (password) updateData.password = await bcrypt.hash(password, 12);
    const data = await prisma.user.update({ where: { id: Number(req.params.id) }, data: updateData });
    sendSuccess(res, { ...data, password: undefined }, 'User berhasil diperbarui');
  } catch (e) { next(e); }
});

router.delete('/users/:id', requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.user.delete({ where: { id: Number(req.params.id) } });
    sendSuccess(res, null, 'User berhasil dihapus');
  } catch (e) { next(e); }
});

// ===== ROLES =====
router.get('/roles', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.role.findMany({ include: { _count: { select: { users: true } } } });
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

router.post('/roles', requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.role.create({ data: req.body });
    sendCreated(res, data);
  } catch (e) { next(e); }
});

// ===== SETTINGS (key-value) =====
router.get('/config', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.setting.findMany({ orderBy: { group: 'asc' } });
    const grouped = data.reduce((acc: any, s) => {
      if (!acc[s.group]) acc[s.group] = {};
      acc[s.group][s.key] = s.value;
      return acc;
    }, {});
    sendSuccess(res, grouped);
  } catch (e) { next(e); }
});

router.put('/config', requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entries = req.body; // { key: value, key2: value2, ... }
    for (const [key, value] of Object.entries(entries)) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }
    sendSuccess(res, null, 'Pengaturan berhasil disimpan');
  } catch (e) { next(e); }
});

// ===== PROFIL BENGKEL =====
router.get('/profile', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.setting.findMany({ where: { group: 'bengkel' } });
    const profile = data.reduce((acc: any, s) => { acc[s.key] = s.value; return acc; }, {});
    sendSuccess(res, profile);
  } catch (e) { next(e); }
});

router.put('/profile', requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value), group: 'bengkel' },
      });
    }
    sendSuccess(res, null, 'Profil bengkel berhasil disimpan');
  } catch (e) { next(e); }
});

export default router;
