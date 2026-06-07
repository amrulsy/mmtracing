import db from '../../config/db';
import { NotFoundError, BadRequestError } from '../../shared/errors';
import { AddSpkItemInput, UpdateSpkItemInput } from './spk.schema';
import { spkService } from './spk.service';

export class SpkItemsService {
  async addItem(spkId: number, input: AddSpkItemInput, userId?: number) {
    const spk = await db.queryOne<any>('SELECT id, noSpk, status FROM spk WHERE id = ?', [spkId]);
    if (!spk) throw new NotFoundError('SPK');
    if (spk.status === 'selesai' || spk.status === 'dibatalkan') {
      throw new BadRequestError(`Tidak bisa menambah item pada SPK yang sudah ${spk.status}`);
    }

    const subtotal = input.hargaSatuan * input.qty;

    await db.transaction(async (tx) => {
      let hpp = 0;
      if (input.type === 'jasa' && input.jasaId) {
        const j = await tx.queryOne<any>('SELECT hargaModal FROM jasa WHERE id = ?', [input.jasaId]);
        hpp = Number(j?.hargaModal || 0);
      }
      if (input.type === 'sparepart' && input.sparepartId) {
        const sp = await tx.queryOne<any>('SELECT name, stok, hargaBeli FROM sparepart WHERE id = ? FOR UPDATE', [input.sparepartId]);
        if (!sp) throw new BadRequestError('Sparepart tidak ditemukan');
        if (sp.stok < input.qty) {
          throw new BadRequestError(`Stok "${sp.name}" tidak mencukupi (tersisa ${sp.stok}, butuh ${input.qty})`);
        }
        hpp = Number(sp.hargaBeli) || 0;
        const r = await tx.execute('UPDATE sparepart SET stok = stok - ? WHERE id = ? AND stok >= ?', [input.qty, input.sparepartId, input.qty]);
        if (r.affectedRows === 0) {
          throw new BadRequestError(`Stok "${sp.name}" tidak mencukupi saat proses simultan`);
        }
        await tx.insert('inventaris_log', {
          sparepartId: input.sparepartId, type: 'keluar', qty: input.qty,
          keterangan: `Tambah item SPK ${spk.noSpk}`,
        });
      }

      let existingItem: any = null;
      if (input.type === 'sparepart' && input.sparepartId) {
        existingItem = await tx.queryOne("SELECT * FROM spk_items WHERE spkId = ? AND type = 'sparepart' AND sparepartId = ? LIMIT 1", [spkId, input.sparepartId]);
      } else if (input.type === 'jasa' && input.jasaId) {
        existingItem = await tx.queryOne("SELECT * FROM spk_items WHERE spkId = ? AND type = 'jasa' AND jasaId = ? LIMIT 1", [spkId, input.jasaId]);
      }

      if (existingItem) {
        const newQty = existingItem.qty + input.qty;
        const newHargaSatuan = existingItem.hargaSatuan;
        const newSubtotal = newQty * Number(newHargaSatuan);
        const oldHpp = Number(existingItem.hargaModal) * existingItem.qty;
        const newHppContrib = hpp * input.qty;
        const weightedHpp = newQty > 0 ? Math.round((oldHpp + newHppContrib) / newQty) : 0;
        await tx.update('spk_items', { qty: newQty, subtotal: newSubtotal, hargaModal: weightedHpp }, 'id = ?', [existingItem.id]);
      } else {
        await tx.insert('spk_items', {
          spkId, type: input.type,
          sparepartId: input.type === 'sparepart' ? (input.sparepartId ?? null) : null,
          jasaId: input.type === 'jasa' ? (input.jasaId ?? null) : null,
          nama: input.nama, qty: input.qty, hargaModal: hpp, hargaSatuan: input.hargaSatuan, subtotal,
        });
      }

      await spkService.recalcTotalHarga(tx, spkId);

      await tx.insert('activity_logs', {
        userId: userId ?? null, action: 'add_item', module: 'spk',
        targetId: spkId, targetName: spk.noSpk,
        detail: JSON.stringify({ nama: input.nama, qty: input.qty, type: input.type, subtotal }),
      });
    });

    return spkService.findById(spkId);
  }

