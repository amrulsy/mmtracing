"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const logger_1 = __importDefault(require("./config/logger"));
const PORT = env_1.env.port;
app_1.default.listen(PORT, '0.0.0.0', () => {
    logger_1.default.info(`🚀 MMT Racing API running on port ${PORT}`);
    logger_1.default.info(`📍 Environment: ${env_1.env.nodeEnv}`);
    logger_1.default.info(`🔗 API URL: ${env_1.env.appUrl}/api/v1`);
    logger_1.default.info(`🌐 Frontend URL: ${env_1.env.frontendUrl}`);
});
//# sourceMappingURL=server.js.map