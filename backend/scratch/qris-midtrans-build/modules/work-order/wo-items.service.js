"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.woItemsService = exports.WoItemsService = void 0;
const db_1 = __importDefault(require("../../config/db"));
const errors_1 = require("../../shared/errors");
const wo_service_1 = require("./wo.service");
class WoItemsService {
    async addItem(woId, input, userId) {
        const spk = await db_1.default.queryOne('SELECT id, noWo, status FROM work_orders WHERE id = ?', [woId]);
        if (!spk)
            throw new errors_1.NotFoundError('work_orders');
        if (spk.status === 'selesai' || spk.status === 'dibatalkan') {
            throw new errors_1.BadRequestError(`Tidak bisa menambah item pada Work Order yang sudah ${spk.status}`);
        }
        const subtotal = input.hargaSatuan * input.qty;
        await db_1.default.transaction(async (tx) => {
            let hpp = 0;
            if (input.type === 'jasa' && input.jasaId) {
                const j = await tx.queryOne('SELECT hargaModal FROM jasa WHERE id = ?', [input.jasaId]);
                hpp = Number(j?.hargaModal || 0);
            }
            if (input.type === 'sparepart' && input.sparepartId) {
                const sp = await tx.queryOne('SELECT name, stok, hargaBeli FROM sparepart WHERE id = ? FOR UPDATE', [input.sparepartId]);
                if (!sp)
                    throw new errors_1.BadRequestError('Sparepart tidak ditemukan');
                if (sp.stok < input.qty) {
                    throw new errors_1.BadRequestError(`Stok "${sp.name}" tidak mencukupi (tersisa ${sp.stok}, butuh ${input.qty})`);
                }
                hpp = Number(sp.hargaBeli) || 0;
                const r = await tx.execute('UPDATE sparepart SET stok = stok - ? WHERE id = ? AND stok >= ?', [input.qty, input.sparepartId, input.qty]);
                if (r.affectedRows === 0) {
                    throw new errors_1.BadRequestError(`Stok "${sp.name}" tidak mencukupi saat proses simultan`);
                }
                await tx.insert('inventaris_log', {
                    sparepartId: input.sparepartId, type: 'keluar', qty: input.qty,
                    keterangan: `Tambah item WO ${spk.noWo}`,
                });
            }
            let existingItem = null;
            if (input.type === 'sparepart' && input.sparepartId) {
                existingItem = await tx.queryOne("SELECT * FROM wo_items WHERE woId = ? AND type = 'sparepart' AND sparepartId = ? LIMIT 1", [woId, input.sparepartId]);
            }
            else if (input.type === 'jasa' && input.jasaId) {
                existingItem = await tx.queryOne("SELECT * FROM wo_items WHERE woId = ? AND type = 'jasa' AND jasaId = ? LIMIT 1", [woId, input.jasaId]);
            }
            if (existingItem) {
                const newQty = existingItem.qty + input.qty;
                const newHargaSatuan = existingItem.hargaSatuan;
                const newSubtotal = newQty * Number(newHargaSatuan);
                const oldHpp = Number(existingItem.hargaModal) * existingItem.qty;
                const newHppContrib = hpp * input.qty;
                const weightedHpp = newQty > 0 ? Math.round((oldHpp + newHppContrib) / newQty) : 0;
                await tx.update('wo_items', { qty: newQty, subtotal: newSubtotal, hargaModal: weightedHpp }, 'id = ?', [existingItem.id]);
            }
            else {
                await tx.insert('wo_items', {
                    woId, type: input.type,
                    sparepartId: input.type === 'sparepart' ? (input.sparepartId ?? null) : null,
                    jasaId: input.type === 'jasa' ? (input.jasaId ?? null) : null,
                    nama: input.nama, qty: input.qty, hargaModal: hpp, hargaSatuan: input.hargaSatuan, subtotal,
                });
            }
            await wo_service_1.woService.recalcTotalHarga(tx, woId);
            await tx.insert('activity_logs', {
                userId: userId ?? null, action: 'add_item', module: 'work_orders',
                targetId: woId, targetName: spk.noWo,
                detail: JSON.stringify({ nama: input.nama, qty: input.qty, type: input.type, subtotal }),
            });
        });
        return wo_service_1.woService.findById(woId);
    }
    async removeItem(woId, itemId, userId) {
        const spk = await db_1.default.queryOne('SELECT id, noWo, status FROM work_orders WHERE id = ?', [woId]);
        if (!spk)
            throw new errors_1.NotFoundError('work_orders');
        if (spk.status === 'selesai' || spk.status === 'dibatalkan') {
            throw new errors_1.BadRequestError(`Tidak bisa menghapus item pada Work Order yang sudah ${spk.status}`);
        }
        const item = await db_1.default.queryOne('SELECT * FROM wo_items WHERE id = ? AND woId = ?', [itemId, woId]);
        if (!item)
            throw new errors_1.NotFoundError('Item Work Order');
        await db_1.default.transaction(async (tx) => {
            if (item.type === 'sparepart' && item.sparepartId) {
                const sp = await tx.queryOne('SELECT id FROM sparepart WHERE id = ?', [item.sparepartId]);
                if (sp) {
                    await tx.execute('UPDATE sparepart SET stok = stok + ? WHERE id = ?', [item.qty, item.sparepartId]);
                    await tx.insert('inventaris_log', {
                        sparepartId: item.sparepartId, type: 'masuk', qty: item.qty,
                        keterangan: `Item dihapus dari WO ${spk.noWo}`,
                    });
                }
            }
            await tx.execute('DELETE FROM wo_items WHERE id = ?', [itemId]);
            await wo_service_1.woService.recalcTotalHarga(tx, woId);
            await wo_service_1.woService.recalcProgress(tx, woId);
            await tx.insert('activity_logs', {
                userId: userId ?? null, action: 'remove_item', module: 'work_orders',
                targetId: woId, targetName: spk.noWo,
                detail: JSON.stringify({ nama: item.nama, qty: item.qty, subtotal: item.subtotal }),
            });
        });
        return wo_service_1.woService.findById(woId);
    }
    async updateItem(woId, itemId, input, userId) {
        const spk = await db_1.default.queryOne('SELECT id, noWo, status FROM work_orders WHERE id = ?', [woId]);
        if (!spk)
            throw new errors_1.NotFoundError('work_orders');
        if (spk.status === 'selesai' || spk.status === 'dibatalkan') {
            throw new errors_1.BadRequestError(`Tidak bisa mengedit item pada Work Order yang sudah ${spk.status}`);
        }
        const item = await db_1.default.queryOne('SELECT * FROM wo_items WHERE id = ? AND woId = ?', [itemId, woId]);
        if (!item)
            throw new errors_1.NotFoundError('Item Work Order');
        await db_1.default.transaction(async (tx) => {
            if (input.status !== undefined && input.status !== item.status) {
                await tx.update('wo_items', { status: input.status }, 'id = ?', [itemId]);
                await wo_service_1.woService.recalcProgress(tx, woId);
                await tx.insert('activity_logs', {
                    userId: userId ?? null, action: 'update_item_status', module: 'work_orders',
                    targetId: woId, targetName: spk.noWo,
                    detail: JSON.stringify({ itemId, nama: item.nama, oldStatus: item.status, newStatus: input.status }),
                });
            }
        });
        return wo_service_1.woService.findById(woId);
    }
    async updateItemHpp(woId, itemId, hargaModal, userId) {
        const spk = await db_1.default.queryOne('SELECT id, noWo, status FROM work_orders WHERE id = ?', [woId]);
        if (!spk)
            throw new errors_1.NotFoundError('work_orders');
        const item = await db_1.default.queryOne('SELECT * FROM wo_items WHERE id = ? AND woId = ?', [itemId, woId]);
        if (!item)
            throw new errors_1.NotFoundError('Item Work Order');
        await db_1.default.transaction(async (tx) => {
            await tx.update('wo_items', { hargaModal }, 'id = ?', [itemId]);
            await tx.insert('activity_logs', {
                userId: userId ?? null, action: 'update_item_hpp', module: 'work_orders',
                targetId: woId, targetName: spk.noWo,
                detail: JSON.stringify({ itemId, nama: item.nama, oldHpp: item.hargaModal, newHpp: hargaModal }),
            });
        });
        return wo_service_1.woService.findById(woId);
    }
}
exports.WoItemsService = WoItemsService;
exports.woItemsService = new WoItemsService();
//# sourceMappingURL=wo-items.service.js.map