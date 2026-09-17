"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
const env_1 = require("./env");
// Override console methods to filter out spammy libsignal logs
const originalConsoleInfo = console.info;
console.info = function (...args) {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (msg.includes('Closing session:') ||
        msg.includes('Opening session:') ||
        msg.includes('Removing old closed session:')) {
        return; // Suppress libsignal session spam
    }
    originalConsoleInfo.apply(console, args);
};
const originalConsoleWarn = console.warn;
console.warn = function (...args) {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (msg.includes('Session already closed') ||
        msg.includes('Session already open') ||
        msg.includes('Decrypted message with closed session')) {
        return; // Suppress libsignal session spam
    }
    originalConsoleWarn.apply(console, args);
};
// Custom log levels: add 'crit' between 'error' and 'warn'
const customLevels = {
    levels: {
        error: 0,
        crit: 1,
        warn: 2,
        info: 3,
        http: 4,
        verbose: 5,
        debug: 6,
        silly: 7,
    },
    colors: {
        error: 'red',
        crit: 'red bold',
        warn: 'yellow',
        info: 'green',
        http: 'magenta',
        verbose: 'cyan',
        debug: 'white',
        silly: 'grey',
    },
};
winston_1.default.addColors(customLevels.colors);
const logger = winston_1.default.createLogger({
    levels: customLevels.levels,
    level: env_1.env.nodeEnv === 'development' ? 'debug' : 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
    defaultMeta: { service: 'mmtracing-api' },
    transports: [
        new winston_1.default.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston_1.default.transports.File({ filename: 'logs/critical.log', level: 'crit' }),
        new winston_1.default.transports.File({ filename: 'logs/combined.log' }),
    ],
});
if (env_1.env.nodeEnv === 'development') {
    logger.add(new winston_1.default.transports.Console({
        format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length > 1 ? ` ${JSON.stringify(meta)}` : '';
            return `${timestamp} [${level}]: ${message}${metaStr}`;
        })),
    }));
}
exports.default = logger;
//# sourceMappingURL=logger.js.map