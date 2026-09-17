import db from '../../config/db';
import { NotFoundError, BadRequestError } from '../../shared/errors';
import { AddWoStageInput, UpdateWoStageInput } from './wo.schema';
import { woService } from './wo.service';

export class WoStagesService {
  async addStage(woId: number, input: AddWoStageInput, userId?: number) {
    const spk = await db.queryOne<any>('SELECT id, noWo, status FROM work_orders WHERE id = ?', [woId]);
    if (!spk) throw new NotFoundError('work_orders');
    if (spk.status === 'selesai' || spk.status === 'dibatalkan') {
      throw new BadRequestError(`Tidak bisa menambah tahapan pada Work Order yang sudah ${spk.status}`);
    }

    const maxUrutanRow = await db.queryOne<{ maxU: number }>('SELECT MAX(urutan) AS maxU FROM wo_stages WHERE woId = ?', [woId]);
    const nextUrutan = (maxUrutanRow?.maxU || 0) + 1;

    await db.transaction(async (tx) => {
      await tx.insert('wo_stages', {
        woId, urutan: nextUrutan, nama: input.nama, estimasiBiaya: input.estimasiBiaya, durasiHari: input.durasiHari, status: 'pending',
      });
      await woService.recalcTotalHarga(tx, woId);
      await woService.recalcProgress(tx, woId);

      await tx.insert('activity_logs', {
        userId: userId ?? null, action: 'add_stage', module: 'work_orders',
        targetId: woId, targetName: spk.noWo,
        detail: JSON.stringify({ nama: input.nama, estimasiBiaya: input.estimasiBiaya }),
      });
    });

    return woService.findById(woId);
  }

  async updateStage(woId: number, stageId: number, input: UpdateWoStageInput, userId?: number) {
    const spk = await db.queryOne<any>('SELECT id, noWo, status FROM work_orders WHERE id = ?', [woId]);
    if (!spk) throw new NotFoundError('work_orders');
    if (spk.status === 'selesai' || spk.status === 'dibatalkan') {
      throw new BadRequestError(`Tidak bisa mengedit tahapan pada Work Order yang sudah ${spk.status}`);
    }

    const stage = await db.queryOne<any>('SELECT * FROM wo_stages WHERE id = ? AND woId = ?', [stageId, woId]);
    if (!stage) throw new NotFoundError('Tahapan Work Order');

    await db.transaction(async (tx) => {
      const now = new Date();
      const updates: any = {};
      if (input.status !== undefined) updates.status = input.status;
      if (input.status === 'in_progress' && !stage.startedAt) updates.startedAt = now;
      if (input.status === 'done' && !stage.completedAt) updates.completedAt = now;

      if (Object.keys(updates).length > 0) {
        await tx.update('wo_stages', updates, 'id = ?', [stageId]);
        await woService.recalcProgress(tx, woId);

        await tx.insert('activity_logs', {
          userId: userId ?? null, action: 'update_stage_status', module: 'work_orders',
          targetId: woId, targetName: spk.noWo,
          detail: JSON.stringify({ stageId, nama: stage.nama, oldStatus: stage.status, newStatus: input.status }),
        });
      }
    });

    return woService.findById(woId);
  }

  async removeStage(woId: number, stageId: number, userId?: number) {
    const spk = await db.queryOne<any>('SELECT id, noWo, status FROM work_orders WHERE id = ?', [woId]);
    if (!spk) throw new NotFoundError('work_orders');
    if (spk.status === 'selesai' || spk.status === 'dibatalkan') {
      throw new BadRequestError(`Tidak bisa menghapus tahapan pada Work Order yang sudah ${spk.status}`);
    }

    const stage = await db.queryOne<any>('SELECT * FROM wo_stages WHERE id = ? AND woId = ?', [stageId, woId]);
    if (!stage) throw new NotFoundError('Tahapan Work Order');

    await db.transaction(async (tx) => {
      await tx.execute('DELETE FROM wo_stages WHERE id = ?', [stageId]);
      await woService.recalcTotalHarga(tx, woId);
      await woService.recalcProgress(tx, woId);

      await tx.insert('activity_logs', {
        userId: userId ?? null, action: 'remove_stage', module: 'work_orders',
        targetId: woId, targetName: spk.noWo,
        detail: JSON.stringify({ nama: stage.nama, estimasiBiaya: stage.estimasiBiaya }),
      });
    });

    return woService.findById(woId);
  }
}

export const woStagesService = new WoStagesService();
