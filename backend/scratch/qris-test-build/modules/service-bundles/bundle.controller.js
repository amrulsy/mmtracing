"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bundleController = exports.BundleController = void 0;
const bundle_service_1 = require("./bundle.service");
const utils_1 = require("../../shared/utils");
class BundleController {
    async findAll(req, res, next) {
        try {
            const activeOnly = req.query.active === 'true';
            const data = await bundle_service_1.bundleService.findAll(activeOnly);
            (0, utils_1.sendSuccess)(res, data);
        }
        catch (e) {
            next(e);
        }
    }
    async findById(req, res, next) {
        try {
            const data = await bundle_service_1.bundleService.findById(String(req.params.id));
            (0, utils_1.sendSuccess)(res, data);
        }
        catch (e) {
            next(e);
        }
    }
    async create(req, res, next) {
        try {
            const data = await bundle_service_1.bundleService.create(req.body);
            (0, utils_1.sendCreated)(res, data, 'Paket servis berhasil dibuat');
        }
        catch (e) {
            next(e);
        }
    }
    async update(req, res, next) {
        try {
            const data = await bundle_service_1.bundleService.update(String(req.params.id), req.body);
            (0, utils_1.sendSuccess)(res, data, 'Paket servis berhasil diperbarui');
        }
        catch (e) {
            next(e);
        }
    }
    async delete(req, res, next) {
        try {
            await bundle_service_1.bundleService.delete(String(req.params.id));
            (0, utils_1.sendSuccess)(res, null, 'Paket servis berhasil dihapus');
        }
        catch (e) {
            next(e);
        }
    }
}
exports.BundleController = BundleController;
exports.bundleController = new BundleController();
//# sourceMappingURL=bundle.controller.js.map