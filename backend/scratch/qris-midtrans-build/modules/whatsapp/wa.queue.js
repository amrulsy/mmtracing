"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasRedis = exports.waWorker = exports.waQueue = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const whatsapp_service_1 = require("./whatsapp.service");
const logger_1 = __importDefault(require("../../config/logger"));
const hasRedis = !!process.env.REDIS_URL;
exports.hasRedis = hasRedis;
let waQueue;
let waWorker;
if (hasRedis) {
    const connection = new ioredis_1.default(process.env.REDIS_URL, {
        maxRetriesPerRequest: null,
        retryStrategy(times) {
            if (times > 3)
                return null;
            return Math.min(times * 100, 5000);
        }
    });
    connection.on('error', (err) => {
        // Suppress spam
    });
    exports.waQueue = waQueue = new bullmq_1.Queue('whatsapp-messages', { connection: connection });
    exports.waWorker = waWorker = new bullmq_1.Worker('whatsapp-messages', async (job) => {
        const { jid, text } = job.data;
        if (whatsapp_service_1.whatsappService.status !== 'connected')
            throw new Error('WhatsApp tidak terhubung');
        try {
            await whatsapp_service_1.whatsappService.sendMessage(jid, text);
            logger_1.default.info(`[WhatsApp Queue] Pesan berhasil dikirim ke ${jid}`);
        }
        catch (error) {
            logger_1.default.error(`[WhatsApp Queue] Gagal mengirim pesan ke ${jid}: ${error.message}`);
            throw error;
        }
    }, {
        connection: connection,
        limiter: { max: 1, duration: 1500 }
    });
    waWorker.on('failed', (job, err) => {
        logger_1.default.error(`[WhatsApp Worker] Job ${job?.id} gagal: ${err.message}`);
    });
    waWorker.on('error', () => { });
    waQueue.on('error', () => { });
}
else {
    // Mode tanpa Redis: Langsung eksekusi tanpa antrean
    exports.waQueue = waQueue = {
        add: async (name, data, opts) => {
            setTimeout(async () => {
                try {
                    if (whatsapp_service_1.whatsappService.status !== 'connected') {
                        logger_1.default.warn(`[WhatsApp Fallback] Message dropped because status is ${whatsapp_service_1.whatsappService.status}`);
                        return;
                    }
                    await whatsapp_service_1.whatsappService.sendMessage(data.jid, data.text);
                    logger_1.default.info(`[WhatsApp Fallback] Pesan berhasil dikirim ke ${data.jid}`);
                }
                catch (error) {
                    logger_1.default.error(`[WhatsApp Fallback] Gagal mengirim pesan: ${error.message}`);
                }
            }, Math.random() * 2000); // delay random agar tidak kena rate limit
            return { id: `memory-${Date.now()}` };
        }
    };
}
//# sourceMappingURL=wa.queue.js.map