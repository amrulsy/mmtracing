"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const env_1 = require("../config/env");
const fs_1 = __importDefault(require("fs"));
// Ensure upload directory exists
const uploadDir = path_1.default.resolve(env_1.env.upload.dir);
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname);
        const name = `${Date.now()}-${(0, crypto_1.randomUUID)().slice(0, 8)}${ext}`;
        cb(null, name);
    },
});
const fileFilter = (_req, file, cb) => {
    const allowedMimes = [
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error(`Tipe file ${file.mimetype} tidak diizinkan`));
    }
};
exports.upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: env_1.env.upload.maxFileSize,
    },
});
//# sourceMappingURL=upload.js.map