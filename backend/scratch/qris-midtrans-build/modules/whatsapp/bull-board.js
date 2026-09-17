"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverAdapter = void 0;
const api_1 = require("@bull-board/api");
const bullMQAdapter_1 = require("@bull-board/api/bullMQAdapter");
const express_1 = require("@bull-board/express");
const wa_queue_1 = require("./wa.queue");
// Inisialisasi adapter untuk Express
exports.serverAdapter = new express_1.ExpressAdapter();
// Setup UI dashboard pada route spesifik
exports.serverAdapter.setBasePath('/api/v1/admin/queues');
// Inisialisasi Bull-Board dengan antrean WhatsApp
(0, api_1.createBullBoard)({
    queues: wa_queue_1.hasRedis ? [new bullMQAdapter_1.BullMQAdapter(wa_queue_1.waQueue)] : [],
    serverAdapter: exports.serverAdapter,
});
//# sourceMappingURL=bull-board.js.map