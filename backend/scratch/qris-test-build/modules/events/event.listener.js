"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeEventListeners = initializeEventListeners;
const eventEmitter_1 = require("../../shared/eventEmitter");
const sse_1 = require("../../shared/sse");
const db_1 = __importDefault(require("../../config/db"));
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = __importDefault(require("../../config/logger"));
const whatsapp_notification_1 = require("../whatsapp/whatsapp.notification");
function initializeEventListeners() {
    // WO Created
    eventEmitter_1.appEventEmitter.on('wo:created', (payload) => {
        (0, whatsapp_notification_1.notifyWoCreated)(payload.woId);
    });
    // WO Selesai
    eventEmitter_1.appEventEmitter.on('wo:selesai', async (payload) => {
        sse_1.sseManager.broadcast('wo:selesai', payload);
        (0, whatsapp_notification_1.notifyWoSelesai)(payload.woId);
        // Sync booking status to 'selesai' jika ada booking yang terhubung
        try {
            await db_1.default.execute("UPDATE bookings SET status = 'selesai', updatedAt = NOW() WHERE woId = ? AND status != 'selesai'", [payload.woId]);
        }
        catch (err) {
            logger_1.default.error('[Event] Gagal sync booking status:', err);
        }
        if (payload.isLunas && payload.noInvoice) {
            (0, whatsapp_notification_1.notifyGatePassReleased)(payload.woId, payload.noInvoice);
        }
    });
    // WO Kendala
    eventEmitter_1.appEventEmitter.on('wo:kendala', async (payload) => {
        sse_1.sseManager.broadcast('wo:kendala', payload);
        const token = crypto_1.default.randomBytes(16).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        await db_1.default.insert('approval_tokens', {
            token,
            woId: payload.woId,
            expiresAt,
        });
        const approvalLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/approval/${token}`;
        (0, whatsapp_notification_1.notifyWoKendala)(payload.woId, approvalLink);
    });
    // WO Batal
    eventEmitter_1.appEventEmitter.on('wo:dibatalkan', (payload) => {
        sse_1.sseManager.broadcast('wo:updated', payload);
        (0, whatsapp_notification_1.notifyWoBatal)(payload.woId);
    });
    // WO Progress Update
    eventEmitter_1.appEventEmitter.on('wo:progress', (payload) => {
        (0, whatsapp_notification_1.notifyProgressUpdate)(payload.woId);
    });
    // WO Generic Update (dikerjakan)
    eventEmitter_1.appEventEmitter.on('wo:updated', (payload) => {
        sse_1.sseManager.broadcast('wo:updated', payload);
    });
    // Inventaris: stok berubah (masuk/keluar/opname)
    eventEmitter_1.appEventEmitter.on('inventaris:stok-update', (payload) => {
        sse_1.sseManager.broadcast('inventaris:stok-update', payload);
    });
    // New notification created
    eventEmitter_1.appEventEmitter.on('notifikasi:new', (payload) => {
        sse_1.sseManager.broadcast('notifikasi:new', payload);
    });
    logger_1.default.info('[Event Listener] Initialized successfully');
}
//# sourceMappingURL=event.listener.js.map