import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import db from '../../config/db';
import { authMiddleware, requireRole, AuthRequest } from '../../middleware/auth';
import { sendSuccess, sendCreated } from '../../shared/utils';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { invalidateSetting } from '../../shared/settingsCache';

const upload = multer({ dest: 'uploads/' });

const router = Router();

// GET /pub/profile — Public Bengkel Profile (Tanpa Auth)
router.get('/pub/profile', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await db.query("SELECT * FROM settings WHERE `group` = 'bengkel'");
    const profile = data.reduce((acc: any, s: any) => { acc[s.key] = s.value; return acc; }, {});
    sendSuccess(res, profile);
  } catch (e) { next(e); }
});

// ===== USER MANAGEMENT =====
router.get('/users', authMiddleware, requireRole('Admin'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await db.query(
      `SELECT u.id, u.name, u.username, u.email, u.roleId, u.status, u.lastLogin,
              r.id AS rId, r.name AS rName
       FROM users u LEFT JOIN roles r ON r.id = u.roleId ORDER BY u.name ASC`);
    const rows = data.map((r: any) => ({ ...r, role: { id: r.rId, name: r.rName } }));
    sendSuccess(res, rows);
  } catch (e) { next(e); }
});

router.post('/users', authMiddleware, requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { password, ...rest } = req.body;
    const hashed = await bcrypt.hash(password, 12);
    const newId = await db.insert('users', { ...rest, password: hashed });
    const data = await db.queryOne('SELECT id, name, username, email, roleId, status FROM users WHERE id = ?', [newId]);
    sendCreated(res, data, 'User berhasil ditambahkan');
  } catch (e) { next(e); }
});

router.put('/users/:id', authMiddleware, requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { password, ...rest } = req.body;
    const updateData: any = rest;
    if (password) updateData.password = await bcrypt.hash(password, 12);
    const uid = Number(req.params.id);
    await db.update('users', { ...updateData, updatedAt: new Date() }, 'id = ?', [uid]);
    const data = await db.queryOne('SELECT id, name, username, email, roleId, status FROM users WHERE id = ?', [uid]);
    sendSuccess(res, data, 'User berhasil diperbarui');
  } catch (e) { next(e); }
});

router.delete('/users/:id', authMiddleware, requireRole('Admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
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
    sendSuccess(res, null, 'User berhasil dihapus');
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

router.post('/roles', authMiddleware, requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newId = await db.insert('roles', req.body);
    const data = await db.queryOne('SELECT * FROM roles WHERE id = ?', [newId]);
    sendCreated(res, data);
  } catch (e) { next(e); }
});

router.put('/roles/:id', authMiddleware, requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roleId = Number(req.params.id);
    const updateBody: any = { name: req.body.name, description: req.body.description };
    if (req.body.permissions !== undefined) updateBody.permissions = typeof req.body.permissions === 'string' ? req.body.permissions : JSON.stringify(req.body.permissions);
    await db.update('roles', updateBody, 'id = ?', [roleId]);
    const data = await db.queryOne('SELECT * FROM roles WHERE id = ?', [roleId]);
    sendSuccess(res, data, 'Role berhasil diperbarui');
  } catch (e) { next(e); }
});

router.delete('/roles/:id', authMiddleware, requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db.execute('DELETE FROM roles WHERE id = ?', [Number(req.params.id)]);
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

router.put('/config', authMiddleware, requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
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

router.put('/profile', authMiddleware, requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
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

router.put('/whatsapp', authMiddleware, requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await db.upsert('settings', { key, value: String(value), group: 'whatsapp' }, ['value']);
      invalidateSetting(key);
    }
    sendSuccess(res, null, 'Pengaturan WhatsApp berhasil disimpan');
  } catch (e) { next(e); }
});

router.post('/backup', authMiddleware, requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
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

router.post('/restore', authMiddleware, requireRole('Admin'), upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
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