  async removeItem(spkId: number, itemId: number, userId?: number) {
    const spk = await db.queryOne<any>('SELECT id, noSpk, status FROM spk WHERE id = ?', [spkId]);
    if (!spk) throw new NotFoundError('SPK');
    if (spk.status === 'selesai' || spk.status === 'dibatalkan') {
      throw new BadRequestError(`Tidak bisa menghapus item pada SPK yang sudah ${spk.status}`);
    }

    const item = await db.queryOne<any>('SELECT * FROM spk_items WHERE id = ? AND spkId = ?', [itemId, spkId]);
    if (!item) throw new NotFoundError('Item SPK');

    await db.transaction(async (tx) => {
      if (item.type === 'sparepart' && item.sparepartId) {
        const sp = await tx.queryOne('SELECT id FROM sparepart WHERE id = ?', [item.sparepartId]);
        if (sp) {
          await tx.execute('UPDATE sparepart SET stok = stok + ? WHERE id = ?', [item.qty, item.sparepartId]);
          await tx.insert('inventaris_log', {
            sparepartId: item.sparepartId, type: 'masuk', qty: item.qty,
            keterangan: `Item dihapus dari SPK ${spk.noSpk}`,
          });
        }
      }

      await tx.execute('DELETE FROM spk_items WHERE id = ?', [itemId]);
      await spkService.recalcTotalHarga(tx, spkId);
      await spkService.recalcProgress(tx, spkId);

      await tx.insert('activity_logs', {
        userId: userId ?? null, action: 'remove_item', module: 'spk',
        targetId: spkId, targetName: spk.noSpk,
        detail: JSON.stringify({ nama: item.nama, qty: item.qty, subtotal: item.subtotal }),
      });
    });

    return spkService.findById(spkId);
  }

  async updateItem(spkId: number, itemId: number, input: UpdateSpkItemInput, userId?: number) {
    const spk = await db.queryOne<any>('SELECT id, noSpk, status FROM spk WHERE id = ?', [spkId]);
    if (!spk) throw new NotFoundError('SPK');
    if (spk.status === 'selesai' || spk.status === 'dibatalkan') {
      throw new BadRequestError(`Tidak bisa mengedit item pada SPK yang sudah ${spk.status}`);
    }

    const item = await db.queryOne<any>('SELECT * FROM spk_items WHERE id = ? AND spkId = ?', [itemId, spkId]);
    if (!item) throw new NotFoundError('Item SPK');

    await db.transaction(async (tx) => {
      if (input.status !== undefined && input.status !== item.status) {
        await tx.update('spk_items', { status: input.status }, 'id = ?', [itemId]);
        await spkService.recalcProgress(tx, spkId);

        await tx.insert('activity_logs', {
          userId: userId ?? null, action: 'update_item_status', module: 'spk',
          targetId: spkId, targetName: spk.noSpk,
          detail: JSON.stringify({ itemId, nama: item.nama, oldStatus: item.status, newStatus: input.status }),
        });
      }
    });

    return spkService.findById(spkId);
  }

  async updateItemHpp(spkId: number, itemId: number, hargaModal: number, userId?: number) {
    const spk = await db.queryOne<any>('SELECT id, noSpk, status FROM spk WHERE id = ?', [spkId]);
    if (!spk) throw new NotFoundError('SPK');

    const item = await db.queryOne<any>('SELECT * FROM spk_items WHERE id = ? AND spkId = ?', [itemId, spkId]);
    if (!item) throw new NotFoundError('Item SPK');

    await db.transaction(async (tx) => {
      await tx.update('spk_items', { hargaModal }, 'id = ?', [itemId]);
      await tx.insert('activity_logs', {
        userId: userId ?? null, action: 'update_item_hpp', module: 'spk',
        targetId: spkId, targetName: spk.noSpk,
        detail: JSON.stringify({ itemId, nama: item.nama, oldHpp: item.hargaModal, newHpp: hargaModal }),
      });
    });

    return spkService.findById(spkId);
  }
}

export const spkItemsService = new SpkItemsService();
