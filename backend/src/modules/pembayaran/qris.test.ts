import test from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import sharp from 'sharp';
import db, { Queryable } from '../../config/db';
import { crc16, dynamicQris, validateStaticQris } from './qris-payload';
import { confirmQrisAttempt, createQrisAttempt, decodeQrisImage, saveQrisSettings } from './qris.service';

// Synthetic merchant only. Never use this fixture to receive real payments.
const tlv = (tag: string, value: string) => tag + String(value.length).padStart(2, '0') + value;
const account = tlv('00', 'ID.CO.TEST.WWW') + tlv('01', 'TEST-MERCHANT-001');
function fixture(overrides: Record<string, string> = {}) {
  const values: Record<string, string> = { '00': '01', '01': '11', '26': account, '52': '7538', '53': '360', '58': 'ID', '59': 'TEST BENGKEL', '60': 'JAKARTA', ...overrides };
  const body = Object.keys(values).sort().map(tag => tlv(tag, values[tag])).join('') + '6304';
  return body + crc16(body);
}
const payload = fixture();

test('CRC matches the independent CCITT-FALSE standard check vector', () => {
  assert.equal(crc16('123456789'), '29B1');
});

test('static QR validates and conversion preserves the merchant/account, embeds exact amount and valid CRC', () => {
  const parsed = validateStaticQris(payload);
  assert.equal(parsed.merchantName, 'TEST BENGKEL');
  const dynamic = dynamicQris(payload, 125000);
  assert.ok(dynamic.includes('010212'));
  assert.ok(dynamic.includes('5406125000'));
  assert.ok(dynamic.includes(tlv('26', account)));
  assert.ok(dynamic.includes('5912TEST BENGKEL'));
  assert.equal(dynamic.slice(-4), crc16(dynamic.slice(0, -4)));
  assert.throws(() => validateStaticQris(dynamic), /statis/);
});

test('rejects wrong checksum, truncated TLV, duplicate tags, dynamic input, foreign currency, fee-bearing QR', () => {
  assert.throws(() => validateStaticQris(payload.slice(0, -1) + (payload.endsWith('0') ? '1' : '0')), /Checksum/);
  assert.throws(() => validateStaticQris('0002015999SHORT'), /Panjang/);
  assert.throws(() => validateStaticQris('000201000201'), /tag/);
  assert.throws(() => validateStaticQris(fixture({ '01': '12' })), /statis/);
  assert.throws(() => validateStaticQris(fixture({ '53': '840' })), /Rupiah/);
  assert.throws(() => validateStaticQris(fixture({ '55': '02', '56': '500' })), /biaya/);
  assert.throws(() => validateStaticQris(fixture({ '26': tlv('00', 'OTHER.QR') })), /penyedia/);
});

test('rejects invalid amounts and accepts integer boundaries', () => {
  for (const amount of [0, -1, 1.5, NaN, Infinity, 10_000_001]) assert.throws(() => dynamicQris(payload, amount), /Nominal/);
  assert.ok(dynamicQris(payload, 1).includes('54011'));
  assert.ok(dynamicQris(payload, 10_000_000).includes('540810000000'));
});

test('upload decoder reads a generated PNG and a grayscale JPEG without storing the image', async () => {
  const png = await QRCode.toBuffer(payload, { width: 700, margin: 4 });
  assert.equal((await decodeQrisImage(png)).payload, payload);
  const jpeg = await sharp(png).grayscale().jpeg().toBuffer();
  assert.equal((await decodeQrisImage(jpeg)).merchantCity, 'JAKARTA');
});

test('upload decoder rejects non-images, blank images, and dynamic QR', async () => {
  await assert.rejects(decodeQrisImage(Buffer.from('not-an-image')), /tidak terbaca/);
  const blank = await sharp({ create: { width: 200, height: 200, channels: 3, background: 'white' } }).png().toBuffer();
  await assert.rejects(decodeQrisImage(blank), /tidak terbaca/);
  const png = await QRCode.toBuffer(dynamicQris(payload, 10000), { width: 700 });
  await assert.rejects(decodeQrisImage(png), /statis/);
});

test('confirmation requires verification, matching invoice and amount, and rejects reused attempts', async () => {
  const attempt = { id: 'test-session', pembayaranId: 42, amount: 125000, merchantName: 'TEST', confirmedAt: null as Date | null };
  let updateCount = 0;
  const tx = {
    queryOne: async () => attempt,
    update: async () => { updateCount++; return 1; },
  } as unknown as Queryable;
  const input = { qrisAttemptId: attempt.id, qrisReference: 'RRN123456', qrisVerified: true };
  await assert.rejects(confirmQrisAttempt(tx, 42, 125000, { ...input, qrisVerified: false }, 7), /Verifikasi/);
  await assert.rejects(confirmQrisAttempt(tx, 99, 125000, input, 7), /tidak sesuai/);
  await assert.rejects(confirmQrisAttempt(tx, 42, 250000, input, 7), /tidak sesuai/);
  assert.equal(updateCount, 0);
  assert.match(await confirmQrisAttempt(tx, 42, 125000, input, 7), /RRN123456/);
  assert.equal(updateCount, 1);
  attempt.confirmedAt = new Date();
  await assert.rejects(confirmQrisAttempt(tx, 42, 125000, input, 7), /sudah dicatat/);
});

test('unique-reference constraint becomes a user-facing conflict', async () => {
  const tx = {
    queryOne: async () => ({ id: 'a', pembayaranId: 42, amount: 1000, merchantName: 'TEST' }),
    update: async () => { throw Object.assign(new Error('duplicate'), { code: 'ER_DUP_ENTRY' }); },
  } as unknown as Queryable;
  await assert.rejects(confirmQrisAttempt(tx, 42, 1000, { qrisAttemptId: 'a', qrisReference: 'RRN12345', qrisVerified: true }, 7), /sudah digunakan/);
});

test('creating QR is blocked for disabled configuration and overpayment; valid QR only creates a pending attempt', async t => {
  let enabled = false;
  const inserts: { table: string; value: Record<string, unknown> }[] = [];
  t.mock.method(db, 'queryOne', async (sql: string) => sql.includes('settings')
    ? { value: JSON.stringify({ payload, enabled }) }
    : { noInvoice: 'TEST-42', sisaBayar: 50000, status: 'parsial' });
  t.mock.method(db, 'execute', async () => ({}));
  t.mock.method(db, 'insert', async (table: string, value: Record<string, unknown>) => { inserts.push({ table, value }); return 1; });
  await assert.rejects(createQrisAttempt(42, 1000, 7), /belum diaktifkan/);
  enabled = true;
  await assert.rejects(createQrisAttempt(42, 50001, 7), /melebihi/);
  assert.equal(inserts.length, 0);
  const attempt = await createQrisAttempt(42, 25000, 7);
  assert.equal(attempt.amount, 25000);
  assert.equal(inserts.length, 1);
  assert.equal(inserts[0].table, 'qris_payment_attempts');
  assert.equal(inserts[0].value.confirmedAt, undefined);
  assert.equal(inserts[0].value.pembayaranId, 42);
});

test('invalid replacement QR cannot overwrite settings', async t => {
  const write = t.mock.method(db, 'transaction', async () => { throw new Error('unexpected write'); });
  await assert.rejects(saveQrisSettings('invalid image payload', true, 7), /QRIS/);
  assert.equal(write.mock.callCount(), 0);
});
