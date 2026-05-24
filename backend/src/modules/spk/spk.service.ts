import db, { Queryable } from '../../config/db';
import { NotFoundError, BadRequestError } from '../../shared/errors';
import { sseManager } from '../../shared/sse';
import { generateSpkNo, generateInvoiceNo } from '../../shared/utils';
import { releaseGatePass } from '../../shared/gate-pass';
import { getSetting } from '../../shared/settingsCache';
import { CreateSpkInput, UpdateSpkStatusInput, AddSpkItemInput, UpdateSpkItemInput, AddSpkStageInput } from './spk.schema';

/** Hitung minimum DP dinamis berdasarkan mode SPK & pengaturan persentase di Settings.
 * Default fallback: modifikasi 40%, bubut 40%, lainnya 0%. */
async function calcMinimumDp(mode: string, totalHarga: number): Promise<number> {
  if (!['modifikasi', 'bubut'].includes(mode)) return 0;
  const key = mode === 'modifikasi' ? 'dp_modifikasi_persen' : 'dp_bubut_persen';
  const raw = await getSetting(key);
  let pct = 40; // default
  if (raw !== null) {
    const parsed = Number(raw);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) pct = parsed;
  }
  return Math.ceil((totalHarga * pct) / 100);
}

export class SpkService {
  async findAll(query: any) {
    const { status, mode, search, mekanikId, pembayaranStatus, prioritas, dateFrom, dateTo, overdue, includeDeleted, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const conds: string[] = [];
    const params: any[] = [];

    if (includeDeleted !== 'true') conds.push('s.deletedAt IS NULL');
    if (status && status !== 'semua') { conds.push('s.status = ?'); params.push(status); }
    if (mode && mode !== 'semua') { conds.push('s.mode = ?'); params.push(mode); }
    if (prioritas) { conds.push('s.prioritas = ?'); params.push(prioritas); }
    if (mekanikId) { conds.push('s.mekanikId = ?'); params.push(Number(mekanikId)); }
    if (dateFrom) { conds.push('s.createdAt >= ?'); params.push(new Date(dateFrom)); }
    if (dateTo) { const end = new Date(dateTo); end.setHours(23,59,59,999); conds.push('s.createdAt <= ?'); params.push(end); }
    if (overdue === 'true') {
      conds.push("s.estimasiSelesai IS NOT NULL AND s.estimasiSelesai < NOW() AND s.status IN ('antri','dikerjakan','kendala')");
    }
    if (pembayaranStatus) {
      conds.push('EXISTS (SELECT 1 FROM pembayaran pb WHERE pb.spkId = s.id AND pb.status = ?)');
      params.push(pembayaranStatus);
    }
    if (search) {
      conds.push('(s.noSpk LIKE ? OR p.name LIKE ? OR k.name LIKE ? OR k.plat LIKE ?)');
      const like = `%${search}%`; params.push(like, like, like, like);
    }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';

    const [rows, totalRow] = await Promise.all([
      db.query(
        `SELECT s.*, p.id AS pId, p.name AS pName, p.phone AS pPhone,
                k.id AS kId, k.name AS kName, k.plat AS kPlat,
                m.id AS mId, m.name AS mName, m.initial AS mInitial,
                (SELECT COUNT(*) FROM spk_items WHERE spkId = s.id) AS _countItems,
                (SELECT COUNT(*) FROM spk_photos WHERE spkId = s.id) AS _countPhotos
         FROM spk s
         LEFT JOIN pelanggan p ON p.id = s.pelangganId
         LEFT JOIN kendaraan k ON k.id = s.kendaraanId
         LEFT JOIN mekanik m ON m.id = s.mekanikId
         ${where} ORDER BY s.createdAt DESC LIMIT ? OFFSET ?`,
        [...params, Number(limit), skip]),
      db.queryOne<{ c: number }>(
        `SELECT COUNT(*) AS c FROM spk s LEFT JOIN pelanggan p ON p.id = s.pelangganId LEFT JOIN kendaraan k ON k.id = s.kendaraanId ${where}`, params),
    ]);
    const data = rows.map((r: any) => ({
      ...r,
      pelanggan: { id: r.pId, name: r.pName, phone: r.pPhone },
      kendaraan: r.kId ? { id: r.kId, name: r.kName, plat: r.kPlat } : null,
      mekanik: r.mId ? { id: r.mId, name: r.mName, initial: r.mInitial } : null,
      _count: { items: r._countItems, photos: r._countPhotos },
    }));
    return { data, total: totalRow?.c ?? 0, page: Number(page), limit: Number(limit) };
  }

  async findById(id: number) {
    const spk = await db.queryOne<any>('SELECT * FROM spk WHERE id = ?', [id]);
    if (!spk) throw new NotFoundError('SPK');
    const [pelanggan, kendaraan, mekanik, createdBy, items, stages, photos, pembayaranRows, garansi] = await Promise.all([
      db.queryOne('SELECT * FROM pelanggan WHERE id = ?', [spk.pelangganId]),
      spk.kendaraanId ? db.queryOne('SELECT * FROM kendaraan WHERE id = ?', [spk.kendaraanId]) : null,
      spk.mekanikId ? db.queryOne('SELECT * FROM mekanik WHERE id = ?', [spk.mekanikId]) : null,
      spk.createdById ? db.queryOne('SELECT id, name FROM users WHERE id = ?', [spk.createdById]) : null,
      db.query('SELECT i.*, sp.name AS spName, sp.kode AS spKode, j.name AS jName FROM spk_items i LEFT JOIN sparepart sp ON sp.id = i.sparepartId LEFT JOIN jasa j ON j.id = i.jasaId WHERE i.spkId = ?', [id]),
      db.query('SELECT * FROM spk_stages WHERE spkId = ? ORDER BY urutan ASC', [id]),
      db.query('SELECT * FROM spk_photos WHERE spkId = ? ORDER BY createdAt DESC', [id]),
      db.query('SELECT * FROM pembayaran WHERE spkId = ?', [id]),
      db.query('SELECT * FROM garansi WHERE spkId = ?', [id]),
    ]);
    // Attach sparepart/jasa objects on items
    const enrichedItems = items.map((i: any) => ({
      ...i,
      sparepart: i.sparepartId ? { id: i.sparepartId, name: i.spName, kode: i.spKode } : null,
      jasa: i.jasaId ? { id: i.jasaId, name: i.jName } : null,
    }));
    // Fetch pembayaran details
    const pbIds = pembayaranRows.map((p: any) => p.id);
    const pbDetails = pbIds.length ? await db.query('SELECT * FROM pembayaran_detail WHERE pembayaranId IN (?) ORDER BY tanggal DESC', [pbIds]) : [];
    const detMap = new Map<number, any[]>();
    for (const d of pbDetails) { if (!detMap.has(d.pembayaranId)) detMap.set(d.pembayaranId, []); detMap.get(d.pembayaranId)!.push(d); }
    const pembayaran = pembayaranRows.map((p: any) => ({ ...p, detail: detMap.get(p.id) || [] }));
    spk.pelanggan = pelanggan; spk.kendaraan = kendaraan; spk.mekanik = mekanik;
    spk.createdBy = createdBy; spk.items = enrichedItems; spk.stages = stages;
    spk.photos = photos; spk.pembayaran = pembayaran; spk.garansi = garansi;
    return spk;
  }

  async create(input: CreateSpkInput, userId: number) {
    // Hitung total dari items + stages (modifikasi/bubut bisa punya keduanya)
    let totalHarga = 0;
    if (input.items?.length) {
      totalHarga += input.items.reduce((sum, item) => sum + (item.hargaSatuan * item.qty), 0);
    }
    if (input.stages?.length) {
      totalHarga += input.stages.reduce((sum, stage) => sum + stage.estimasiBiaya, 0);
    }

    const minimumDp = await calcMinimumDp(input.mode, totalHarga);

    // ETA: hitung estimasi selesai dari total durasi tahapan
    let estimasiSelesai: Date | null = null;
    if (input.stages?.length) {
      const totalDays = input.stages.reduce((sum, s) => sum + s.durasiHari, 0);
      estimasiSelesai = new Date();
      estimasiSelesai.setDate(estimasiSelesai.getDate() + totalDays);
    }

    // Diskon
    const diskon = input.diskon ?? 0;

    // Semua operasi dalam satu transaksi untuk menjaga data konsisten
    const spk = await db.transaction(async (tx) => {
      const noSpk = generateSpkNo();
      const itemsToCreate: any[] = [];
      const logsToCreate: any[] = [];

      if (input.items?.length) {
        for (const item of input.items) {
          let hpp = 0;
          if (item.type === 'jasa' && item.jasaId) {
            const j = await tx.queryOne<any>('SELECT hargaModal FROM jasa WHERE id = ?', [item.jasaId]);
            hpp = Number(j?.hargaModal || 0);
          }
          if (item.type === 'sparepart' && item.sparepartId) {
            const sp = await tx.queryOne<any>('SELECT stok, name, hargaBeli FROM sparepart WHERE id = ? FOR UPDATE', [item.sparepartId]);
            if (!sp) throw new BadRequestError(`Sparepart ID ${item.sparepartId} tidak ditemukan`);
            if (sp.stok < item.qty) {
              throw new BadRequestError(`Stok "${sp.name}" tidak mencukupi (tersisa ${sp.stok}, butuh ${item.qty})`);
            }
            hpp = Number(sp.hargaBeli) || 0;
            const r = await tx.execute('UPDATE sparepart SET stok = stok - ? WHERE id = ? AND stok >= ?', [item.qty, item.sparepartId, item.qty]);
            if (r.affectedRows === 0) {
              throw new BadRequestError(`Stok "${sp.name}" tidak mencukupi saat proses simultan`);
            }
            logsToCreate.push({ sparepartId: item.sparepartId, type: 'keluar', qty: item.qty, keterangan: `Dipakai SPK ${noSpk}` });
          }
          itemsToCreate.push({
            type: item.type, sparepartId: item.sparepartId || null, jasaId: item.jasaId || null,
            nama: item.nama, qty: item.qty, hargaModal: hpp, hargaSatuan: item.hargaSatuan, subtotal: item.hargaSatuan * item.qty,
          });
        }
      }

      const spkId = await tx.insert('spk', {
        noSpk, pelangganId: input.pelangganId, kendaraanId: input.kendaraanId || null,
        mekanikId: input.mekanikId || null, createdById: userId, mode: input.mode,
        keluhan: input.keluhan, judulProyek: input.judulProyek, spesifikasi: input.spesifikasi,
        totalHarga, minimumDp, diskon, estimasiSelesai, prioritas: input.prioritas || 'normal', catatan: input.catatan,
      });

      for (const it of itemsToCreate) {
        await tx.insert('spk_items', { spkId, ...it });
      }
      if (input.stages?.length) {
        for (let i = 0; i < input.stages.length; i++) {
          const stage = input.stages[i];
          await tx.insert('spk_stages', { spkId, urutan: i + 1, nama: stage.nama, estimasiBiaya: stage.estimasiBiaya, durasiHari: stage.durasiHari });
        }
      }
      for (const log of logsToCreate) {
        await tx.insert('inventaris_log', log);
      }

      await tx.update('pelanggan', { lastVisit: new Date() }, 'id = ?', [input.pelangganId]);

      if (input.kendaraanId && typeof input.odometerMasuk === 'number') {
        await tx.execute('UPDATE kendaraan SET odometer = ? WHERE id = ? AND (odometer IS NULL OR odometer < ?)', [input.odometerMasuk, input.kendaraanId, input.odometerMasuk]);
      }

      const jatuhTempo = new Date();
      jatuhTempo.setDate(jatuhTempo.getDate() + 30);
      await tx.insert('pembayaran', {
        noInvoice: generateInvoiceNo(), spkId, totalTagihan: Math.max(0, totalHarga - diskon),
        sisaBayar: Math.max(0, totalHarga - diskon), jatuhTempo,
      });

      await tx.insert('activity_logs', {
        userId, action: 'create', module: 'spk', targetId: spkId, targetName: noSpk,
        detail: JSON.stringify({ mode: input.mode, totalHarga, pelangganId: input.pelangganId }),
      });

      return spkId;
    });

    return this.findById(spk);
  }

  async updateStatus(id: number, input: UpdateSpkStatusInput, userId?: number) {
    const spk = await db.queryOne<any>('SELECT * FROM spk WHERE id = ?', [id]);
    if (!spk) throw new NotFoundError('SPK');

    // Validasi transisi status yang masuk akal
    const validTransitions: Record<string, string[]> = {
      antri: ['dikerjakan', 'dibatalkan'],
      dikerjakan: ['kendala', 'selesai', 'dibatalkan'],
      kendala: ['dikerjakan', 'dibatalkan'],
      selesai: ['dikerjakan'], // Mengizinkan rollback apabila salah klik selesai
      dibatalkan: [],
    };
    const allowed = validTransitions[spk.status] ?? [];
    if (!allowed.includes(input.status)) {
      throw new BadRequestError(`Tidak bisa mengubah status dari "${spk.status}" ke "${input.status}"`);
    }

    // C1: Tidak bisa dikerjakan tanpa mekanik
    if (input.status === 'dikerjakan' && !spk.mekanikId) {
      throw new BadRequestError('Assign mekanik terlebih dahulu sebelum memulai pengerjaan');
    }

    // C2: Status 'kendala' wajib catatan (audit trail)
    if (input.status === 'kendala' && !input.catatan?.trim()) {
      throw new BadRequestError('Catatan/alasan kendala wajib diisi agar bisa ditelusuri.');
    }

    // DP Hard-Lock: SPK modifikasi/bubut wajib DP minimum sebelum dikerjakan
    if (input.status === 'dikerjakan' && ['modifikasi', 'bubut'].includes(spk.mode)) {
      const minDp = Number(spk.minimumDp);
      const paid = Number(spk.totalBayar);
      if (minDp > 0 && paid < minDp) {
        throw new BadRequestError(
          `SPK ${spk.mode} memerlukan DP minimal Rp ${minDp.toLocaleString('id-ID')} sebelum mulai dikerjakan. Saat ini baru terbayar Rp ${paid.toLocaleString('id-ID')} (kurang Rp ${(minDp - paid).toLocaleString('id-ID')}).`
        );
      }
    }

    await db.transaction(async (tx) => {
      const updateData: any = {
        status: input.status,
        catatan: input.catatan !== undefined ? input.catatan : spk.catatan,
      };

      if (input.progress !== undefined) updateData.progress = input.progress;
      if (input.status === 'dikerjakan' && !spk.startedAt) updateData.startedAt = new Date();
      if (input.status === 'selesai') {
        updateData.completedAt = new Date();
        updateData.progress = 100;
      }

      // Update status mekanik
      if (spk.mekanikId) {
        if (input.status === 'dikerjakan') {
          await tx.update('mekanik', { status: 'busy' }, 'id = ?', [spk.mekanikId]);
        } else if (input.status === 'selesai' || input.status === 'dibatalkan') {
          const activeSpks = await tx.queryVal<number>("SELECT COUNT(*) FROM spk WHERE mekanikId = ? AND status = 'dikerjakan' AND id != ?", [spk.mekanikId, id]);
          if (activeSpks === 0) {
            await tx.update('mekanik', { status: 'available' }, 'id = ?', [spk.mekanikId]);
          }
        }
      }

      // Aksi saat SPK dibatalkan: Kembalikan stok sparepart
      if (spk.status !== 'dibatalkan' && input.status === 'dibatalkan') {
        const paid = await tx.queryOne<any>('SELECT * FROM pembayaran WHERE spkId = ? AND totalBayar > 0 LIMIT 1', [id]);
        if (paid) {
          throw new BadRequestError(
            `SPK tidak dapat dibatalkan karena sudah ada pembayaran masuk (Invoice ${paid.noInvoice}). Lakukan refund di modul Kasir terlebih dahulu.`
          );
        }
        const items = await tx.query("SELECT sparepartId, qty FROM spk_items WHERE spkId = ? AND type = 'sparepart'", [id]);
        for (const item of items) {
          if (item.sparepartId) {
            await tx.execute('UPDATE sparepart SET stok = stok + ? WHERE id = ?', [item.qty, item.sparepartId]);
            await tx.insert('inventaris_log', {
              sparepartId: item.sparepartId, type: 'masuk', qty: item.qty,
              keterangan: `Stok dikembalikan dari pembatalan SPK ${spk.noSpk}`,
            });
          }
        }
      }

      // Aksi Rollback saat SPK dibatalkan kesalahannya (selesai -> dikerjakan)
      if (spk.status === 'selesai' && input.status === 'dikerjakan') {
        const pembayaranAktif = await tx.queryOne<any>('SELECT * FROM pembayaran WHERE spkId = ? LIMIT 1', [id]);
        if (pembayaranAktif && pembayaranAktif.status === 'lunas') {
          throw new BadRequestError('SPK yang tagihannya sudah lunas tidak dapat ditarik kembali/rollback ke dikerjakan. (Silahkan batalkan lunas di Kasir jika perlu).');
        }

        updateData.completedAt = null;

        // NOTE: Pembatalan Garansi dan Penghapusan Poin Loyalty kini ditangani oleh endpoint Pembayaran
        // jika terjadi rollback/refund dana lunas. Rolback SPK hanya mengunci ulang mekanik.

        // 4. Update status & counter mekanik
        if (spk.mekanikId) {
          await tx.execute('UPDATE mekanik SET totalSpk = GREATEST(0, totalSpk - 1), status = ? WHERE id = ?', ['busy', spk.mekanikId]);
        }
      }

      // Aksi saat SPK selesai (Hanya Update Counter Mekanik & Gate Pass jika Lunas bayar di awal)
      if (input.status === 'selesai') {
        const pembayaranAktif = await tx.queryOne<any>('SELECT * FROM pembayaran WHERE spkId = ? LIMIT 1', [id]);
        
        // Gate-pass: Jika ternyata sudah bayar LUNAS sebelumnya, maka rilis Garansi & Point saat 'Selesai' ditekan.
        if (pembayaranAktif && pembayaranAktif.status === 'lunas') {
          await releaseGatePass(tx, id);
        }

        // Update totalSpk mekanik
        if (spk.mekanikId) {
          await tx.execute('UPDATE mekanik SET totalSpk = totalSpk + 1 WHERE id = ?', [spk.mekanikId]);
        }

        // Set reminder servis berikutnya (rutin): +6 bulan atau +5000 km dari odometer saat ini
        if (spk.kendaraanId && spk.mode === 'rutin') {
          const ken = await tx.queryOne<any>('SELECT odometer FROM kendaraan WHERE id = ?', [spk.kendaraanId]);
          const nextDate = new Date();
          nextDate.setMonth(nextDate.getMonth() + 6);
          const nextKm = ken?.odometer ? ken.odometer + 5000 : null;
          const kUpdateData: any = { nextServiceDate: nextDate };
          if (nextKm) kUpdateData.nextServiceKm = nextKm;
          await tx.update('kendaraan', kUpdateData, 'id = ?', [spk.kendaraanId]);
        }
      }

      // Update SPK
      await tx.update('spk', updateData, 'id = ?', [id]);

      // Catat activity log
      await tx.insert('activity_logs', {
        userId: userId ?? null, action: 'update', module: 'spk',
        targetId: id, targetName: spk.noSpk,
        detail: JSON.stringify({ oldStatus: spk.status, newStatus: input.status, progress: input.progress }),
      });
    });

    // Broadcast SSE event
    const eventType = input.status === 'selesai' ? 'spk:selesai' 
      : input.status === 'kendala' ? 'spk:kendala' 
      : 'spk:updated';
    sseManager.broadcast(eventType as any, { spkId: id, noSpk: spk.noSpk, status: input.status });

    // Return data terbaru
    return this.findById(id);
  }

  async updateProgress(id: number, progress: number, userId?: number) {
    const spk = await db.queryOne<any>('SELECT * FROM spk WHERE id = ?', [id]);
    if (!spk) throw new NotFoundError('SPK');
    if (spk.status === 'selesai' || spk.status === 'dibatalkan') {
      throw new BadRequestError('Tidak bisa update progres SPK yang sudah selesai/dibatalkan');
    }

    await db.transaction(async (tx) => {
      await tx.update('spk', { progress }, 'id = ?', [id]);
      await tx.insert('activity_logs', {
        userId: userId ?? null, action: 'update', module: 'spk',
        targetId: id, targetName: spk.noSpk, detail: JSON.stringify({ progress }),
      });
    });

    return this.findById(id);
  }

  async delete(id: number, userId?: number) {
    const spk = await db.queryOne<any>('SELECT * FROM spk WHERE id = ?', [id]);
    if (!spk) throw new NotFoundError('SPK');

    if (spk.status === 'selesai') {
      throw new BadRequestError('SPK yang sudah selesai tidak dapat dihapus');
    }
    const pembayaranRows = await db.query('SELECT id, totalBayar FROM pembayaran WHERE spkId = ?', [id]);
    const hasUangMasuk = pembayaranRows.some((p: any) => Number(p.totalBayar) > 0);
    if (hasUangMasuk) {
      throw new BadRequestError('SPK yang sudah menerima transaksi pembayaran tidak dapat dihapus!');
    }

    await db.transaction(async (tx) => {
      if (spk.status !== 'dibatalkan') {
        const items = await tx.query('SELECT type, sparepartId, qty FROM spk_items WHERE spkId = ?', [id]);
        for (const item of items) {
          if (item.type === 'sparepart' && item.sparepartId) {
            const sp = await tx.queryOne('SELECT id FROM sparepart WHERE id = ?', [item.sparepartId]);
            if (sp) {
              await tx.execute('UPDATE sparepart SET stok = stok + ? WHERE id = ?', [item.qty, item.sparepartId]);
              await tx.insert('inventaris_log', {
                sparepartId: item.sparepartId, type: 'masuk', qty: item.qty,
                keterangan: `Stok dikembalikan dari penghapusan SPK ${spk.noSpk}`,
              });
            }
          }
        }
      }

      await tx.execute('DELETE FROM pembayaran WHERE spkId = ?', [id]);

      await tx.update('spk', {
        deletedAt: new Date(),
        status: spk.status === 'dibatalkan' ? spk.status : 'dibatalkan',
      }, 'id = ?', [id]);

      await tx.insert('activity_logs', {
        userId: userId ?? null, action: 'soft_delete', module: 'spk',
        targetId: id, targetName: spk.noSpk,
        detail: JSON.stringify({ previousStatus: spk.status }),
      });
    });

    return { message: `SPK ${spk.noSpk} berhasil dihapus (soft delete — histori tetap tersimpan)` };
  }

  /** Restore SPK dari soft delete (admin only) */
  async restore(id: number, userId?: number) {
    const spk = await db.queryOne<any>('SELECT * FROM spk WHERE id = ?', [id]);
    if (!spk) throw new NotFoundError('SPK');
    if (!spk.deletedAt) throw new BadRequestError('SPK ini tidak dalam status terhapus');

    await db.transaction(async (tx) => {
      await tx.update('spk', { deletedAt: null }, 'id = ?', [id]);
      await tx.insert('activity_logs', {
        userId: userId ?? null, action: 'restore', module: 'spk',
        targetId: id, targetName: spk.noSpk,
        detail: JSON.stringify({ status: spk.status }),
      });
    });
    return { message: `SPK ${spk.noSpk} berhasil dipulihkan` };
  }

  // ============================================================
  // MANAJEMEN ITEM SPK (Tambah/Hapus/Edit saat dikerjakan)
  // ============================================================

  /** Hitung ulang totalHarga dan minimumDp SPK dari semua items atau stages */
  private async recalcTotalHarga(tx: Queryable, spkId: number): Promise<number> {
    const [itemsRow, stagesRow, spkData] = await Promise.all([
      tx.queryOne<{ t: number }>('SELECT COALESCE(SUM(subtotal),0) AS t FROM spk_items WHERE spkId = ?', [spkId]),
      tx.queryOne<{ t: number }>('SELECT COALESCE(SUM(estimasiBiaya),0) AS t FROM spk_stages WHERE spkId = ?', [spkId]),
      tx.queryOne<any>('SELECT mode, diskon FROM spk WHERE id = ?', [spkId]),
    ]);

    const totalHarga = Number(itemsRow?.t || 0) + Number(stagesRow?.t || 0);
    const minimumDp = await calcMinimumDp(spkData?.mode || '', totalHarga);
    await tx.update('spk', { totalHarga, minimumDp }, 'id = ?', [spkId]);

    // Sinkronisasi otomatis ke Modul Pembayaran
    const pembayaran = await tx.queryOne<any>('SELECT * FROM pembayaran WHERE spkId = ? LIMIT 1', [spkId]);
    if (pembayaran) {
      const diskon = Number(spkData?.diskon ?? 0);
      const totalTagihan = Math.max(0, totalHarga - diskon);
      const sisaBayar = totalTagihan - Number(pembayaran.totalBayar);
      await tx.update('pembayaran', {
        totalTagihan,
        sisaBayar: Math.max(0, sisaBayar),
        status: sisaBayar <= 0 ? 'lunas' : (Number(pembayaran.totalBayar) > 0 ? 'parsial' : 'belum_bayar'),
      }, 'id = ?', [pembayaran.id]);
    }

    return totalHarga;
  }

  /** Hitung ulang progress SPK otomatis dari status checklist */
  private async recalcProgress(tx: Queryable, spkId: number): Promise<number> {
    const spkData = await tx.queryOne<any>('SELECT progress, status FROM spk WHERE id = ?', [spkId]);
    if (!spkData) return 0;

    const [stages, items] = await Promise.all([
      tx.query('SELECT status FROM spk_stages WHERE spkId = ?', [spkId]),
      tx.query('SELECT status FROM spk_items WHERE spkId = ?', [spkId]),
    ]);
    
    let progress = spkData.progress;
    if (stages.length > 0) {
      const doneStages = stages.filter((s: any) => s.status === 'done').length;
      progress = Math.round((doneStages / stages.length) * 100);
    } else if (items.length > 0) {
      const doneItems = items.filter((i: any) => i.status === 'done').length;
      progress = Math.round((doneItems / items.length) * 100);
    }
    
    if (spkData.status !== 'selesai' && spkData.status !== 'dibatalkan') {
      await tx.update('spk', { progress }, 'id = ?', [spkId]);
    }
    return progress;
  }

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

      await this.recalcTotalHarga(tx, spkId);

      await tx.insert('activity_logs', {
        userId: userId ?? null, action: 'add_item', module: 'spk',
        targetId: spkId, targetName: spk.noSpk,
        detail: JSON.stringify({ nama: input.nama, qty: input.qty, type: input.type, subtotal }),
      });
    });

    return this.findById(spkId);
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
      await this.recalcTotalHarga(tx, spkId);

      await tx.insert('activity_logs', {
        userId: userId ?? null, action: 'remove_item', module: 'spk',
        targetId: spkId, targetName: spk.noSpk,
        detail: JSON.stringify({ nama: item.nama, qty: item.qty }),
      });
    });

    return this.findById(spkId);
  }

  async updateItem(spkId: number, itemId: number, input: UpdateSpkItemInput, userId?: number) {
    const spk = await db.queryOne<any>('SELECT id, noSpk, status FROM spk WHERE id = ?', [spkId]);
    if (!spk) throw new NotFoundError('SPK');
    if (spk.status === 'selesai' || spk.status === 'dibatalkan') {
      throw new BadRequestError(`Tidak bisa mengubah item pada SPK yang sudah ${spk.status}`);
    }

    const item = await db.queryOne<any>('SELECT * FROM spk_items WHERE id = ? AND spkId = ?', [itemId, spkId]);
    if (!item) throw new NotFoundError('Item SPK');

    await db.transaction(async (tx) => {
      const newQty = input.qty ?? item.qty;
      const newHarga = input.hargaSatuan ?? Number(item.hargaSatuan);
      const qtyDelta = newQty - item.qty;

      if (item.type === 'sparepart' && item.sparepartId && qtyDelta !== 0) {
        if (qtyDelta > 0) {
          const sp = await tx.queryOne<any>('SELECT name, stok FROM sparepart WHERE id = ? FOR UPDATE', [item.sparepartId]);
          if (!sp || sp.stok < qtyDelta) {
            throw new BadRequestError(`Stok "${sp?.name}" tidak mencukupi (tersisa ${sp?.stok ?? 0}, butuh tambahan ${qtyDelta})`);
          }
          const r = await tx.execute('UPDATE sparepart SET stok = stok - ? WHERE id = ? AND stok >= ?', [qtyDelta, item.sparepartId, qtyDelta]);
          if (r.affectedRows === 0) {
            throw new BadRequestError(`Stok "${sp.name}" tidak mencukupi saat proses simultan`);
          }
          await tx.insert('inventaris_log', { sparepartId: item.sparepartId, type: 'keluar', qty: qtyDelta, keterangan: `Edit item SPK ${spk.noSpk}` });
        } else {
          await tx.execute('UPDATE sparepart SET stok = stok + ? WHERE id = ?', [Math.abs(qtyDelta), item.sparepartId]);
          await tx.insert('inventaris_log', { sparepartId: item.sparepartId, type: 'masuk', qty: Math.abs(qtyDelta), keterangan: `Edit item SPK ${spk.noSpk}` });
        }
      }

      await tx.update('spk_items', { qty: newQty, hargaSatuan: newHarga, subtotal: newQty * newHarga, status: input.status ?? item.status }, 'id = ?', [itemId]);

      await this.recalcTotalHarga(tx, spkId);
      if (input.status) await this.recalcProgress(tx, spkId);

      await tx.insert('activity_logs', {
        userId: userId ?? null, action: 'update_item', module: 'spk',
        targetId: spkId, targetName: spk.noSpk,
        detail: JSON.stringify({ nama: item.nama, oldQty: item.qty, newQty }),
      });
    });

    return this.findById(spkId);
  }

  async updateStage(spkId: number, stageId: number, input: { status?: 'pending' | 'in_progress' | 'done' }, userId?: number) {
    const spk = await db.queryOne<any>('SELECT id, noSpk, status FROM spk WHERE id = ?', [spkId]);
    if (!spk) throw new NotFoundError('SPK');
    if (spk.status === 'selesai' || spk.status === 'dibatalkan') {
      throw new BadRequestError(`Tidak bisa mengubah tahapan pada SPK yang sudah ${spk.status}`);
    }

    const stage = await db.queryOne<any>('SELECT * FROM spk_stages WHERE id = ? AND spkId = ?', [stageId, spkId]);
    if (!stage) throw new NotFoundError('Tahapan SPK');

    await db.transaction(async (tx) => {
      await tx.update('spk_stages', { status: input.status ?? stage.status }, 'id = ?', [stageId]);
      await this.recalcProgress(tx, spkId);

      await tx.insert('activity_logs', {
        userId: userId ?? null, action: 'update_stage', module: 'spk',
        targetId: spkId, targetName: spk.noSpk,
        detail: JSON.stringify({ nama: stage.nama, newStatus: input.status }),
      });
    });

    return this.findById(spkId);
  }

  async addStage(spkId: number, input: AddSpkStageInput, userId?: number) {
    const spk = await db.queryOne<any>('SELECT id, noSpk, status FROM spk WHERE id = ?', [spkId]);
    if (!spk) throw new NotFoundError('SPK');
    if (spk.status === 'selesai' || spk.status === 'dibatalkan') {
      throw new BadRequestError(`Tidak bisa menambah tahapan pada SPK yang sudah ${spk.status}`);
    }

    await db.transaction(async (tx) => {
      const lastStage = await tx.queryOne<any>('SELECT urutan FROM spk_stages WHERE spkId = ? ORDER BY urutan DESC LIMIT 1', [spkId]);
      const nextUrutan = (lastStage?.urutan ?? 0) + 1;

      await tx.insert('spk_stages', {
        spkId, urutan: nextUrutan, nama: input.nama,
        estimasiBiaya: input.estimasiBiaya, durasiHari: input.durasiHari, status: 'pending',
      });

      await this.recalcTotalHarga(tx, spkId);

      await tx.insert('activity_logs', {
        userId: userId ?? null, action: 'add_stage', module: 'spk',
        targetId: spkId, targetName: spk.noSpk,
        detail: JSON.stringify({ nama: input.nama, urutan: nextUrutan, estimasiBiaya: input.estimasiBiaya }),
      });
    });

    return this.findById(spkId);
  }

  // ── Tambah foto/gambar SPK (referensi/progress/lampiran) ──────
  async addPhoto(spkId: number, input: { url: string; caption?: string; type?: string }) {
    const spk = await db.queryOne<any>('SELECT id, status FROM spk WHERE id = ?', [spkId]);
    if (!spk) throw new NotFoundError('SPK');
    if (spk.status === 'dibatalkan') throw new BadRequestError('Tidak bisa upload foto pada SPK yang sudah dibatalkan');
    const photoId = await db.insert('spk_photos', {
      spkId, url: input.url, caption: input.caption || null, type: input.type || 'lampiran',
    });
    return db.queryOne('SELECT * FROM spk_photos WHERE id = ?', [photoId]);
  }

  // ── Stats ringkas untuk widget header list ────────────────────
  async stats() {
    const [antri, dikerjakan, kendala, overdue, pendingPayment] = await Promise.all([
      db.queryVal<number>("SELECT COUNT(*) FROM spk WHERE status = 'antri' AND deletedAt IS NULL"),
      db.queryVal<number>("SELECT COUNT(*) FROM spk WHERE status = 'dikerjakan' AND deletedAt IS NULL"),
      db.queryVal<number>("SELECT COUNT(*) FROM spk WHERE status = 'kendala' AND deletedAt IS NULL"),
      db.queryVal<number>("SELECT COUNT(*) FROM spk WHERE estimasiSelesai IS NOT NULL AND estimasiSelesai < NOW() AND status IN ('antri','dikerjakan','kendala') AND deletedAt IS NULL"),
      db.queryVal<number>("SELECT COUNT(*) FROM pembayaran WHERE status IN ('belum','parsial')"),
    ]);
    return { antri, dikerjakan, kendala, overdue, pendingPayment };
  }

  // ── Analytics: breakdown per mode + top sparepart + performa mekanik ──
  async analytics(query: { dateFrom?: string; dateTo?: string }) {
    const dateConds: string[] = [];
    const dateParams: any[] = [];
    if (query.dateFrom) { dateConds.push('s.createdAt >= ?'); dateParams.push(new Date(query.dateFrom)); }
    if (query.dateTo) { const end = new Date(query.dateTo); end.setHours(23,59,59,999); dateConds.push('s.createdAt <= ?'); dateParams.push(end); }
    const dateWhere = dateConds.length ? ' AND ' + dateConds.join(' AND ') : '';

    // 1. Breakdown per mode (count + omzet)
    const modeBreakdown = await db.query(
      `SELECT mode, status, COUNT(*) AS cnt, COALESCE(SUM(totalHarga),0) AS sumHarga, COALESCE(SUM(totalBayar),0) AS sumBayar
       FROM spk s WHERE s.deletedAt IS NULL ${dateWhere} GROUP BY mode, status`, dateParams);

    // 2. Total omzet per mode
    const omzetPerMode: Record<string, { count: number; omzet: number; outstanding: number }> = {
      rutin: { count: 0, omzet: 0, outstanding: 0 },
      modifikasi: { count: 0, omzet: 0, outstanding: 0 },
      bubut: { count: 0, omzet: 0, outstanding: 0 },
    };
    for (const row of modeBreakdown) {
      const m = row.mode as string;
      if (!omzetPerMode[m]) omzetPerMode[m] = { count: 0, omzet: 0, outstanding: 0 };
      omzetPerMode[m].count += Number(row.cnt);
      if (row.status === 'selesai') {
        omzetPerMode[m].omzet += Number(row.sumHarga);
      } else if (['antri', 'dikerjakan', 'kendala'].includes(row.status)) {
        omzetPerMode[m].outstanding += Math.max(0, Number(row.sumHarga) - Number(row.sumBayar));
      }
    }

    // 3. Top 10 sparepart paling sering dipakai
    const topSparepart = await db.query(
      `SELECT i.sparepartId, i.nama, SUM(i.qty) AS totalQty, SUM(i.subtotal) AS totalRevenue
       FROM spk_items i JOIN spk s ON s.id = i.spkId
       WHERE i.type = 'sparepart' AND i.sparepartId IS NOT NULL AND s.status != 'dibatalkan' AND s.deletedAt IS NULL ${dateWhere.replace(/s\./g, 's.')}
       GROUP BY i.sparepartId, i.nama ORDER BY totalQty DESC LIMIT 10`, dateParams);

    // 4. Performa mekanik (top 10 berdasarkan SPK selesai)
    const mekanikPerf = await db.query(
      `SELECT s.mekanikId, COUNT(*) AS spkSelesai, SUM(s.totalHarga) AS totalRevenue
       FROM spk s WHERE s.status = 'selesai' AND s.mekanikId IS NOT NULL AND s.deletedAt IS NULL ${dateWhere}
       GROUP BY s.mekanikId ORDER BY spkSelesai DESC LIMIT 10`, dateParams);
    const mekanikIds = mekanikPerf.map((r: any) => r.mekanikId);
    const mekanikList = mekanikIds.length > 0 ? await db.query('SELECT id, name, initial FROM mekanik WHERE id IN (?)', [mekanikIds]) : [];
    const mekanikMap: Record<number, any> = {};
    for (const m of mekanikList) mekanikMap[m.id] = m;
    const performa = mekanikPerf.map((r: any) => ({
      mekanikId: r.mekanikId,
      nama: mekanikMap[r.mekanikId]?.name ?? '—',
      initial: mekanikMap[r.mekanikId]?.initial ?? '',
      spkSelesai: Number(r.spkSelesai),
      totalRevenue: Number(r.totalRevenue),
    }));

    // 5. Trend bulanan (12 bulan terakhir)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);
    const trendRows = await db.query(
      `SELECT DATE_FORMAT(createdAt, '%Y-%m-01') AS month, COUNT(*) AS total,
              COALESCE(SUM(CASE WHEN status = 'selesai' THEN totalHarga ELSE 0 END), 0) AS revenue
       FROM spk WHERE createdAt >= ? AND deletedAt IS NULL
       GROUP BY DATE_FORMAT(createdAt, '%Y-%m-01') ORDER BY month ASC`, [twelveMonthsAgo]);
    const trend = trendRows.map((r: any) => ({
      month: typeof r.month === 'string' ? r.month : new Date(r.month).toISOString().slice(0, 10),
      total: Number(r.total),
      revenue: Number(r.revenue),
    }));

    return { omzetPerMode, topSparepart, performa, trend };
  }

  // ── Edit SPK: field non-finansial ─────────────────────────────
  async update(id: number, input: Partial<{ keluhan: string; judulProyek: string; spesifikasi: string; prioritas: string; catatan: string; mekanikId: number | null; estimasiSelesai: string | null }>, userId?: number) {
    const spk = await db.queryOne<any>('SELECT * FROM spk WHERE id = ?', [id]);
    if (!spk) throw new NotFoundError('SPK');
    if (spk.status === 'selesai' || spk.status === 'dibatalkan') {
      throw new BadRequestError(`Tidak bisa mengedit SPK yang sudah ${spk.status}`);
    }

    const data: any = {};
    if (input.keluhan !== undefined) data.keluhan = input.keluhan;
    if (input.judulProyek !== undefined) data.judulProyek = input.judulProyek;
    if (input.spesifikasi !== undefined) data.spesifikasi = input.spesifikasi;
    if (input.prioritas !== undefined) data.prioritas = input.prioritas;
    if (input.catatan !== undefined) data.catatan = input.catatan;
    if (input.mekanikId !== undefined) data.mekanikId = input.mekanikId;
    if (input.estimasiSelesai !== undefined) {
      data.estimasiSelesai = input.estimasiSelesai ? new Date(input.estimasiSelesai) : null;
    }

    await db.update('spk', data, 'id = ?', [id]);

    await db.insert('activity_logs', {
      userId: userId ?? null, action: 'update', module: 'spk',
      targetId: id, targetName: spk.noSpk,
      detail: JSON.stringify({ fields: Object.keys(data) }),
    });

    return this.findById(id);
  }

  // ── Assign / Ganti Mekanik ────────────────────────────────────
  async assignMekanik(id: number, mekanikId: number | null, userId?: number) {
    const spk = await db.queryOne<any>('SELECT * FROM spk WHERE id = ?', [id]);
    if (!spk) throw new NotFoundError('SPK');
    if (spk.status === 'selesai' || spk.status === 'dibatalkan') {
      throw new BadRequestError(`Tidak bisa mengubah mekanik pada SPK yang sudah ${spk.status}`);
    }
    if (mekanikId) {
      const m = await db.queryOne('SELECT id FROM mekanik WHERE id = ?', [mekanikId]);
      if (!m) throw new NotFoundError('Mekanik');
    }

    await db.transaction(async (tx) => {
      if (spk.mekanikId && spk.mekanikId !== mekanikId && spk.status === 'dikerjakan') {
        const activeSpks = await tx.queryVal<number>("SELECT COUNT(*) FROM spk WHERE mekanikId = ? AND status = 'dikerjakan' AND id != ?", [spk.mekanikId, id]);
        if (activeSpks === 0) {
          await tx.update('mekanik', { status: 'available' }, 'id = ?', [spk.mekanikId]);
        }
      }
      if (mekanikId && spk.status === 'dikerjakan') {
        await tx.update('mekanik', { status: 'busy' }, 'id = ?', [mekanikId]);
      }
      await tx.update('spk', { mekanikId }, 'id = ?', [id]);
    });

    await db.insert('activity_logs', {
      userId: userId ?? null, action: 'assign_mekanik', module: 'spk',
      targetId: id, targetName: spk.noSpk,
      detail: JSON.stringify({ from: spk.mekanikId, to: mekanikId }),
    });

    return this.findById(id);
  }
}

export const spkService = new SpkService();
