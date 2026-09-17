"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.woStagesService = exports.WoStagesService = void 0;
const db_1 = __importDefault(require("../../config/db"));
const errors_1 = require("../../shared/errors");
const wo_service_1 = require("./wo.service");
class WoStagesService {
    async addStage(woId, input, userId) {
        const spk = await db_1.default.queryOne('SELECT id, noWo, status FROM work_orders WHERE id = ?', [woId]);
        if (!spk)
            throw new errors_1.NotFoundError('work_orders');
        if (spk.status === 'selesai' || spk.status === 'dibatalkan') {
            throw new errors_1.BadRequestError(`Tidak bisa menambah tahapan pada Work Order yang sudah ${spk.status}`);
        }
        const maxUrutanRow = await db_1.default.queryOne('SELECT MAX(urutan) AS maxU FROM wo_stages WHERE woId = ?', [woId]);
        const nextUrutan = (maxUrutanRow?.maxU || 0) + 1;
        await db_1.default.transaction(async (tx) => {
            await tx.insert('wo_stages', {
                woId, urutan: nextUrutan, nama: input.nama, estimasiBiaya: input.estimasiBiaya, durasiHari: input.durasiHari, status: 'pending',
            });
            await wo_service_1.woService.recalcTotalHarga(tx, woId);
            await wo_service_1.woService.recalcProgress(tx, woId);
            await tx.insert('activity_logs', {
                userId: userId ?? null, action: 'add_stage', module: 'work_orders',
                targetId: woId, targetName: spk.noWo,
                detail: JSON.stringify({ nama: input.nama, estimasiBiaya: input.estimasiBiaya }),
            });
        });
        return wo_service_1.woService.findById(woId);
    }
    async updateStage(woId, stageId, input, userId) {
        const spk = await db_1.default.queryOne('SELECT id, noWo, status FROM work_orders WHERE id = ?', [woId]);
        if (!spk)
            throw new errors_1.NotFoundError('work_orders');
        if (spk.status === 'selesai' || spk.status === 'dibatalkan') {
            throw new errors_1.BadRequestError(`Tidak bisa mengedit tahapan pada Work Order yang sudah ${spk.status}`);
        }
        const stage = await db_1.default.queryOne('SELECT * FROM wo_stages WHERE id = ? AND woId = ?', [stageId, woId]);
        if (!stage)
            throw new errors_1.NotFoundError('Tahapan Work Order');
        await db_1.default.transaction(async (tx) => {
            const now = new Date();
            const updates = {};
            if (input.status !== undefined)
                updates.status = input.status;
            if (input.status === 'in_progress' && !stage.startedAt)
                updates.startedAt = now;
            if (input.status === 'done' && !stage.completedAt)
                updates.completedAt = now;
            if (Object.keys(updates).length > 0) {
                await tx.update('wo_stages', updates, 'id = ?', [stageId]);
                await wo_service_1.woService.recalcProgress(tx, woId);
                await tx.insert('activity_logs', {
                    userId: userId ?? null, action: 'update_stage_status', module: 'work_orders',
                    targetId: woId, targetName: spk.noWo,
                    detail: JSON.stringify({ stageId, nama: stage.nama, oldStatus: stage.status, newStatus: input.status }),
                });
            }
        });
        return wo_service_1.woService.findById(woId);
    }
    async removeStage(woId, stageId, userId) {
        const spk = await db_1.default.queryOne('SELECT id, noWo, status FROM work_orders WHERE id = ?', [woId]);
        if (!spk)
            throw new errors_1.NotFoundError('work_orders');
        if (spk.status === 'selesai' || spk.status === 'dibatalkan') {
            throw new errors_1.BadRequestError(`Tidak bisa menghapus tahapan pada Work Order yang sudah ${spk.status}`);
        }
        const stage = await db_1.default.queryOne('SELECT * FROM wo_stages WHERE id = ? AND woId = ?', [stageId, woId]);
        if (!stage)
            throw new errors_1.NotFoundError('Tahapan Work Order');
        await db_1.default.transaction(async (tx) => {
            await tx.execute('DELETE FROM wo_stages WHERE id = ?', [stageId]);
            await wo_service_1.woService.recalcTotalHarga(tx, woId);
            await wo_service_1.woService.recalcProgress(tx, woId);
            await tx.insert('activity_logs', {
                userId: userId ?? null, action: 'remove_stage', module: 'work_orders',
                targetId: woId, targetName: spk.noWo,
                detail: JSON.stringify({ nama: stage.nama, estimasiBiaya: stage.estimasiBiaya }),
            });
        });
        return wo_service_1.woService.findById(woId);
    }
}
exports.WoStagesService = WoStagesService;
exports.woStagesService = new WoStagesService();
//# sourceMappingURL=wo-stages.service.js.map