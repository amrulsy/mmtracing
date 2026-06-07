import db from '../../config/db';
import { NotFoundError, BadRequestError } from '../../shared/errors';
import { AddSpkStageInput } from './spk.schema';
import { spkService } from './spk.service';

export class SpkStagesService {
  async addStage(spkId: number, input: AddSpkStageInput, userId?: number) {
    const spk = await db.queryOne<any>('SELECT id, noSpk, status FROM spk WHERE id = ?', [spkId]);
    if (!spk) throw new NotFoundError('SPK');
    if (spk.status === 'selesai' || spk.status === 'dibatalkan') {
      throw new BadRequestError(`Tidak bisa menambah tahap pada SPK yang sudah ${spk.status}`);
    }

    await db.transaction(async (tx) => {
      await tx.insert('spk_stages', {
        spkId, nama: input.nama,
        estimasiBiaya: input.estimasiBiaya ?? 0,
        durasiHari: input.durasiHari ?? 1,
      });

      await spkService.recalcTotalHarga(tx, spkId);
      await spkService.recalcProgress(tx, spkId);

      await tx.insert('activity_logs', {
        userId: userId ?? null, action: 'add_stage', module: 'spk',
        targetId: spkId, targetName: spk.noSpk,
        detail: JSON.stringify(input),
      });
    });

    return spkService.findById(spkId);
  }

  async updateStage(spkId: number, stageId: number, input: { status?: string }, userId?: number) {
    const spk = await db.queryOne<any>('SELECT id, noSpk, status FROM spk WHERE id = ?', [spkId]);
    if (!spk) throw new NotFoundError('SPK');
    if (spk.status === 'selesai' || spk.status === 'dibatalkan') {
      throw new BadRequestError(`Tidak bisa mengedit tahap pada SPK yang sudah ${spk.status}`);
    }

    const stage = await db.queryOne<any>('SELECT * FROM spk_stages WHERE id = ? AND spkId = ?', [stageId, spkId]);
    if (!stage) throw new NotFoundError('Tahap Pekerjaan');

    await db.transaction(async (tx) => {
      if (input.status && input.status !== stage.status) {
        await tx.update('spk_stages', { status: input.status }, 'id = ?', [stageId]);
        await spkService.recalcProgress(tx, spkId);

        await tx.insert('activity_logs', {
          userId: userId ?? null, action: 'update_stage_status', module: 'spk',
          targetId: spkId, targetName: spk.noSpk,
          detail: JSON.stringify({ stageId, nama: stage.nama, oldStatus: stage.status, newStatus: input.status }),
        });
      }
    });

    return spkService.findById(spkId);
  }

  async deleteStage(spkId: number, stageId: number, userId?: number) {
    const spk = await db.queryOne<any>('SELECT id, noSpk, status FROM spk WHERE id = ?', [spkId]);
    if (!spk) throw new NotFoundError('SPK');
    if (spk.status === 'selesai' || spk.status === 'dibatalkan') {
      throw new BadRequestError(`Tidak bisa menghapus tahap pada SPK yang sudah ${spk.status}`);
    }

    const stage = await db.queryOne<any>('SELECT * FROM spk_stages WHERE id = ? AND spkId = ?', [stageId, spkId]);
    if (!stage) throw new NotFoundError('Tahap Pekerjaan');

    await db.transaction(async (tx) => {
      await tx.execute('DELETE FROM spk_stages WHERE id = ?', [stageId]);
      await spkService.recalcTotalHarga(tx, spkId);
      await spkService.recalcProgress(tx, spkId);

      await tx.insert('activity_logs', {
        userId: userId ?? null, action: 'delete_stage', module: 'spk',
        targetId: spkId, targetName: spk.noSpk,
        detail: JSON.stringify({ nama: stage.nama, estimasiBiaya: stage.estimasiBiaya }),
      });
    });

    return spkService.findById(spkId);
  }
}

export const spkStagesService = new SpkStagesService();
