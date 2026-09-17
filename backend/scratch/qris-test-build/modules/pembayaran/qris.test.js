"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const qrcode_1 = __importDefault(require("qrcode"));
const sharp_1 = __importDefault(require("sharp"));
const db_1 = __importDefault(require("../../config/db"));
const qris_payload_1 = require("./qris-payload");
const qris_service_1 = require("./qris.service");
// Synthetic merchant only. Never use this fixture to receive real payments.
const tlv = (tag, value) => tag + String(value.length).padStart(2, '0') + value;
const account = tlv('00', 'ID.CO.TEST.WWW') + tlv('01', 'TEST-MERCHANT-001');
function fixture(overrides = {}) {
    const values = { '00': '01', '01': '11', '26': account, '52': '7538', '53': '360', '58': 'ID', '59': 'TEST BENGKEL', '60': 'JAKARTA', ...overrides };
    const body = Object.keys(values).sort().map(tag => tlv(tag, values[tag])).join('') + '6304';
    return body + (0, qris_payload_1.crc16)(body);
}
const payload = fixture();
(0, node_test_1.default)('CRC matches the independent CCITT-FALSE standard check vector', () => {
    strict_1.default.equal((0, qris_payload_1.crc16)('123456789'), '29B1');
});
(0, node_test_1.default)('static QR validates and conversion preserves the merchant/account, embeds exact amount and valid CRC', () => {
    const parsed = (0, qris_payload_1.validateStaticQris)(payload);
    strict_1.default.equal(parsed.merchantName, 'TEST BENGKEL');
    const dynamic = (0, qris_payload_1.dynamicQris)(payload, 125000);
    strict_1.default.ok(dynamic.includes('010212'));
    strict_1.default.ok(dynamic.includes('5406125000'));
    strict_1.default.ok(dynamic.includes(tlv('26', account)));
    strict_1.default.ok(dynamic.includes('5912TEST BENGKEL'));
    strict_1.default.equal(dynamic.slice(-4), (0, qris_payload_1.crc16)(dynamic.slice(0, -4)));
    strict_1.default.throws(() => (0, qris_payload_1.validateStaticQris)(dynamic), /statis/);
});
(0, node_test_1.default)('rejects wrong checksum, truncated TLV, duplicate tags, dynamic input, foreign currency, fee-bearing QR', () => {
    strict_1.default.throws(() => (0, qris_payload_1.validateStaticQris)(payload.slice(0, -1) + (payload.endsWith('0') ? '1' : '0')), /Checksum/);
    strict_1.default.throws(() => (0, qris_payload_1.validateStaticQris)('0002015999SHORT'), /Panjang/);
    strict_1.default.throws(() => (0, qris_payload_1.validateStaticQris)('000201000201'), /tag/);
    strict_1.default.throws(() => (0, qris_payload_1.validateStaticQris)(fixture({ '01': '12' })), /statis/);
    strict_1.default.throws(() => (0, qris_payload_1.validateStaticQris)(fixture({ '53': '840' })), /Rupiah/);
    strict_1.default.throws(() => (0, qris_payload_1.validateStaticQris)(fixture({ '55': '02', '56': '500' })), /biaya/);
    strict_1.default.throws(() => (0, qris_payload_1.validateStaticQris)(fixture({ '26': tlv('00', 'OTHER.QR') })), /penyedia/);
});
(0, node_test_1.default)('rejects invalid amounts and accepts integer boundaries', () => {
    for (const amount of [0, -1, 1.5, NaN, Infinity, 10000001])
        strict_1.default.throws(() => (0, qris_payload_1.dynamicQris)(payload, amount), /Nominal/);
    strict_1.default.ok((0, qris_payload_1.dynamicQris)(payload, 1).includes('54011'));
    strict_1.default.ok((0, qris_payload_1.dynamicQris)(payload, 10000000).includes('540810000000'));
});
(0, node_test_1.default)('upload decoder reads a generated PNG and a grayscale JPEG without storing the image', async () => {
    const png = await qrcode_1.default.toBuffer(payload, { width: 700, margin: 4 });
    strict_1.default.equal((await (0, qris_service_1.decodeQrisImage)(png)).payload, payload);
    const jpeg = await (0, sharp_1.default)(png).grayscale().jpeg().toBuffer();
    strict_1.default.equal((await (0, qris_service_1.decodeQrisImage)(jpeg)).merchantCity, 'JAKARTA');
});
(0, node_test_1.default)('upload decoder rejects non-images, blank images, and dynamic QR', async () => {
    await strict_1.default.rejects((0, qris_service_1.decodeQrisImage)(Buffer.from('not-an-image')), /tidak terbaca/);
    const blank = await (0, sharp_1.default)({ create: { width: 200, height: 200, channels: 3, background: 'white' } }).png().toBuffer();
    await strict_1.default.rejects((0, qris_service_1.decodeQrisImage)(blank), /tidak terbaca/);
    const png = await qrcode_1.default.toBuffer((0, qris_payload_1.dynamicQris)(payload, 10000), { width: 700 });
    await strict_1.default.rejects((0, qris_service_1.decodeQrisImage)(png), /statis/);
});
(0, node_test_1.default)('confirmation requires verification, matching invoice and amount, and rejects reused attempts', async () => {
    const attempt = { id: 'test-session', pembayaranId: 42, amount: 125000, merchantName: 'TEST', confirmedAt: null };
    let updateCount = 0;
    const tx = {
        queryOne: async () => attempt,
        update: async () => { updateCount++; return 1; },
    };
    const input = { qrisAttemptId: attempt.id, qrisReference: 'RRN123456', qrisVerified: true };
    await strict_1.default.rejects((0, qris_service_1.confirmQrisAttempt)(tx, 42, 125000, { ...input, qrisVerified: false }, 7), /Verifikasi/);
    await strict_1.default.rejects((0, qris_service_1.confirmQrisAttempt)(tx, 99, 125000, input, 7), /tidak sesuai/);
    await strict_1.default.rejects((0, qris_service_1.confirmQrisAttempt)(tx, 42, 250000, input, 7), /tidak sesuai/);
    strict_1.default.equal(updateCount, 0);
    strict_1.default.match(await (0, qris_service_1.confirmQrisAttempt)(tx, 42, 125000, input, 7), /RRN123456/);
    strict_1.default.equal(updateCount, 1);
    attempt.confirmedAt = new Date();
    await strict_1.default.rejects((0, qris_service_1.confirmQrisAttempt)(tx, 42, 125000, input, 7), /sudah dicatat/);
});
(0, node_test_1.default)('unique-reference constraint becomes a user-facing conflict', async () => {
    const tx = {
        queryOne: async () => ({ id: 'a', pembayaranId: 42, amount: 1000, merchantName: 'TEST' }),
        update: async () => { throw Object.assign(new Error('duplicate'), { code: 'ER_DUP_ENTRY' }); },
    };
    await strict_1.default.rejects((0, qris_service_1.confirmQrisAttempt)(tx, 42, 1000, { qrisAttemptId: 'a', qrisReference: 'RRN12345', qrisVerified: true }, 7), /sudah digunakan/);
});
(0, node_test_1.default)('creating QR is blocked for disabled configuration and overpayment; valid QR only creates a pending attempt', async (t) => {
    let enabled = false;
    const inserts = [];
    t.mock.method(db_1.default, 'queryOne', async (sql) => sql.includes('settings')
        ? { value: JSON.stringify({ payload, enabled }) }
        : { noInvoice: 'TEST-42', sisaBayar: 50000, status: 'parsial' });
    t.mock.method(db_1.default, 'execute', async () => ({}));
    t.mock.method(db_1.default, 'insert', async (table, value) => { inserts.push({ table, value }); return 1; });
    await strict_1.default.rejects((0, qris_service_1.createQrisAttempt)(42, 1000, 7), /belum diaktifkan/);
    enabled = true;
    await strict_1.default.rejects((0, qris_service_1.createQrisAttempt)(42, 50001, 7), /melebihi/);
    strict_1.default.equal(inserts.length, 0);
    const attempt = await (0, qris_service_1.createQrisAttempt)(42, 25000, 7);
    strict_1.default.equal(attempt.amount, 25000);
    strict_1.default.equal(inserts.length, 1);
    strict_1.default.equal(inserts[0].table, 'qris_payment_attempts');
    strict_1.default.equal(inserts[0].value.confirmedAt, undefined);
    strict_1.default.equal(inserts[0].value.pembayaranId, 42);
});
(0, node_test_1.default)('invalid replacement QR cannot overwrite settings', async (t) => {
    const write = t.mock.method(db_1.default, 'transaction', async () => { throw new Error('unexpected write'); });
    await strict_1.default.rejects((0, qris_service_1.saveQrisSettings)('invalid image payload', true, 7), /QRIS/);
    strict_1.default.equal(write.mock.callCount(), 0);
});
//# sourceMappingURL=qris.test.js.map