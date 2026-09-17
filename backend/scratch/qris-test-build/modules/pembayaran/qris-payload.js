"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crc16 = crc16;
exports.validateStaticQris = validateStaticQris;
exports.dynamicQris = dynamicQris;
const errors_1 = require("../../shared/errors");
// EMV merchant-presented TLV; CRC-16/CCITT-FALSE (poly 0x1021, init 0xffff).
function crc16(value) {
    let crc = 0xffff;
    for (const byte of Buffer.from(value, 'utf8')) {
        crc ^= byte << 8;
        for (let bit = 0; bit < 8; bit++)
            crc = ((crc << 1) ^ ((crc & 0x8000) ? 0x1021 : 0)) & 0xffff;
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}
function parse(value) {
    const fields = [];
    let offset = 0;
    while (offset < value.length) {
        const header = value.slice(offset, offset + 4);
        if (!/^\d{4}$/.test(header))
            throw new errors_1.BadRequestError('Struktur QRIS tidak valid.');
        const tag = header.slice(0, 2);
        const length = Number(header.slice(2));
        offset += 4;
        if (!length || offset + length > value.length || fields.some(f => f.tag === tag)) {
            throw new errors_1.BadRequestError('Panjang atau tag QRIS tidak valid.');
        }
        fields.push({ tag, value: value.slice(offset, offset + length) });
        offset += length;
    }
    return fields;
}
function serialize(fields) {
    return fields.map(({ tag, value }) => tag + value.length.toString().padStart(2, '0') + value).join('');
}
function validateStaticQris(input) {
    const payload = input.trim();
    if (payload.length > 4096 || !/^[\x20-\x7E]+$/.test(payload))
        throw new errors_1.BadRequestError('Isi QRIS tidak valid.');
    const fields = parse(payload);
    const get = (tag) => fields.find(f => f.tag === tag)?.value;
    if (fields[0]?.tag !== '00' || get('00') !== '01' || fields[fields.length - 1]?.tag !== '63' ||
        !/^[0-9A-Fa-f]{4}$/.test(get('63') || '') || crc16(payload.slice(0, -4)) !== get('63')?.toUpperCase()) {
        throw new errors_1.BadRequestError('Checksum QRIS tidak valid. Unggah gambar QRIS asli yang jelas.');
    }
    if (get('01') !== '11' || get('54') !== undefined)
        throw new errors_1.BadRequestError('Gunakan QRIS statis tanpa nominal, bukan QRIS transaksi dinamis.');
    if (get('53') !== '360' || get('58') !== 'ID' || !/^\d{4}$/.test(get('52') || '') || !get('59') || !get('60')) {
        throw new errors_1.BadRequestError('QR harus berupa QRIS merchant Indonesia dalam Rupiah.');
    }
    const accounts = fields.filter(f => Number(f.tag) >= 26 && Number(f.tag) <= 51);
    const parsedAccounts = accounts.map(f => parse(f.value));
    if (!accounts.length || !parsedAccounts.some(account => account.some(n => n.tag === '00' && /^ID\./i.test(n.value)))) {
        throw new errors_1.BadRequestError('Identitas penyedia QRIS tidak ditemukan.');
    }
    if (get('62'))
        parse(get('62'));
    // Do not silently change tip/service-fee instructions on the original QR.
    if (fields.some(f => ['55', '56', '57'].includes(f.tag)))
        throw new errors_1.BadRequestError('QRIS dengan tip/biaya tambahan belum didukung. Gunakan QRIS tanpa biaya tambahan.');
    return { payload, fields, merchantName: get('59'), merchantCity: get('60') };
}
function dynamicQris(input, amount) {
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > 10000000) {
        throw new errors_1.BadRequestError('Nominal QRIS harus Rupiah bulat antara Rp1 dan Rp10.000.000.');
    }
    const { fields } = validateStaticQris(input);
    const converted = fields.filter(f => f.tag !== '63').map(f => f.tag === '01' ? { ...f, value: '12' } : f);
    const index = converted.findIndex(f => Number(f.tag) > 54);
    converted.splice(index < 0 ? converted.length : index, 0, { tag: '54', value: String(amount) });
    const body = serialize(converted) + '6304';
    return body + crc16(body);
}
//# sourceMappingURL=qris-payload.js.map