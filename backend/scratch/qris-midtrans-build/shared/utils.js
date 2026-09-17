"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccess = sendSuccess;
exports.sendCreated = sendCreated;
exports.sendPaginated = sendPaginated;
exports.parsePagination = parsePagination;
exports.generateCode = generateCode;
exports.generateInvoiceNo = generateInvoiceNo;
exports.generateWoNo = generateWoNo;
function sendSuccess(res, data = null, message = 'Berhasil', statusCode = 200) {
    res.status(statusCode).json({
        success: true,
        message,
        data,
    });
}
function sendCreated(res, data = null, message = 'Data berhasil dibuat') {
    sendSuccess(res, data, message, 201);
}
function sendPaginated(res, data, total, page, limit, message = 'Berhasil') {
    res.status(200).json({
        success: true,
        message,
        data,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
        },
    });
}
function parsePagination(query) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
    return { page, limit, skip: (page - 1) * limit };
}
function generateCode(prefix, counter, padLength = 3) {
    return `${prefix}-${String(counter).padStart(padLength, '0')}`;
}
function generateInvoiceNo() {
    const now = new Date();
    const y = String(now.getFullYear()).slice(-2);
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    // Gunakan millisecond + random 3 digit untuk menghindari collision (1000 * 1000 = 1jt kombinasi/hari)
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    const rand = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return `INV-${y}${m}${d}-${ms}${rand}`;
}
function generateWoNo() {
    const now = new Date();
    const y = String(now.getFullYear()).slice(-2);
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    const rand = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return `WO-${y}${m}${d}-${ms}${rand}`;
}
//# sourceMappingURL=utils.js.map