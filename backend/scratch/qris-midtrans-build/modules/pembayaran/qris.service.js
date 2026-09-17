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
const midtrans_1 = require("./midtrans");
function gatewayPayload(payload) {
    if (!payload?.startsWith('{'))
        return null;
    const data = JSON.parse(payload);
    if (data.provider === 'midtrans-closed')
        throw new errors_1.BadRequestError('Sesi Midtrans sudah berakhir.');
    return data.provider === 'midtrans' ? data : null;
}
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
    const gateway = { midtransReady: (0, midtrans_1.midtransReady)(), midtransEnvironment: (0, midtrans_1.midtransEnvironment)() };
    if (!config)
        return { configured: false, enabled: false, mode: 'static', ...gateway };
    const merchant = config.payload ? (0, qris_payload_1.validateStaticQris)(config.payload) : null;
    return { configured: true, ...config, mode: config.mode || 'legacy', merchantName: merchant?.merchantName, merchantCity: merchant?.merchantCity, ...gateway };
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
async function saveQrisSettings(payload, enabled, userId, mode = 'legacy') {
    const validated = payload ? (0, qris_payload_1.validateStaticQris)(payload) : null;
    if (mode !== 'midtrans' && !validated)
        throw new errors_1.BadRequestError('Unggah QRIS statis terlebih dahulu.');
    if (mode === 'midtrans' && enabled && !(0, midtrans_1.midtransReady)())
        throw new errors_1.BadRequestError('MIDTRANS_SERVER_KEY belum diatur di server.');
    const config = { mode, payload: validated?.payload || '', enabled, updatedAt: new Date().toISOString(), updatedBy: userId };
    await db_1.default.transaction(async (tx) => {
        await tx.upsert('settings', { key: CONFIG_KEY, value: JSON.stringify(config), group: 'qris' }, ['value', 'group']);
        await tx.insert('activity_logs', { userId, action: 'update', module: 'settings', targetName: 'QRIS', detail: JSON.stringify({ merchantName: validated?.merchantName, mode, enabled }) });
    });
    return getQrisSettings();
}
async function createQrisAttempt(invoiceId, amount, userId) {
    const config = await readConfig();
    if (!config?.enabled)
        throw new errors_1.BadRequestError('QRIS belum diaktifkan. Buka Pengaturan > QRIS untuk mengunggah dan mengaktifkannya.');
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > 10000000)
        throw new errors_1.BadRequestError('Nominal QRIS harus Rupiah bulat antara Rp1 dan Rp10.000.000.');
    if (config.mode === 'midtrans')
        return createMidtransAttempt(invoiceId, amount, userId);
    const payload = config.mode === 'static' ? (0, qris_payload_1.validateStaticQris)(config.payload).payload : (0, qris_payload_1.dynamicQris)(config.payload, amount);
    const invoice = await db_1.default.queryOne('SELECT sisaBayar, status, noInvoice FROM pembayaran WHERE id = ?', [invoiceId]);
    if (!invoice)
        throw new errors_1.NotFoundError('Invoice');
    if (invoice.status === 'lunas' || amount > Number(invoice.sisaBayar))
        throw new errors_1.BadRequestError('Nominal melebihi sisa tagihan. Muat ulang invoice.');
    const { merchantName, merchantCity } = (0, qris_payload_1.validateStaticQris)(config.payload);
    await ensureQrisSchema();
    const id = crypto_1.default.randomUUID();
    await db_1.default.insert('qris_payment_attempts', { id, pembayaranId: invoiceId, amount, merchantName, payload, createdBy: userId });
    return { id, payload, amount, merchantName, merchantCity, noInvoice: invoice.noInvoice, mode: config.mode || 'legacy', qrImageUrl: undefined };
}
// Called inside the same transaction as the payment posting, after locking the invoice.
async function confirmQrisAttempt(tx, invoiceId, amount, input, userId) {
    if (!input.qrisAttemptId)
        throw new errors_1.BadRequestError('Verifikasi sesi QRIS diperlukan.');
    const attempt = await tx.queryOne('SELECT * FROM qris_payment_attempts WHERE id = ? FOR UPDATE', [input.qrisAttemptId]);
    if (!attempt || attempt.pembayaranId !== invoiceId || Number(attempt.amount) !== amount)
        throw new errors_1.BadRequestError('Sesi QRIS tidak sesuai dengan invoice atau nominal.');
    if (attempt.confirmedAt)
        throw new errors_1.ConflictError('Pembayaran QRIS ini sudah dicatat. Muat ulang invoice.');
    const gateway = gatewayPayload(attempt.payload);
    let reference = input.qrisReference?.trim().toUpperCase();
    if (gateway) {
        const status = await (0, midtrans_1.midtransRequest)(`${encodeURIComponent(gateway.orderId)}/status`, gateway.environment);
        (0, midtrans_1.requireMidtransSettlement)(status, gateway.orderId, amount);
        reference = `MIDTRANS-${status.transaction_id}`;
    }
    else if (!input.qrisVerified || !reference || !/^[A-Z0-9][A-Z0-9 ._\/-]{3,99}$/.test(reference)) {
        throw new errors_1.BadRequestError('Verifikasi dana masuk dan isi referensi transaksi QRIS (4?100 karakter).');
    }
    const referenceHash = crypto_1.default.createHash('sha256').update(reference.replace(/[ ._\/-]/g, '')).digest('hex');
    try {
        await tx.update('qris_payment_attempts', { reference, referenceHash, confirmedBy: userId, confirmedAt: new Date() }, 'id = ?', [attempt.id]);
    }
    catch (e) {
        if (e.code === 'ER_DUP_ENTRY')
            throw new errors_1.ConflictError('Referensi QRIS ini sudah digunakan untuk pembayaran lain.');
        throw e;
    }
    return `QRIS ${gateway ? 'diverifikasi API Midtrans' : 'diverifikasi manual'}; referensi: ${reference}; merchant: ${attempt.merchantName}; sesi: ${attempt.id}`;
}
// Persist the order before calling the gateway so timeouts and reopen use the same order.
async function createMidtransAttempt(invoiceId, amount, userId) {
    if (!(0, midtrans_1.midtransReady)())
        throw new errors_1.BadRequestError('MIDTRANS_SERVER_KEY belum diatur di server.');
    await ensureQrisSchema();
    const environment = (0, midtrans_1.midtransEnvironment)();
    const { attempt, noInvoice } = await db_1.default.transaction(async (tx) => {
        const invoice = await tx.queryOne('SELECT sisaBayar, status, noInvoice FROM pembayaran WHERE id = ? FOR UPDATE', [invoiceId]);
        if (!invoice)
            throw new errors_1.NotFoundError('Invoice');
        if (invoice.status === 'lunas' || amount > Number(invoice.sisaBayar))
            throw new errors_1.BadRequestError('Nominal melebihi sisa tagihan. Muat ulang invoice.');
        const existing = await tx.queryOne(`SELECT * FROM qris_payment_attempts WHERE pembayaranId = ? AND confirmedAt IS NULL AND payload LIKE '%"provider":"midtrans"%'
      ORDER BY createdAt DESC LIMIT 1 FOR UPDATE`, [invoiceId]);
        if (existing) {
            const gateway = gatewayPayload(existing.payload);
            if (Number(existing.amount) !== amount || gateway.environment !== environment)
                throw new errors_1.BadRequestError('Masih ada sesi Midtrans untuk invoice ini. Gunakan nominal dan lingkungan sesi sebelumnya atau rekonsiliasi terlebih dahulu.');
            return { attempt: existing, noInvoice: invoice.noInvoice };
        }
        const id = crypto_1.default.randomUUID();
        const gateway = { provider: 'midtrans', environment, orderId: `MM-${id}` };
        const attempt = { id, pembayaranId: invoiceId, amount, merchantName: 'Midtrans', payload: JSON.stringify(gateway), confirmedAt: null, reference: null };
        await tx.insert('qris_payment_attempts', { ...attempt, createdBy: userId });
        return { attempt, noInvoice: invoice.noInvoice };
    });
    const gateway = gatewayPayload(attempt.payload);
    const result = gateway.qrImageUrl
        ? await (0, midtrans_1.midtransRequest)(`${encodeURIComponent(gateway.orderId)}/status`, environment)
        : await (0, midtrans_1.midtransRequest)('charge', environment, { payment_type: 'qris', transaction_details: { order_id: gateway.orderId, gross_amount: amount }, qris: { acquirer: 'gopay' } });
    (0, midtrans_1.validateMidtransTransaction)(result, gateway.orderId, amount);
    if (['expire', 'cancel', 'deny', 'failure'].includes(result.transaction_status)) {
        // Retain the failed order for audit, but permit a new session on the next request.
        await db_1.default.update('qris_payment_attempts', { payload: JSON.stringify({ ...gateway, provider: 'midtrans-closed' }) }, 'id = ? AND confirmedAt IS NULL', [attempt.id]);
        throw new errors_1.BadRequestError('Sesi Midtrans berakhir. Tekan Coba lagi untuk membuat QR baru.');
    }
    const action = result.actions?.find(a => a.name === 'generate-qr-code-v2') || result.actions?.find(a => a.name === 'generate-qr-code');
    const imageUrl = action?.url || gateway.qrImageUrl || `${(0, midtrans_1.midtransBase)(environment)}/v2/qris/${encodeURIComponent(result.transaction_id)}/qr-code`;
    const parsedUrl = new URL(imageUrl);
    if (parsedUrl.origin !== (0, midtrans_1.midtransBase)(environment))
        throw new errors_1.BadRequestError('URL QR Midtrans tidak valid.');
    gateway.qrImageUrl = imageUrl;
    await db_1.default.update('qris_payment_attempts', { payload: JSON.stringify(gateway) }, 'id = ?', [attempt.id]);
    return { id: attempt.id, mode: 'midtrans', payload: '', qrImageUrl: imageUrl, amount, merchantName: 'Midtrans', merchantCity: environment === 'sandbox' ? 'Sandbox ? pembayaran uji' : '', noInvoice };
}
//# sourceMappingURL=qris.service.js.map