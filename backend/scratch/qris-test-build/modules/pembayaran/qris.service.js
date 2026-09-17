"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureQrisSchema = ensureQrisSchema;
exports.getQrisSettings = getQrisSettings;
exports.decodeQrisImage = decodeQrisImage;
exports.saveQrisSettings = saveQrisSettings;
exports.createQrisAttempt = createQrisAttempt;
exports.confirmQrisAttempt = confirmQrisAttempt;
const crypto_1 = __importDefault(require("crypto"));
const sharp_1 = __importDefault(require("sharp"));
const jsqr_1 = __importDefault(require("jsqr"));
const db_1 = __importDefault(require("../../config/db"));
const errors_1 = require("../../shared/errors");
const qris_payload_1 = require("./qris-payload");
const CONFIG_KEY = 'qris_config';
// Additive, idempotent schema initialization. No existing payment tables are changed.
let schemaPromise;
function ensureQrisSchema() {
    if (!schemaPromise)
        schemaPromise = db_1.default.execute(`CREATE TABLE IF NOT EXISTS qris_payment_attempts (
    id CHAR(36) PRIMARY KEY,
    pembayaranId INT NOT NULL,
    amount DECIMAL(15,0) NOT NULL,
    merchantName VARCHAR(100) NOT NULL,
    payload TEXT NOT NULL,
    reference VARCHAR(100) NULL,
    referenceHash CHAR(64) NULL UNIQUE,
    createdBy INT NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmedBy INT NULL,
    confirmedAt DATETIME NULL,
    INDEX idx_qris_invoice (pembayaranId)
  ) ENGINE=InnoDB`).catch(e => { schemaPromise = undefined; throw e; });
    return schemaPromise;
}
async function readConfig() {
    const row = await db_1.default.queryOne('SELECT value FROM settings WHERE `key` = ?', [CONFIG_KEY]);
    return row ? JSON.parse(row.value) : null;
}
async function getQrisSettings() {
    const config = await readConfig();
    if (!config)
        return { configured: false, enabled: false };
    const { merchantName, merchantCity } = (0, qris_payload_1.validateStaticQris)(config.payload);
    return { configured: true, ...config, merchantName, merchantCity };
}
async function decodeQrisImage(buffer) {
    try {
        const source = (0, sharp_1.default)(buffer, { limitInputPixels: 20000000, failOn: 'error' });
        const meta = await source.metadata();
        if (!['png', 'jpeg', 'webp'].includes(meta.format || '') || (meta.pages || 1) > 1)
            throw new Error('format');
        const { data, info } = await source.rotate().resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true })
            .toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const code = (0, jsqr_1.default)(new Uint8ClampedArray(data), info.width, info.height, { inversionAttempts: 'attemptBoth' });
        if (!code)
            throw new Error('decode');
        const { payload, merchantName, merchantCity } = (0, qris_payload_1.validateStaticQris)(code.data);
        return { payload, merchantName, merchantCity };
    }
    catch (e) {
        if (e instanceof errors_1.BadRequestError)
            throw e;
        throw new errors_1.BadRequestError('QR tidak terbaca. Gunakan PNG, JPG, atau WebP yang jelas, maksimal 5 MB / 20 megapiksel.');
    }
}
async function saveQrisSettings(payload, enabled, userId) {
    const validated = (0, qris_payload_1.validateStaticQris)(payload);
    const config = { payload: validated.payload, enabled, updatedAt: new Date().toISOString(), updatedBy: userId };
    await db_1.default.transaction(async (tx) => {
        await tx.upsert('settings', { key: CONFIG_KEY, value: JSON.stringify(config), group: 'qris' }, ['value', 'group']);
        await tx.insert('activity_logs', { userId, action: 'update', module: 'settings', targetName: 'QRIS', detail: JSON.stringify({ merchantName: validated.merchantName, enabled }) });
    });
    return getQrisSettings();
}
async function createQrisAttempt(invoiceId, amount, userId) {
    const config = await readConfig();
    if (!config?.enabled)
        throw new errors_1.BadRequestError('QRIS belum diaktifkan. Buka Pengaturan > QRIS untuk mengunggah dan mengaktifkannya.');
    const payload = (0, qris_payload_1.dynamicQris)(config.payload, amount);
    const invoice = await db_1.default.queryOne('SELECT sisaBayar, status, noInvoice FROM pembayaran WHERE id = ?', [invoiceId]);
    if (!invoice)
        throw new errors_1.NotFoundError('Invoice');
    if (invoice.status === 'lunas' || amount > Number(invoice.sisaBayar))
        throw new errors_1.BadRequestError('Nominal melebihi sisa tagihan. Muat ulang invoice.');
    const { merchantName, merchantCity } = (0, qris_payload_1.validateStaticQris)(config.payload);
    await ensureQrisSchema();
    const id = crypto_1.default.randomUUID();
    await db_1.default.insert('qris_payment_attempts', { id, pembayaranId: invoiceId, amount, merchantName, payload, createdBy: userId });
    return { id, payload, amount, merchantName, merchantCity, noInvoice: invoice.noInvoice };
}
// Called inside the same transaction as the payment posting, after locking the invoice.
async function confirmQrisAttempt(tx, invoiceId, amount, input, userId) {
    const reference = input.qrisReference?.trim().toUpperCase();
    if (!input.qrisVerified || !input.qrisAttemptId || !reference || !/^[A-Z0-9][A-Z0-9 ._\/-]{3,99}$/.test(reference)) {
        throw new errors_1.BadRequestError('Verifikasi dana masuk dan isi referensi transaksi QRIS (4–100 karakter).');
    }
    const attempt = await tx.queryOne('SELECT * FROM qris_payment_attempts WHERE id = ? FOR UPDATE', [input.qrisAttemptId]);
    if (!attempt || attempt.pembayaranId !== invoiceId || Number(attempt.amount) !== amount)
        throw new errors_1.BadRequestError('Sesi QRIS tidak sesuai dengan invoice atau nominal.');
    if (attempt.confirmedAt)
        throw new errors_1.ConflictError('Pembayaran QRIS ini sudah dicatat. Muat ulang invoice.');
    const referenceHash = crypto_1.default.createHash('sha256').update(reference.replace(/[ ._\/-]/g, '')).digest('hex');
    try {
        await tx.update('qris_payment_attempts', { reference, referenceHash, confirmedBy: userId, confirmedAt: new Date() }, 'id = ?', [attempt.id]);
    }
    catch (e) {
        if (e.code === 'ER_DUP_ENTRY')
            throw new errors_1.ConflictError('Referensi QRIS ini sudah digunakan untuk pembayaran lain.');
        throw e;
    }
    return `QRIS diverifikasi manual; referensi: ${reference}; merchant: ${attempt.merchantName}; sesi: ${attempt.id}`;
}
//# sourceMappingURL=qris.service.js.map