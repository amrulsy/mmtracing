"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.woController = exports.WoControllerClass = void 0;
const wo_service_1 = require("./wo.service");
const wo_items_service_1 = require("./wo-items.service");
const wo_stages_service_1 = require("./wo-stages.service");
const utils_1 = require("../../shared/utils");
class WoControllerClass {
    async findAll(req, res, next) {
        try {
            const { data, total, page, limit } = await wo_service_1.woService.findAll(req.query);
            (0, utils_1.sendPaginated)(res, data, total, page, limit);
        }
        catch (e) {
            next(e);
        }
    }
    async findById(req, res, next) {
        try {
            const data = await wo_service_1.woService.findById(Number(req.params.id));
            (0, utils_1.sendSuccess)(res, data);
        }
        catch (e) {
            next(e);
        }
    }
    async create(req, res, next) {
        try {
            const data = await wo_service_1.woService.create(req.body, req.user.id);
            (0, utils_1.sendCreated)(res, data, 'Work Order berhasil dibuat');
        }
        catch (e) {
            next(e);
        }
    }
    async updateStatus(req, res, next) {
        try {
            const data = await wo_service_1.woService.updateStatus(Number(req.params.id), req.body, req.user?.id);
            (0, utils_1.sendSuccess)(res, data, 'Status Work Order diperbarui');
        }
        catch (e) {
            next(e);
        }
    }
    async updateProgress(req, res, next) {
        try {
            const { progress } = req.body;
            if (typeof progress !== 'number' || progress < 0 || progress > 100) {
                res.status(400).json({ success: false, message: 'Progress harus angka 0-100' });
                return;
            }
            const data = await wo_service_1.woService.updateProgress(Number(req.params.id), progress, req.user?.id);
            (0, utils_1.sendSuccess)(res, data, 'Progres Work Order diperbarui');
        }
        catch (e) {
            next(e);
        }
    }
    async restore(req, res, next) {
        try {
            const result = await wo_service_1.woService.restore(Number(req.params.id), req.user?.id);
            (0, utils_1.sendSuccess)(res, null, result.message);
        }
        catch (e) {
            next(e);
        }
    }
    async delete(req, res, next) {
        try {
            const result = await wo_service_1.woService.delete(Number(req.params.id), req.user?.id);
            (0, utils_1.sendSuccess)(res, null, result.message);
        }
        catch (e) {
            next(e);
        }
    }
    // ── Item Management ──────────────────────────────────────────
    async addItem(req, res, next) {
        try {
            const data = await wo_items_service_1.woItemsService.addItem(Number(req.params.id), req.body, req.user?.id);
            (0, utils_1.sendSuccess)(res, data, 'Item berhasil ditambahkan');
        }
        catch (e) {
            next(e);
        }
    }
    async removeItem(req, res, next) {
        try {
            const data = await wo_items_service_1.woItemsService.removeItem(Number(req.params.id), Number(req.params.itemId), req.user?.id);
            (0, utils_1.sendSuccess)(res, data, 'Item berhasil dihapus');
        }
        catch (e) {
            next(e);
        }
    }
    async updateItem(req, res, next) {
        try {
            const data = await wo_items_service_1.woItemsService.updateItem(Number(req.params.id), Number(req.params.itemId), req.body, req.user?.id);
            (0, utils_1.sendSuccess)(res, data, 'Item berhasil diperbarui');
        }
        catch (e) {
            next(e);
        }
    }
    async updateStage(req, res, next) {
        try {
            const data = await wo_stages_service_1.woStagesService.updateStage(Number(req.params.id), Number(req.params.stageId), req.body, req.user?.id);
            (0, utils_1.sendSuccess)(res, data, 'Tahapan berhasil diperbarui');
        }
        catch (e) {
            next(e);
        }
    }
    async addStage(req, res, next) {
        try {
            const data = await wo_stages_service_1.woStagesService.addStage(Number(req.params.id), req.body, req.user?.id);
            (0, utils_1.sendSuccess)(res, data, 'Tahapan berhasil ditambahkan');
        }
        catch (e) {
            next(e);
        }
    }
    // ── Edit Work Order ──────────────────────────────────────────
    async update(req, res, next) {
        try {
            const data = await wo_service_1.woService.update(Number(req.params.id), req.body, req.user?.id);
            (0, utils_1.sendSuccess)(res, data, 'Work Order berhasil diperbarui');
        }
        catch (e) {
            next(e);
        }
    }
    async assignMekanik(req, res, next) {
        try {
            const data = await wo_service_1.woService.assignMekanik(Number(req.params.id), req.body.mekanikId ?? null, req.user?.id);
            (0, utils_1.sendSuccess)(res, data, data.mekanikId ? 'Mekanik berhasil diassign' : 'Mekanik berhasil di-unassign');
        }
        catch (e) {
            next(e);
        }
    }
    // ── Stats dashboard ───────────────────────────────────────────
    async stats(_req, res, next) {
        try {
            const data = await wo_service_1.woService.stats();
            (0, utils_1.sendSuccess)(res, data);
        }
        catch (e) {
            next(e);
        }
    }
    // ── Analytics breakdown per mode + top sparepart + performa mekanik ──
    async analytics(req, res, next) {
        try {
            const { dateFrom, dateTo } = req.query;
            const data = await wo_service_1.woService.analytics({ dateFrom, dateTo });
            (0, utils_1.sendSuccess)(res, data);
        }
        catch (e) {
            next(e);
        }
    }
    // ── Upload foto/gambar referensi ──────────────────────────────
    async uploadPhoto(req, res, next) {
        try {
            const file = req.file;
            if (!file) {
                res.status(400).json({ success: false, message: 'File foto wajib diupload dengan field "photo"' });
                return;
            }
            const id = Number(req.params.id);
            const type = String(req.body?.type || 'lampiran');
            const caption = req.body?.caption ? String(req.body.caption) : undefined;
            const data = await wo_service_1.woService.addPhoto(id, { url: `/uploads/${file.filename}`, caption, type });
            (0, utils_1.sendCreated)(res, data, 'Foto berhasil diupload');
        }
        catch (e) {
            next(e);
        }
    }
    // ── Kirim ulang notifikasi WhatsApp invoice (WO dibuat) ──────
    async sendWhatsapp(req, res, next) {
        try {
            const kind = String(req.body?.kind || 'created'); // created | selesai | reminder-pembayaran
            const id = Number(req.params.id);
            const mod = await Promise.resolve().then(() => __importStar(require('../whatsapp/whatsapp.notification')));
            if (kind === 'created')
                await mod.notifyWoCreated(id);
            else if (kind === 'selesai')
                await mod.notifyWoSelesai(id);
            else if (kind === 'progress')
                await mod.notifyProgressUpdate(id);
            else
                throw new Error('Tipe notifikasi tidak dikenal');
            (0, utils_1.sendSuccess)(res, null, `Notifikasi "${kind}" dikirim ulang`);
        }
        catch (e) {
            next(e);
        }
    }
}
exports.WoControllerClass = WoControllerClass;
exports.woController = new WoControllerClass();
//# sourceMappingURL=wo.controller.js.map