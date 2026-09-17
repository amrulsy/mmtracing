"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sse_1 = require("../../shared/sse");
const logger_1 = __importDefault(require("../../config/logger"));
const router = (0, express_1.Router)();
// GET /events — SSE endpoint for real-time updates
router.get('/', (req, res) => {
    const clientId = sse_1.sseManager.addClient(res);
    logger_1.default.info(`[SSE] Client #${clientId} connected (total: ${sse_1.sseManager.clientCount})`);
    req.on('close', () => {
        logger_1.default.info(`[SSE] Client #${clientId} disconnected (total: ${sse_1.sseManager.clientCount})`);
    });
});
exports.default = router;
//# sourceMappingURL=events.routes.js.map