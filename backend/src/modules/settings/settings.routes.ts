import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import db from '../../config/db';
import { authMiddleware, requireRole, requirePermission, AuthRequest } from '../../middleware/auth';
import { sendSuccess, sendCreated } from '../../shared/utils';
import { PERMISSION_MODULES } from '../../shared/permissions';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { invalidateSetting } from '../../shared/settingsCache';
import { appCache } from '../../shared/cache';
import { z } from 'zod';
import { validate } from '../../middleware/validate';
import { BadRequestError } from '../../shared/errors';
import { decodeQrisImage, getQrisSettings, saveQrisSettings } from '../pembayaran/qris.service';

const upload = multer({ dest: 'uploads/' });

const router = Router();

const qrisUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 } });
router.get('/qris', authMiddleware, requirePermission('settings', 'full'), async (_req, res, next) => {
  try { sendSuccess(res, await getQrisSettings()); } catch (e) { next(e); }
});
router.post('/qris/preview', authMiddleware, requirePermission('settings', 'full'), (req, res, next) => {
  qrisUpload.single('file')(req, res, e => {
    if (e) return next(new BadRequestError('Unggah satu gambar QRIS, maksimal 5 MB.'));
    next();
  });
}, async (req, res, next) => {
  try {
    if (!req.file) throw new BadRequestError('Pilih gambar QRIS terlebih dahulu.');
    sendSuccess(res, await decodeQrisImage(req.file.buffer));
  } catch (e) { next(e); }
});
router.put('/qris', authMiddleware, requirePermission('settings', 'full'), validate(z.object({
  payload: z.string().max(4096).default(''), enabled: z.boolean(), mode: z.enum(['static', 'midtrans', 'legacy']).default('legacy'),
  midtransServerKey: z.string().optional(), midtransEnvironment: z.enum(['sandbox', 'production']).optional(),
})), async (req: AuthRequest, res, next) => {
  try { sendSuccess(res, await saveQrisSettings(req.body.payload, req.body.enabled, req.user!.id, req.body.mode, req.body.midtransServerKey, req.body.midtransEnvironment), 'Pengaturan QRIS disimpan'); }
  catch (e) { next(e); }
});

// Keep QRIS configuration behind the validated, audited endpoint above.
router.use((req, _res, next) => {
  if (['PUT', 'POST', 'PATCH'].includes(req.method) && req.body && Object.keys(req.body).some(key => key.trim().toLowerCase() === 'qris_config')) {
    return next(new BadRequestError('Gunakan menu Pengaturan QRIS untuk mengubah QRIS.'));
  }
  next();
});

// GET /pub/profile — Public Bengkel Profile (Tanpa Auth)
router.get('/pub/profile', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await db.query("SELECT * FROM settings WHERE `group` = 'bengkel'");
    const profile = data.reduce((acc: any, s: any) => { acc[s.key] = s.value; return acc; }, {});
    sendSuccess(res, profile);
  } catch (e) { next(e); }
});

// ===== USER MANAGEMENT =====
router.get('/users', authMiddleware, requirePermission('settings', 'full'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await db.query(
      `SELECT u.id, u.name, u.username, u.email, u.roleId, u.status, u.lastLogin,
              r.id AS rId, r.name AS rName
       FROM users u LEFT JOIN roles r ON r.id = u.roleId ORDER BY u.name ASC`);
    const rows = data.map((r: any) => ({ ...r, role: { id: r.rId, name: r.rName } }));
    sendSuccess(res, rows);
  } catch (e) { next(e); }
});

router.post('/users', authMiddleware, requirePermission('settings', 'full'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { password, ...rest } = req.body;
    const hashed = await bcrypt.hash(password, 12);
    const newId = await db.insert('users', { ...rest, password: hashed });
    const data = await db.queryOne('SELECT id, name, username, email, roleId, status FROM users WHERE id = ?', [newId]);
    sendCreated(res, data, 'User berhasil ditambahkan');
  } catch (e) { next(e); }
});

