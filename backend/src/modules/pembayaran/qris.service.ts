import crypto from 'crypto';
import sharp from 'sharp';
import jsQR from 'jsqr';
import db, { Queryable } from '../../config/db';
import { BadRequestError, ConflictError, NotFoundError } from '../../shared/errors';
import { dynamicQris, validateStaticQris } from './qris-payload';
import { midtransBase, midtransRequest, requireMidtransSettlement, validateMidtransTransaction } from './midtrans';

export type QrisMode = 'static' | 'midtrans' | 'legacy';
interface GatewayPayload { provider: 'midtrans'; environment: string; orderId: string; qrImageUrl?: string; }
function gatewayPayload(payload?: string): GatewayPayload | null {
  if (!payload?.startsWith('{')) return null;
  const data = JSON.parse(payload);
  if (data.provider === 'midtrans-closed') throw new BadRequestError('Sesi Midtrans sudah berakhir.');
  return data.provider === 'midtrans' ? data : null;
}

const CONFIG_KEY = 'qris_config';
interface Config { mode?: QrisMode; payload: string; enabled: boolean; midtransServerKey?: string; midtransEnvironment?: string; updatedAt: string; updatedBy: number; }
interface Attempt { id: string; pembayaranId: number; amount: number; merchantName: string; payload: string; confirmedAt: Date | null; reference: string | null; }

