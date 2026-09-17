"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = __importDefault(require("../../config/db"));
const auth_1 = require("../../middleware/auth");
const utils_1 = require("../../shared/utils");
const permissions_1 = require("../../shared/permissions");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
const settingsCache_1 = require("../../shared/settingsCache");
const cache_1 = require("../../shared/cache");
const zod_1 = require("zod");
const validate_1 = require("../../middleware/validate");
const errors_1 = require("../../shared/errors");
const qris_service_1 = require("../pembayaran/qris.service");
const upload = (0, multer_1.default)({ dest: 'uploads/' });
const router = (0, express_1.Router)();
const qrisUpload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 } });
router.get('/qris', auth_1.authMiddleware, (0, auth_1.requirePermission)('settings', 'full'), async (_req, res, next) => {
    try {
        (0, utils_1.sendSuccess)(res, await (0, qris_service_1.getQrisSettings)());
    }
    catch (e) {
        next(e);
    }
});
router.post('/qris/preview', auth_1.authMiddleware, (0, auth_1.requirePermission)('settings', 'full'), (req, res, next) => {
    qrisUpload.single('file')(req, res, e => {
        if (e)
            return next(new errors_1.BadRequestError('Unggah satu gambar QRIS, maksimal 5 MB.'));
        next();
    });
}, async (req, res, next) => {
    try {
        if (!req.file)
            throw new errors_1.BadRequestError('Pilih gambar QRIS terlebih dahulu.');
        (0, utils_1.sendSuccess)(res, await (0, qris_service_1.decodeQrisImage)(req.file.buffer));
    }
    catch (e) {
        next(e);
    }
});
router.put('/qris', auth_1.authMiddleware, (0, auth_1.requirePermission)('settings', 'full'), (0, validate_1.validate)(zod_1.z.object({
    payload: zod_1.z.string().min(1).max(4096), enabled: zod_1.z.boolean(),
})), async (req, res, next) => {
    try {
        (0, utils_1.sendSuccess)(res, await (0, qris_service_1.saveQrisSettings)(req.body.payload, req.body.enabled, req.user.id), 'Pengaturan QRIS disimpan');
    }
    catch (e) {
        next(e);
    }
});
// Keep QRIS configuration behind the validated, audited endpoint above.
router.use((req, _res, next) => {
    if (['PUT', 'POST', 'PATCH'].includes(req.method) && req.body && Object.keys(req.body).some(key => key.trim().toLowerCase() === 'qris_config')) {
        return next(new errors_1.BadRequestError('Gunakan menu Pengaturan QRIS untuk mengubah QRIS.'));
    }
    next();
});
// GET /pub/profile — Public Bengkel Profile (Tanpa Auth)
router.get('/pub/profile', async (_req, res, next) => {
    try {
        const data = await db_1.default.query("SELECT * FROM settings WHERE `group` = 'bengkel'");
        const profile = data.reduce((acc, s) => { acc[s.key] = s.value; return acc; }, {});
        (0, utils_1.sendSuccess)(res, profile);
    }
    catch (e) {
        next(e);
    }
});
// ===== USER MANAGEMENT =====
router.get('/users', auth_1.authMiddleware, (0, auth_1.requirePermission)('settings', 'full'), async (_req, res, next) => {
    try {
        const data = await db_1.default.query(`SELECT u.id, u.name, u.username, u.email, u.roleId, u.status, u.lastLogin,
              r.id AS rId, r.name AS rName
       FROM users u LEFT JOIN roles r ON r.id = u.roleId ORDER BY u.name ASC`);
        const rows = data.map((r) => ({ ...r, role: { id: r.rId, name: r.rName } }));
        (0, utils_1.sendSuccess)(res, rows);
    }
    catch (e) {
        next(e);
    }
});
router.post('/users', auth_1.authMiddleware, (0, auth_1.requirePermission)('settings', 'full'), async (req, res, next) => {
    try {
        const { password, ...rest } = req.body;
        const hashed = await bcryptjs_1.default.hash(password, 12);
        const newId = await db_1.default.insert('users', { ...rest, password: hashed });
        const data = await db_1.default.queryOne('SELECT id, name, username, email, roleId, status FROM users WHERE id = ?', [newId]);
        (0, utils_1.sendCreated)(res, data, 'User berhasil ditambahkan');
    }
    catch (e) {
        next(e);
    }
});
router.put('/users/:id', auth_1.authMiddleware, (0, auth_1.requirePermission)('settings', 'full'), async (req, res, next) => {
    try {
        const { password, ...rest } = req.body;
        const updateData = rest;
        if (password)
            updateData.password = await bcryptjs_1.default.hash(password, 12);
        const uid = Number(req.params.id);
        await db_1.default.update('users', { ...updateData, updatedAt: new Date() }, 'id = ?', [uid]);
        cache_1.appCache.invalidate(`auth_user_${uid}`);
        const data = await db_1.default.queryOne('SELECT id, name, username, email, roleId, status FROM users WHERE id = ?', [uid]);
        (0, utils_1.sendSuccess)(res, data, 'User berhasil diperbarui');
    }
    catch (e) {
        next(e);
    }
});
router.delete('/users/:id', auth_1.authMiddleware, (0, auth_1.requirePermission)('settings', 'full'), async (req, res, next) => {
    try {
        const targetId = Number(req.params.id);
        if (req.user?.id === targetId) {
            return res.status(400).json({ success: false, message: 'Tidak dapat menghapus akun Anda sendiri' });
        }
        const targetUser = await db_1.default.queryOne('SELECT u.*, r.name AS roleName FROM users u LEFT JOIN roles r ON r.id = u.roleId WHERE u.id = ?', [targetId]);
        if (targetUser?.roleName === 'Admin') {
            const adminCount = await db_1.default.queryVal("SELECT COUNT(*) FROM users u JOIN roles r ON r.id = u.roleId WHERE r.name = 'Admin' AND u.status = 'aktif' AND u.id != ?", [targetId]);
            if (adminCount === 0) {
                return res.status(400).json({ success: false, message: 'Tidak dapat menghapus Admin terakhir. Tambahkan Admin lain terlebih dahulu.' });
            }
        }
        await db_1.default.execute('DELETE FROM users WHERE id = ?', [targetId]);
        cache_1.appCache.invalidate(`auth_user_${targetId}`);
        (0, utils_1.sendSuccess)(res, null, 'User berhasil dihapus');
    }
    catch (e) {
        next(e);
    }
});
// ===== PERMISSION MODULES (untuk frontend roles page) =====
router.get('/modules', auth_1.authMiddleware, async (_req, res, next) => {
    try {
        (0, utils_1.sendSuccess)(res, permissions_1.PERMISSION_MODULES);
    }
    catch (e) {
        next(e);
    }
});
// ===== ROLES =====
router.get('/roles', auth_1.authMiddleware, async (_req, res, next) => {
    try {
        const data = await db_1.default.query('SELECT r.*, (SELECT COUNT(*) FROM users WHERE roleId = r.id) AS _countUsers FROM roles r');
        (0, utils_1.sendSuccess)(res, data);
    }
    catch (e) {
        next(e);
    }
});
router.post('/roles', auth_1.authMiddleware, (0, auth_1.requirePermission)('settings', 'full'), async (req, res, next) => {
    try {
        const payload = { ...req.body };
        if (payload.permissions && typeof payload.permissions !== 'string') {
            payload.permissions = JSON.stringify(payload.permissions);
        }
        const newId = await db_1.default.insert('roles', payload);
        const data = await db_1.default.queryOne('SELECT * FROM roles WHERE id = ?', [newId]);
        (0, utils_1.sendCreated)(res, data);
    }
    catch (e) {
        next(e);
    }
});
router.put('/roles/:id', auth_1.authMiddleware, (0, auth_1.requirePermission)('settings', 'full'), async (req, res, next) => {
    try {
        const roleId = Number(req.params.id);
        // Protect Admin role from name change
        const existing = await db_1.default.queryOne('SELECT name FROM roles WHERE id = ?', [roleId]);
        if (existing?.name === 'Admin' && req.body.name && req.body.name !== 'Admin') {
            return res.status(400).json({ success: false, message: 'Tidak dapat mengubah nama role Admin.' });
        }
        const updateBody = { name: req.body.name, description: req.body.description };
        if (req.body.permissions !== undefined)
            updateBody.permissions = typeof req.body.permissions === 'string' ? req.body.permissions : JSON.stringify(req.body.permissions);
        await db_1.default.update('roles', updateBody, 'id = ?', [roleId]);
        // Invalidate auth cache for all users with this role
        const affectedUsers = await db_1.default.query('SELECT id FROM users WHERE roleId = ?', [roleId]);
        for (const u of affectedUsers)
            cache_1.appCache.invalidate(`auth_user_${u.id}`);
        const data = await db_1.default.queryOne('SELECT * FROM roles WHERE id = ?', [roleId]);
        (0, utils_1.sendSuccess)(res, data, 'Role berhasil diperbarui');
    }
    catch (e) {
        next(e);
    }
});
router.delete('/roles/:id', auth_1.authMiddleware, (0, auth_1.requirePermission)('settings', 'full'), async (req, res, next) => {
    try {
        const roleId = Number(req.params.id);
        // Protect Admin role from deletion
        const role = await db_1.default.queryOne('SELECT name FROM roles WHERE id = ?', [roleId]);
        if (role?.name === 'Admin') {
            return res.status(400).json({ success: false, message: 'Role Admin tidak dapat dihapus.' });
        }
        // Check if role still has active users
        const userCount = await db_1.default.queryVal('SELECT COUNT(*) FROM users WHERE roleId = ?', [roleId]);
        if (userCount && userCount > 0) {
            return res.status(400).json({ success: false, message: `Role ini masih memiliki ${userCount} user aktif. Pindahkan user ke role lain terlebih dahulu.` });
        }
        await db_1.default.execute('DELETE FROM roles WHERE id = ?', [roleId]);
        (0, utils_1.sendSuccess)(res, null, 'Role berhasil dihapus');
    }
    catch (e) {
        next(e);
    }
});
// ===== SETTINGS (key-value) =====
router.get('/config', auth_1.authMiddleware, async (_req, res, next) => {
    try {
        const data = await db_1.default.query('SELECT * FROM settings ORDER BY `group` ASC');
        const grouped = data.reduce((acc, s) => {
            if (!acc[s.group])
                acc[s.group] = {};
            acc[s.group][s.key] = s.value;
            return acc;
        }, {});
        (0, utils_1.sendSuccess)(res, grouped);
    }
    catch (e) {
        next(e);
    }
});
router.put('/config', auth_1.authMiddleware, (0, auth_1.requirePermission)('settings', 'full'), async (req, res, next) => {
    try {
        const entries = Object.entries(req.body);
        await db_1.default.transaction(async (tx) => {
            for (const [key, value] of entries) {
                await tx.upsert('settings', { key, value: String(value) }, ['value']);
            }
        });
        entries.forEach(([key]) => (0, settingsCache_1.invalidateSetting)(key));
        (0, utils_1.sendSuccess)(res, null, 'Pengaturan berhasil disimpan');
    }
    catch (e) {
        next(e);
    }
});
// ===== PROFIL BENGKEL =====
router.get('/profile', auth_1.authMiddleware, async (_req, res, next) => {
    try {
        const data = await db_1.default.query("SELECT * FROM settings WHERE `group` = 'bengkel'");
        const profile = data.reduce((acc, s) => { acc[s.key] = s.value; return acc; }, {});
        (0, utils_1.sendSuccess)(res, profile);
    }
    catch (e) {
        next(e);
    }
});
router.put('/profile', auth_1.authMiddleware, (0, auth_1.requirePermission)('settings', 'full'), async (req, res, next) => {
    try {
        const entries = Object.entries(req.body);
        await db_1.default.transaction(async (tx) => {
            for (const [key, value] of entries) {
                await tx.upsert('settings', { key, value: String(value), group: 'bengkel' }, ['value']);
            }
        });
        entries.forEach(([key]) => (0, settingsCache_1.invalidateSetting)(key));
        (0, utils_1.sendSuccess)(res, null, 'Profil bengkel berhasil disimpan');
    }
    catch (e) {
        next(e);
    }
});
router.put('/whatsapp', auth_1.authMiddleware, (0, auth_1.requirePermission)('settings', 'full'), async (req, res, next) => {
    try {
        for (const [key, value] of Object.entries(req.body)) {
            await db_1.default.upsert('settings', { key, value: String(value), group: 'whatsapp' }, ['value']);
            (0, settingsCache_1.invalidateSetting)(key);
        }
        (0, utils_1.sendSuccess)(res, null, 'Pengaturan WhatsApp berhasil disimpan');
    }
    catch (e) {
        next(e);
    }
});
router.post('/backup', auth_1.authMiddleware, (0, auth_1.requirePermission)('settings', 'full'), async (req, res, next) => {
    try {
        const backupData = {};
        const users = await db_1.default.query('SELECT id, name, username, email, roleId, status FROM users');
        const tables = ['roles', 'pelanggan', 'kendaraan', 'mekanik', 'jasa', 'sparepart', 'spk', 'pembayaran'];
        backupData['users'] = users;
        for (const table of tables) {
            backupData[table] = await db_1.default.query(`SELECT * FROM \`${table}\``);
        }
        const backupDir = path_1.default.resolve(__dirname, '../../../../backups');
        if (!fs_1.default.existsSync(backupDir))
            fs_1.default.mkdirSync(backupDir, { recursive: true });
        const filename = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        const filePath = path_1.default.join(backupDir, filename);
        fs_1.default.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/json');
        res.sendFile(filePath);
    }
    catch (e) {
        next(e);
    }
});
router.post('/restore', auth_1.authMiddleware, (0, auth_1.requirePermission)('settings', 'full'), upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file)
            return res.status(400).json({ success: false, message: 'File backup tidak ditemukan' });
        const d = fs_1.default.readFileSync(req.file.path, 'utf8');
        const backupData = JSON.parse(d);
        if (!backupData || !backupData.pelanggan)
            return res.status(400).json({ success: false, message: 'Format backup tidak valid' });
        (0, utils_1.sendSuccess)(res, null, 'File backup valid dan proses restore diregistrasi');
    }
    catch (e) {
        next(e);
    }
    finally {
        if (req.file)
            fs_1.default.unlinkSync(req.file.path);
    }
});
exports.default = router;
//# sourceMappingURL=settings.routes.js.map