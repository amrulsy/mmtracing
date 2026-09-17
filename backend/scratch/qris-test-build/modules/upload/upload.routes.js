"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const upload_1 = require("../../middleware/upload");
const utils_1 = require("../../shared/utils");
const errors_1 = require("../../shared/errors");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// POST /upload/image — generic image upload, returns url
// Dipakai oleh fitur foto pelanggan & kendaraan.
router.post('/image', upload_1.upload.single('image'), async (req, res, next) => {
    try {
        const file = req.file;
        if (!file)
            throw new errors_1.BadRequestError('File gambar wajib diupload dengan field "image"');
        if (!file.mimetype.startsWith('image/')) {
            throw new errors_1.BadRequestError('File bukan gambar');
        }
        const url = `/uploads/${file.filename}`;
        (0, utils_1.sendSuccess)(res, { url, filename: file.filename, size: file.size }, 'Gambar berhasil diupload');
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=upload.routes.js.map