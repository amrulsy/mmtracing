"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.midtransEnvironment = midtransEnvironment;
exports.midtransReady = midtransReady;
exports.midtransBase = midtransBase;
exports.midtransRequest = midtransRequest;
exports.validateMidtransTransaction = validateMidtransTransaction;
exports.requireMidtransSettlement = requireMidtransSettlement;
const errors_1 = require("../../shared/errors");
function midtransEnvironment() {
    const value = process.env.MIDTRANS_ENVIRONMENT || 'sandbox';
    if (value !== 'sandbox' && value !== 'production')
        throw new errors_1.BadRequestError('MIDTRANS_ENVIRONMENT harus sandbox atau production.');
    return value;
}
function midtransReady() { return !!process.env.MIDTRANS_SERVER_KEY?.trim(); }
function midtransBase(environment) {
    return environment === 'production' ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com';
}
async function midtransRequest(path, environment, body) {
    if (!midtransReady())
        throw new errors_1.BadRequestError('MIDTRANS_SERVER_KEY belum diatur di server.');
    if (environment !== midtransEnvironment())
        throw new errors_1.BadRequestError('Lingkungan sesi Midtrans berbeda dari konfigurasi server. Rekonsiliasi sesi di lingkungan asal.');
    try {
        const response = await fetch(`${midtransBase(environment)}/v2/${path}`, {
            method: body ? 'POST' : 'GET',
            headers: { Authorization: `Basic ${Buffer.from(`${process.env.MIDTRANS_SERVER_KEY.trim()}:`).toString('base64')}`, 'Content-Type': 'application/json', Accept: 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
            signal: AbortSignal.timeout(15000),
        });
        const result = await response.json();
        // A duplicate order is recovered with Get Status, never a new order ID.
        if (body && result.status_code === '406')
            return midtransRequest(`${encodeURIComponent(body.transaction_details.order_id)}/status`, environment);
        if (!response.ok || !['200', '201', '202'].includes(result.status_code))
            throw new Error('gateway');
        return result;
    }
    catch (error) {
        if (error instanceof errors_1.BadRequestError)
            throw error;
        throw new errors_1.BadRequestError('Midtrans belum dapat dihubungi atau menolak permintaan. Periksa konfigurasi lalu coba lagi; sesi yang sama akan digunakan.');
    }
}
function validateMidtransTransaction(value, orderId, amount) {
    if (value.order_id !== orderId || Number(value.gross_amount) !== amount || value.currency !== 'IDR' || value.payment_type !== 'qris' || !value.transaction_id) {
        throw new errors_1.BadRequestError('Data transaksi Midtrans tidak sesuai dengan sesi pembayaran.');
    }
}
function requireMidtransSettlement(value, orderId, amount) {
    validateMidtransTransaction(value, orderId, amount);
    if (value.transaction_status !== 'settlement' || (value.fraud_status && value.fraud_status !== 'accept')) {
        const statuses = { pending: 'menunggu pembayaran', expire: 'kedaluwarsa', cancel: 'dibatalkan', deny: 'ditolak', refund: 'dikembalikan' };
        throw new errors_1.BadRequestError(`Pembayaran Midtrans ${statuses[value.transaction_status] || 'belum berhasil'}. Belum dicatat sebagai pembayaran.`);
    }
}
//# sourceMappingURL=midtrans.js.map