// Additive, idempotent schema initialization. No existing payment tables are changed.
let schemaPromise: Promise<unknown> | undefined;
export function ensureQrisSchema() {
  if (!schemaPromise) schemaPromise = db.execute(`CREATE TABLE IF NOT EXISTS qris_payment_attempts (
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

async function readConfig(): Promise<Config | null> {
  const row = await db.queryOne<{ value: string }>('SELECT value FROM settings WHERE `key` = ?', [CONFIG_KEY]);
  return row ? JSON.parse(row.value) as Config : null;
}

export async function getQrisSettings() {
  const config = await readConfig();
  const gateway = { midtransReady: !!config?.midtransServerKey?.trim(), midtransEnvironment: config?.midtransEnvironment || 'sandbox' };
  if (!config) return { configured: false, enabled: false, mode: 'static', ...gateway };
  const merchant = config.payload ? validateStaticQris(config.payload) : null;
  return { configured: true, ...config, mode: config.mode || 'legacy', merchantName: merchant?.merchantName, merchantCity: merchant?.merchantCity, ...gateway };
}

export async function decodeQrisImage(buffer: Buffer) {
  try {
    const source = sharp(buffer, { limitInputPixels: 20_000_000, failOn: 'error' });
    const meta = await source.metadata();
    if (!['png', 'jpeg', 'webp'].includes(meta.format || '') || (meta.pages || 1) > 1) throw new Error('format');
    const { data, info } = await source.rotate().resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true })
      .toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const code = jsQR(new Uint8ClampedArray(data), info.width, info.height, { inversionAttempts: 'attemptBoth' });
    if (!code) throw new Error('decode');
    const { payload, merchantName, merchantCity } = validateStaticQris(code.data);
    return { payload, merchantName, merchantCity };
  } catch (e) {
    if (e instanceof BadRequestError) throw e;
    throw new BadRequestError('QR tidak terbaca. Gunakan PNG, JPG, atau WebP yang jelas, maksimal 5 MB / 20 megapiksel.');
  }
}

export async function saveQrisSettings(payload: string, enabled: boolean, userId: number, mode: QrisMode = 'legacy', midtransServerKey?: string, midtransEnvironment?: string) {
  const validated = payload ? validateStaticQris(payload) : null;
  if (mode !== 'midtrans' && !validated) throw new BadRequestError('Unggah QRIS statis terlebih dahulu.');
  
  // Maintain existing keys if not provided during update
  const oldConfig = await readConfig();
  const finalServerKey = midtransServerKey !== undefined ? midtransServerKey : oldConfig?.midtransServerKey;
  const finalEnvironment = midtransEnvironment || oldConfig?.midtransEnvironment || 'sandbox';

  if (mode === 'midtrans' && enabled && !finalServerKey?.trim()) throw new BadRequestError('Server Key Midtrans harus diisi.');
  const config: Config = { mode, payload: validated?.payload || '', enabled, midtransServerKey: finalServerKey, midtransEnvironment: finalEnvironment, updatedAt: new Date().toISOString(), updatedBy: userId };
  await db.transaction(async tx => {
    await tx.upsert('settings', { key: CONFIG_KEY, value: JSON.stringify(config), group: 'qris' }, ['value', 'group']);
    await tx.insert('activity_logs', { userId, action: 'update', module: 'settings', targetName: 'QRIS', detail: JSON.stringify({ merchantName: validated?.merchantName, mode, enabled }) });
  });
  return getQrisSettings();
}

export async function createQrisAttempt(invoiceId: number, amount: number, userId: number) {
  const config = await readConfig();
  if (!config?.enabled) throw new BadRequestError('QRIS belum diaktifkan. Buka Pengaturan > QRIS untuk mengunggah dan mengaktifkannya.');
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 10_000_000) throw new BadRequestError('Nominal QRIS harus Rupiah bulat antara Rp1 dan Rp10.000.000.');
  if (config.mode === 'midtrans') return createMidtransAttempt(invoiceId, amount, userId, config);
  const payload = config.mode === 'static' ? validateStaticQris(config.payload).payload : dynamicQris(config.payload, amount);
  const invoice = await db.queryOne<{ sisaBayar: number; status: string; noInvoice: string }>('SELECT sisaBayar, status, noInvoice FROM pembayaran WHERE id = ?', [invoiceId]);
  if (!invoice) throw new NotFoundError('Invoice');
  if (invoice.status === 'lunas' || amount > Number(invoice.sisaBayar)) throw new BadRequestError('Nominal melebihi sisa tagihan. Muat ulang invoice.');
  const { merchantName, merchantCity } = validateStaticQris(config.payload);
  await ensureQrisSchema();
  const id = crypto.randomUUID();
  await db.insert('qris_payment_attempts', { id, pembayaranId: invoiceId, amount, merchantName, payload, createdBy: userId });
  return { id, payload, amount, merchantName, merchantCity, noInvoice: invoice.noInvoice, mode: config.mode || 'legacy', qrImageUrl: undefined as string | undefined };
}

export interface QrisConfirmation { qrisAttemptId?: string; qrisReference?: string; qrisVerified?: boolean; }

// Called inside the same transaction as the payment posting, after locking the invoice.
export async function confirmQrisAttempt(tx: Queryable, invoiceId: number, amount: number, input: QrisConfirmation, userId?: number) {
  if (!input.qrisAttemptId) throw new BadRequestError('Verifikasi sesi QRIS diperlukan.');
  const attempt = await tx.queryOne<Attempt>('SELECT * FROM qris_payment_attempts WHERE id = ? FOR UPDATE', [input.qrisAttemptId]);
  if (!attempt || attempt.pembayaranId !== invoiceId || Number(attempt.amount) !== amount) throw new BadRequestError('Sesi QRIS tidak sesuai dengan invoice atau nominal.');
  if (attempt.confirmedAt) throw new ConflictError('Pembayaran QRIS ini sudah dicatat. Muat ulang invoice.');
  const gateway = gatewayPayload(attempt.payload);
  let reference = input.qrisReference?.trim().toUpperCase();
  if (gateway) {
    const config = await readConfig();
    if (!config?.midtransServerKey) throw new BadRequestError('Server Key Midtrans belum dikonfigurasi.');
    const status = await midtransRequest(`${encodeURIComponent(gateway.orderId)}/status`, gateway.environment, config.midtransServerKey);
    requireMidtransSettlement(status, gateway.orderId, amount);
    reference = `MIDTRANS-${status.transaction_id}`;
  } else if (!input.qrisVerified || !reference || !/^[A-Z0-9][A-Z0-9 ._\/-]{3,99}$/.test(reference)) {
    throw new BadRequestError('Verifikasi dana masuk dan isi referensi transaksi QRIS (4?100 karakter).');
  }
  const referenceHash = crypto.createHash('sha256').update(reference.replace(/[ ._\/-]/g, '')).digest('hex');
  try {
    await tx.update('qris_payment_attempts', { reference, referenceHash, confirmedBy: userId, confirmedAt: new Date() }, 'id = ?', [attempt.id]);
  } catch (e) {
    if ((e as { code?: string }).code === 'ER_DUP_ENTRY') throw new ConflictError('Referensi QRIS ini sudah digunakan untuk pembayaran lain.');
    throw e;
  }
  return `QRIS ${gateway ? 'diverifikasi API Midtrans' : 'diverifikasi manual'}; referensi: ${reference}; merchant: ${attempt.merchantName}; sesi: ${attempt.id}`;
}

// Persist the order before calling the gateway so timeouts and reopen use the same order.
async function createMidtransAttempt(invoiceId: number, amount: number, userId: number, config: Config) {
  if (!config.midtransServerKey?.trim()) throw new BadRequestError('Server Key Midtrans belum diatur di Pengaturan.');
  await ensureQrisSchema();
  const environment = config.midtransEnvironment || 'sandbox';
  const { attempt, noInvoice } = await db.transaction(async tx => {
    const invoice = await tx.queryOne<{ sisaBayar: number; status: string; noInvoice: string }>('SELECT sisaBayar, status, noInvoice FROM pembayaran WHERE id = ? FOR UPDATE', [invoiceId]);
    if (!invoice) throw new NotFoundError('Invoice');
    if (invoice.status === 'lunas' || amount > Number(invoice.sisaBayar)) throw new BadRequestError('Nominal melebihi sisa tagihan. Muat ulang invoice.');
    const existing = await tx.queryOne<Attempt>(`SELECT * FROM qris_payment_attempts WHERE pembayaranId = ? AND confirmedAt IS NULL AND payload LIKE '%"provider":"midtrans"%'
      ORDER BY createdAt DESC LIMIT 1 FOR UPDATE`, [invoiceId]);
    if (existing) {
      const gateway = gatewayPayload(existing.payload)!;
      if (Number(existing.amount) !== amount || gateway.environment !== environment) throw new BadRequestError('Masih ada sesi Midtrans untuk invoice ini. Gunakan nominal dan lingkungan sesi sebelumnya atau rekonsiliasi terlebih dahulu.');
      return { attempt: existing, noInvoice: invoice.noInvoice };
    }
    const id = crypto.randomUUID();
    const gateway: GatewayPayload = { provider: 'midtrans', environment, orderId: `MM-${id}` };
    const attempt: Attempt = { id, pembayaranId: invoiceId, amount, merchantName: 'Midtrans', payload: JSON.stringify(gateway), confirmedAt: null, reference: null };
    await tx.insert('qris_payment_attempts', { ...attempt, createdBy: userId });
    return { attempt, noInvoice: invoice.noInvoice };
  });
  const gateway = gatewayPayload(attempt.payload)!;
  let result;
  try {
    result = gateway.qrImageUrl
      ? await midtransRequest(`${encodeURIComponent(gateway.orderId)}/status`, environment, config.midtransServerKey)
      : await midtransRequest('charge', environment, config.midtransServerKey, { payment_type: 'qris', transaction_details: { order_id: gateway.orderId, gross_amount: amount }, qris: { acquirer: 'gopay' } });
  } catch (error) {
    // If the request fails (e.g., 401 Unauthorized, 404 Not Found), close the session so it doesn't get stuck
    await db.update('qris_payment_attempts', { payload: JSON.stringify({ ...gateway, provider: 'midtrans-closed' }) }, 'id = ? AND confirmedAt IS NULL', [attempt.id]);
    throw error;
  }
  validateMidtransTransaction(result, gateway.orderId, amount);
  if (['expire', 'cancel', 'deny', 'failure'].includes(result.transaction_status)) {
    // Retain the failed order for audit, but permit a new session on the next request.
    await db.update('qris_payment_attempts', { payload: JSON.stringify({ ...gateway, provider: 'midtrans-closed' }) }, 'id = ? AND confirmedAt IS NULL', [attempt.id]);
    throw new BadRequestError('Sesi Midtrans berakhir. Tekan Coba lagi untuk membuat QR baru.');
  }
  const action = result.actions?.find(a => a.name === 'generate-qr-code-v2') || result.actions?.find(a => a.name === 'generate-qr-code');
  const imageUrl = action?.url || gateway.qrImageUrl || `${midtransBase(environment)}/v2/qris/${encodeURIComponent(result.transaction_id)}/qr-code`;
  const parsedUrl = new URL(imageUrl);
  if (parsedUrl.origin !== midtransBase(environment)) throw new BadRequestError('URL QR Midtrans tidak valid.');
  gateway.qrImageUrl = imageUrl;
  await db.update('qris_payment_attempts', { payload: JSON.stringify(gateway) }, 'id = ?', [attempt.id]);
  return { id: attempt.id, mode: 'midtrans' as const, payload: '', qrImageUrl: imageUrl, amount, merchantName: 'Midtrans', merchantCity: environment === 'sandbox' ? 'Sandbox ? pembayaran uji' : '', noInvoice };
}