router.put('/users/:id', authMiddleware, requirePermission('settings', 'full'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { password, ...rest } = req.body;
    const updateData: any = rest;
    if (password) updateData.password = await bcrypt.hash(password, 12);
    const uid = Number(req.params.id);
    await db.update('users', { ...updateData, updatedAt: new Date() }, 'id = ?', [uid]);
    appCache.invalidate(`auth_user_${uid}`);
    const data = await db.queryOne('SELECT id, name, username, email, roleId, status FROM users WHERE id = ?', [uid]);
    sendSuccess(res, data, 'User berhasil diperbarui');
  } catch (e) { next(e); }
});

router.delete('/users/:id', authMiddleware, requirePermission('settings', 'full'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const targetId = Number(req.params.id);
    if (req.user?.id === targetId) {
      return res.status(400).json({ success: false, message: 'Tidak dapat menghapus akun Anda sendiri' });
    }
    const targetUser = await db.queryOne<any>(
      'SELECT u.*, r.name AS roleName FROM users u LEFT JOIN roles r ON r.id = u.roleId WHERE u.id = ?', [targetId]);
    if (targetUser?.roleName === 'Admin') {
      const adminCount = await db.queryVal<number>(
        "SELECT COUNT(*) FROM users u JOIN roles r ON r.id = u.roleId WHERE r.name = 'Admin' AND u.status = 'aktif' AND u.id != ?", [targetId]);
      if (adminCount === 0) {
        return res.status(400).json({ success: false, message: 'Tidak dapat menghapus Admin terakhir. Tambahkan Admin lain terlebih dahulu.' });
      }
    }
    await db.execute('DELETE FROM users WHERE id = ?', [targetId]);
    appCache.invalidate(`auth_user_${targetId}`);
    sendSuccess(res, null, 'User berhasil dihapus');
  } catch (e) { next(e); }
});

// ===== PERMISSION MODULES (untuk frontend roles page) =====
router.get('/modules', authMiddleware, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, PERMISSION_MODULES);
  } catch (e) { next(e); }
});

// ===== ROLES =====
router.get('/roles', authMiddleware, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await db.query(
      'SELECT r.*, (SELECT COUNT(*) FROM users WHERE roleId = r.id) AS _countUsers FROM roles r');
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

router.post('/roles', authMiddleware, requirePermission('settings', 'full'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = { ...req.body };
    if (payload.permissions && typeof payload.permissions !== 'string') {
      payload.permissions = JSON.stringify(payload.permissions);
    }
    const newId = await db.insert('roles', payload);
    const data = await db.queryOne('SELECT * FROM roles WHERE id = ?', [newId]);
    sendCreated(res, data);
  } catch (e) { next(e); }
});

router.put('/roles/:id', authMiddleware, requirePermission('settings', 'full'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roleId = Number(req.params.id);
    // Protect Admin role from name change
    const existing = await db.queryOne<any>('SELECT name FROM roles WHERE id = ?', [roleId]);
    if (existing?.name === 'Admin' && req.body.name && req.body.name !== 'Admin') {
      return res.status(400).json({ success: false, message: 'Tidak dapat mengubah nama role Admin.' });
    }
    const updateBody: any = { name: req.body.name, description: req.body.description };
    if (req.body.permissions !== undefined) updateBody.permissions = typeof req.body.permissions === 'string' ? req.body.permissions : JSON.stringify(req.body.permissions);
    await db.update('roles', updateBody, 'id = ?', [roleId]);
    // Invalidate auth cache for all users with this role
    const affectedUsers = await db.query('SELECT id FROM users WHERE roleId = ?', [roleId]);
    for (const u of affectedUsers) appCache.invalidate(`auth_user_${u.id}`);
    const data = await db.queryOne('SELECT * FROM roles WHERE id = ?', [roleId]);
    sendSuccess(res, data, 'Role berhasil diperbarui');
  } catch (e) { next(e); }
});

router.delete('/roles/:id', authMiddleware, requirePermission('settings', 'full'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roleId = Number(req.params.id);
    // Protect Admin role from deletion
    const role = await db.queryOne<any>('SELECT name FROM roles WHERE id = ?', [roleId]);
    if (role?.name === 'Admin') {
      return res.status(400).json({ success: false, message: 'Role Admin tidak dapat dihapus.' });
    }
    // Check if role still has active users
    const userCount = await db.queryVal<number>('SELECT COUNT(*) FROM users WHERE roleId = ?', [roleId]);
    if (userCount && userCount > 0) {
      return res.status(400).json({ success: false, message: `Role ini masih memiliki ${userCount} user aktif. Pindahkan user ke role lain terlebih dahulu.` });
    }
    await db.execute('DELETE FROM roles WHERE id = ?', [roleId]);
    sendSuccess(res, null, 'Role berhasil dihapus');
  } catch (e) { next(e); }
});

// ===== SETTINGS (key-value) =====
router.get('/config', authMiddleware, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await db.query('SELECT * FROM settings ORDER BY `group` ASC');
    const grouped = data.reduce((acc: any, s) => {
      if (!acc[s.group]) acc[s.group] = {};
      acc[s.group][s.key] = s.value;
      return acc;
    }, {});
    sendSuccess(res, grouped);
  } catch (e) { next(e); }
});

router.put('/config', authMiddleware, requirePermission('settings', 'full'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entries = Object.entries(req.body as Record<string, unknown>);
    await db.transaction(async (tx) => {
      for (const [key, value] of entries) {
        await tx.upsert('settings', { key, value: String(value) }, ['value']);
      }
    });
    entries.forEach(([key]) => invalidateSetting(key));
    sendSuccess(res, null, 'Pengaturan berhasil disimpan');
  } catch (e) { next(e); }
});

// ===== PROFIL BENGKEL =====
router.get('/profile', authMiddleware, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await db.query("SELECT * FROM settings WHERE `group` = 'bengkel'");
    const profile = data.reduce((acc: any, s: any) => { acc[s.key] = s.value; return acc; }, {});
    sendSuccess(res, profile);
  } catch (e) { next(e); }
});

router.put('/profile', authMiddleware, requirePermission('settings', 'full'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entries = Object.entries(req.body as Record<string, unknown>);
    await db.transaction(async (tx) => {
      for (const [key, value] of entries) {
        await tx.upsert('settings', { key, value: String(value), group: 'bengkel' }, ['value']);
      }
    });
    entries.forEach(([key]) => invalidateSetting(key));
    sendSuccess(res, null, 'Profil bengkel berhasil disimpan');
  } catch (e) { next(e); }
});

router.put('/whatsapp', authMiddleware, requirePermission('settings', 'full'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await db.upsert('settings', { key, value: String(value), group: 'whatsapp' }, ['value']);
      invalidateSetting(key);
    }
    sendSuccess(res, null, 'Pengaturan WhatsApp berhasil disimpan');
  } catch (e) { next(e); }
});

router.post('/backup', authMiddleware, requirePermission('settings', 'full'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const backupData: any = {};
    const users = await db.query('SELECT id, name, username, email, roleId, status FROM users');
    const tables = ['roles', 'pelanggan', 'kendaraan', 'mekanik', 'jasa', 'sparepart', 'spk', 'pembayaran'];
    backupData['users'] = users;
    for (const table of tables) {
      backupData[table] = await db.query(`SELECT * FROM \`${table}\``);
    }
    const backupDir = path.resolve(__dirname, '../../../../backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const filename = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filePath = path.join(backupDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.sendFile(filePath);
  } catch (e) { next(e); }
});

router.post('/restore', authMiddleware, requirePermission('settings', 'full'), upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'File backup tidak ditemukan' });
    const d = fs.readFileSync(req.file.path, 'utf8');
    const backupData = JSON.parse(d);
    if (!backupData || !backupData.pelanggan) return res.status(400).json({ success: false, message: 'Format backup tidak valid' });
    sendSuccess(res, null, 'File backup valid dan proses restore diregistrasi');
  } catch (e) { next(e); } finally {
    if (req.file) fs.unlinkSync(req.file.path);
  }
});

export default router;
