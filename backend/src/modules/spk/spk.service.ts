import prisma from '../../config/database';
import { NotFoundError, BadRequestError } from '../../shared/errors';
import { sseManager } from '../../shared/sse';
import { generateSpkNo, generateInvoiceNo } from '../../shared/utils';
import { releaseGatePass } from '../../shared/gate-pass';
import { CreateSpkInput, UpdateSpkStatusInput, AddSpkItemInput, UpdateSpkItemInput, AddSpkStageInput } from './spk.schema';

export class SpkService {
  async findAll(query: any) {
    const { status, mode, search, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};

    if (status && status !== 'semua') where.status = status;
    if (mode) where.mode = mode;
    if (search) {
      where.OR = [
        { noSpk: { contains: search } },
        { pelanggan: { name: { contains: search } } },
        { kendaraan: { name: { contains: search } } },
        { kendaraan: { plat: { contains: search } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.spk.findMany({
        where, skip, take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          pelanggan: { select: { id: true, name: true, phone: true } },
          kendaraan: { select: { id: true, name: true, plat: true } },
          mekanik: { select: { id: true, name: true, initial: true } },
          _count: { select: { items: true, photos: true } },
        },
      }),
      prisma.spk.count({ where }),
    ]);

    return { data, total, page: Number(page), limit: Number(limit) };
  }

  async findById(id: number) {
    const spk = await prisma.spk.findUnique({
      where: { id },
      include: {
        pelanggan: true,
        kendaraan: true,
        mekanik: true,
        createdBy: { select: { id: true, name: true } },
        items: { include: { sparepart: true, jasa: true } },
        stages: { orderBy: { urutan: 'asc' } },
        photos: { orderBy: { createdAt: 'desc' } },
        pembayaran: { include: { detail: true } },
        garansi: true,
      },
    });
    if (!spk) throw new NotFoundError('SPK');
    return spk;
  }

  async create(input: CreateSpkInput, userId: number) {
    // Hitung total dari items/stages
    let totalHarga = 0;
    if (input.items?.length) {
      totalHarga = input.items.reduce((sum, item) => sum + (item.hargaSatuan * item.qty), 0);
    } else if (input.stages?.length) {
      totalHarga = input.stages.reduce((sum, stage) => sum + stage.estimasiBiaya, 0);
    }

    const minimumDp = ['modifikasi', 'bubut'].includes(input.mode) ? Math.ceil(totalHarga * 0.4) : 0;

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
    const spk = await prisma.$transaction(async (tx) => {
      // Generate nomor SPK di dalam transaksi agar race-condition safe
      const lastSpk = await tx.spk.findFirst({
        orderBy: { id: 'desc' },
        select: { id: true },
      });
      const counter = lastSpk ? lastSpk.id + 1 : 1;
      const noSpk = generateSpkNo(counter);

      // Buat SPK utama
      const created = await tx.spk.create({
        data: {
          noSpk,
          pelangganId: input.pelangganId,
          kendaraanId: input.kendaraanId || null,
          mekanikId: input.mekanikId || null,
          createdById: userId,
          mode: input.mode,
          keluhan: input.keluhan,
          judulProyek: input.judulProyek,
          spesifikasi: input.spesifikasi,
          totalHarga,
          minimumDp,
          diskon,
          estimasiSelesai,
          prioritas: input.prioritas || 'normal',
          catatan: input.catatan,
          items: input.items?.length ? {
            create: input.items.map(item => ({
              type: item.type,
              sparepartId: item.sparepartId || null,
              jasaId: item.jasaId || null,
              nama: item.nama,
              qty: item.qty,
              hargaSatuan: item.hargaSatuan,
              subtotal: item.hargaSatuan * item.qty,
            })),
          } : undefined,
          stages: input.stages?.length ? {
            create: input.stages.map((stage, i) => ({
              urutan: i + 1,
              nama: stage.nama,
              estimasiBiaya: stage.estimasiBiaya,
              durasiHari: stage.durasiHari,
            })),
          } : undefined,
        },
        include: {
          pelanggan: true,
          kendaraan: true,
          mekanik: true,
          items: true,
          stages: true,
        },
      });

      // Kurangi stok dan catat log inventaris untuk setiap sparepart
      if (input.items?.length) {
        for (const item of input.items) {
          if (item.type === 'sparepart' && item.sparepartId) {
            // Cek stok dulu sebelum dikurangi
            const sp = await tx.sparepart.findUnique({
              where: { id: item.sparepartId },
              select: { stok: true, name: true },
            });
            if (!sp) throw new BadRequestError(`Sparepart ID ${item.sparepartId} tidak ditemukan`);
            if (sp.stok < item.qty) {
              throw new BadRequestError(`Stok "${sp.name}" tidak mencukupi (tersisa ${sp.stok}, butuh ${item.qty})`);
            }

            const updated = await tx.sparepart.updateMany({
              where: { id: item.sparepartId, stok: { gte: item.qty } },
              data: { stok: { decrement: item.qty } },
            });
            if (updated.count === 0) {
              throw new BadRequestError(`Stok "${sp.name}" tidak mencukupi saat proses simultan (tersisa ${sp.stok}, butuh ${item.qty})`);
            }
            await tx.inventarisLog.create({
              data: {
                sparepartId: item.sparepartId,
                type: 'keluar',
                qty: item.qty,
                keterangan: `Dipakai SPK ${noSpk}`,
              },
            });
          }
        }
      }

      // Update pelanggan lastVisit
      await tx.pelanggan.update({
        where: { id: input.pelangganId },
        data: { lastVisit: new Date() },
      });

      // Generate Invoice & Pembayaran otomatis
      const jatuhTempo = new Date();
      jatuhTempo.setDate(jatuhTempo.getDate() + 30); // Jatuh tempo 30 hari
      await tx.pembayaran.create({
        data: {
          noInvoice: generateInvoiceNo(),
          spkId: created.id,
          totalTagihan: totalHarga - diskon,
          sisaBayar: totalHarga - diskon,
          jatuhTempo,
        },
      });

      // Catat activity log
      await tx.activityLog.create({
        data: {
          userId,
          action: 'create',
          module: 'spk',
          targetId: created.id,
          targetName: noSpk,
          detail: JSON.stringify({ mode: input.mode, totalHarga, pelangganId: input.pelangganId }),
        },
      });

      return created;
    });

    return spk;
  }

  async updateStatus(id: number, input: UpdateSpkStatusInput, userId?: number) {
    const spk = await prisma.spk.findUnique({ where: { id } });
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

    await prisma.$transaction(async (tx) => {
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
      
      // DP Hard-Lock
      if (input.status === 'dikerjakan' && ['modifikasi', 'bubut'].includes(spk.mode)) {
        if (spk.totalBayar.toNumber() < spk.minimumDp.toNumber() && spk.minimumDp.toNumber() > 0) {
          throw new BadRequestError(`SPK ${spk.mode} memerlukan cicilan awal/DP minimal sebesar Rp ${spk.minimumDp.toNumber().toLocaleString('id-ID')} sebelum mulai dikerjakan`);
        }
      }

      // Update status mekanik
      if (spk.mekanikId) {
        if (input.status === 'dikerjakan') {
          await tx.mekanik.update({ where: { id: spk.mekanikId }, data: { status: 'busy' } });
        } else if (input.status === 'selesai' || input.status === 'dibatalkan') {
          const activeSpks = await tx.spk.count({
            where: { mekanikId: spk.mekanikId, status: 'dikerjakan', id: { not: id } },
          });
          if (activeSpks === 0) {
            await tx.mekanik.update({ where: { id: spk.mekanikId }, data: { status: 'available' } });
          }
        }
      }

      // Aksi saat SPK dibatalkan: Kembalikan stok sparepart
      if (spk.status !== 'dibatalkan' && input.status === 'dibatalkan') {
        const items = await tx.spkItem.findMany({
          where: { spkId: id, type: 'sparepart' },
          select: { sparepartId: true, qty: true },
        });
        for (const item of items) {
          if (item.sparepartId) {
            const sp = await tx.sparepart.findUnique({ where: { id: item.sparepartId } });
            if (sp) {
              await tx.sparepart.update({
                where: { id: item.sparepartId },
                data: { stok: { increment: item.qty } },
              });
            }
            await tx.inventarisLog.create({
              data: {
                sparepartId: item.sparepartId,
                type: 'masuk',
                qty: item.qty,
                keterangan: `Stok dikembalikan dari pembatalan SPK ${spk.noSpk}${!sp ? ' (Master data tidak ada)' : ''}`,
              },
            });
          }
        }
      }

      // Aksi Rollback saat SPK dibatalkan kesalahannya (selesai -> dikerjakan)
      if (spk.status === 'selesai' && input.status === 'dikerjakan') {
        // Cek jika SPK sudah lunas, tidak boleh dirubah!
        const pembayaranAktif = await tx.pembayaran.findFirst({ where: { spkId: id } });
        if (pembayaranAktif && pembayaranAktif.status === 'lunas') {
          throw new BadRequestError('SPK yang tagihannya sudah lunas tidak dapat ditarik kembali/rollback ke dikerjakan. (Silahkan batalkan lunas di Kasir jika perlu).');
        }

        updateData.completedAt = null;

        // NOTE: Pembatalan Garansi dan Penghapusan Poin Loyalty kini ditangani oleh endpoint Pembayaran
        // jika terjadi rollback/refund dana lunas. Rolback SPK hanya mengunci ulang mekanik.

        // 4. Update status & counter mekanik
        if (spk.mekanikId) {
          await tx.mekanik.update({
            where: { id: spk.mekanikId },
            data: { totalSpk: { decrement: 1 }, status: 'busy' },
          });
        }
      }

      // Aksi saat SPK selesai (Hanya Update Counter Mekanik & Gate Pass jika Lunas bayar di awal)
      if (input.status === 'selesai') {
        const pembayaranAktif = await tx.pembayaran.findFirst({ where: { spkId: id } });
        
        // Gate-pass: Jika ternyata sudah bayar LUNAS sebelumnya, maka rilis Garansi & Point saat 'Selesai' ditekan.
        if (pembayaranAktif && pembayaranAktif.status === 'lunas') {
          await releaseGatePass(tx, id);
        }

        // Update totalSpk mekanik
        if (spk.mekanikId) {
          await tx.mekanik.update({
            where: { id: spk.mekanikId },
            data: { totalSpk: { increment: 1 } },
          });
        }
      }

      // Update SPK
      await tx.spk.update({ where: { id }, data: updateData });

      // Catat activity log
      await tx.activityLog.create({
        data: {
          userId: userId ?? null,
          action: 'update',
          module: 'spk',
          targetId: id,
          targetName: spk.noSpk,
          detail: JSON.stringify({ oldStatus: spk.status, newStatus: input.status, progress: input.progress }),
        },
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
    const spk = await prisma.spk.findUnique({ where: { id } });
    if (!spk) throw new NotFoundError('SPK');
    if (spk.status === 'selesai' || spk.status === 'dibatalkan') {
      throw new BadRequestError('Tidak bisa update progres SPK yang sudah selesai/dibatalkan');
    }

    await prisma.$transaction([
      prisma.spk.update({ where: { id }, data: { progress } }),
      prisma.activityLog.create({
        data: {
          userId: userId ?? null,
          action: 'update',
          module: 'spk',
          targetId: id,
          targetName: spk.noSpk,
          detail: JSON.stringify({ progress }),
        },
      }),
    ]);

    return this.findById(id);
  }

  async delete(id: number, userId?: number) {
    const spk = await prisma.spk.findUnique({
      where: { id },
      include: { pembayaran: { select: { id: true, totalBayar: true } } },
    });
    if (!spk) throw new NotFoundError('SPK');

    // Validasi: SPK selesai tidak boleh dihapus
    if (spk.status === 'selesai') {
      throw new BadRequestError('SPK yang sudah selesai tidak dapat dihapus');
    }
    // Validasi: Dana sudah masuk (belum bisa dihapus untuk histori keuangan)
    const hasUangMasuk = spk.pembayaran.some(p => p.totalBayar.toNumber() > 0);
    if (hasUangMasuk) {
      throw new BadRequestError('SPK yang sudah menerima transaksi pembayaran tidak dapat dihapus!');
    }

    await prisma.$transaction(async (tx) => {
      // Kembalikan stok sparepart yang pernah dipakai
      const items = await tx.spkItem.findMany({
        where: { spkId: id },
        select: { type: true, sparepartId: true, qty: true },
      });
      for (const item of items) {
        if (item.type === 'sparepart' && item.sparepartId) {
          const sp = await tx.sparepart.findUnique({ where: { id: item.sparepartId } });
          if (sp) {
            await tx.sparepart.update({
              where: { id: item.sparepartId },
              data: { stok: { increment: item.qty } },
            });
          }
          await tx.inventarisLog.create({
            data: {
              sparepartId: item.sparepartId,
              type: 'masuk',
              qty: item.qty,
              keterangan: `Stok dikembalikan dari pembatalan SPK ${spk.noSpk}${!sp ? ' (Master data tidak ada)' : ''}`,
            },
          });
        }
      }

      // Hapus invoice kosong milik SPK tersebut
      await tx.pembayaran.deleteMany({ where: { spkId: id } });

      await tx.spk.delete({ where: { id } });

      await tx.activityLog.create({
        data: {
          userId: userId ?? null,
          action: 'delete',
          module: 'spk',
          targetId: id,
          targetName: spk.noSpk,
          detail: JSON.stringify({ status: spk.status }),
        },
      });
    });

    return { message: `SPK ${spk.noSpk} berhasil dihapus` };
  }

  // ============================================================
  // MANAJEMEN ITEM SPK (Tambah/Hapus/Edit saat dikerjakan)
  // ============================================================

  /** Hitung ulang totalHarga dan minimumDp SPK dari semua items atau stages */
  private async recalcTotalHarga(tx: any, spkId: number): Promise<number> {
    const [items, stages, spkData] = await Promise.all([
      tx.spkItem.findMany({ where: { spkId }, select: { subtotal: true } }),
      tx.spkStage.findMany({ where: { spkId }, select: { estimasiBiaya: true } }),
      tx.spk.findUnique({ where: { id: spkId }, select: { mode: true } }),
    ]);

    let totalHarga = 0;
    if (items.length > 0) {
      totalHarga = items.reduce((s: number, i: any) => s + Number(i.subtotal), 0);
    } else if (stages.length > 0) {
      totalHarga = stages.reduce((s: number, st: any) => s + Number(st.estimasiBiaya), 0);
    }

    const minimumDp = ['modifikasi', 'bubut'].includes(spkData?.mode || '') ? Math.ceil(totalHarga * 0.4) : 0;
    await tx.spk.update({ where: { id: spkId }, data: { totalHarga, minimumDp } });

    // Sinkronisasi otomatis ke Modul Pembayaran jika harganya melambung/susut di tengah jalan
    const pembayaran = await tx.pembayaran.findFirst({ where: { spkId } });
    if (pembayaran) {
      const sisaBayar = totalHarga - Number(pembayaran.totalBayar);
      await tx.pembayaran.update({
        where: { id: pembayaran.id },
        data: { 
          totalTagihan: totalHarga, 
          sisaBayar: Math.max(0, sisaBayar),
          status: sisaBayar <= 0 ? 'lunas' : (Number(pembayaran.totalBayar) > 0 ? 'parsial' : 'belum_bayar')
        }
      });
    }

    return totalHarga;
  }

  /** Hitung ulang progress SPK otomatis dari status checklist */
  private async recalcProgress(tx: any, spkId: number): Promise<number> {
    const spkData = await tx.spk.findUnique({
      where: { id: spkId },
      include: { items: true, stages: true },
    });
    if (!spkData) return 0;
    
    let progress = spkData.progress;
    if (spkData.stages.length > 0) {
      const doneStages = spkData.stages.filter((s: any) => s.status === 'done').length;
      progress = Math.round((doneStages / spkData.stages.length) * 100);
    } else if (spkData.items.length > 0) {
      const doneItems = spkData.items.filter((i: any) => i.status === 'done').length;
      progress = Math.round((doneItems / spkData.items.length) * 100);
    }
    
    // Jangan overwrite progress 100 jika SPK sudah ditandai selesai (meski mungkin checklist tidak dicentang semua)
    // Kecuali progresnya normal dari pengerjaan
    if (spkData.status !== 'selesai' && spkData.status !== 'dibatalkan') {
      await tx.spk.update({ where: { id: spkId }, data: { progress } });
    }
    return progress;
  }

  async addItem(spkId: number, input: AddSpkItemInput, userId?: number) {
    const spk = await prisma.spk.findUnique({
      where: { id: spkId },
      select: { id: true, noSpk: true, status: true },
    });
    if (!spk) throw new NotFoundError('SPK');
    if (spk.status === 'selesai' || spk.status === 'dibatalkan') {
      throw new BadRequestError(`Tidak bisa menambah item pada SPK yang sudah ${spk.status}`);
    }

    const subtotal = input.hargaSatuan * input.qty;

    await prisma.$transaction(async (tx) => {
      // Cek dan kurangi stok untuk sparepart
      if (input.type === 'sparepart' && input.sparepartId) {
        const sp = await tx.sparepart.findUnique({
          where: { id: input.sparepartId },
          select: { name: true, stok: true },
        });
        if (!sp) throw new BadRequestError('Sparepart tidak ditemukan');
        if (sp.stok < input.qty) {
          throw new BadRequestError(
            `Stok "${sp.name}" tidak mencukupi (tersisa ${sp.stok}, butuh ${input.qty})`
          );
        }
        const updated = await tx.sparepart.updateMany({
          where: { id: input.sparepartId, stok: { gte: input.qty } },
          data: { stok: { decrement: input.qty } },
        });
        if (updated.count === 0) {
          throw new BadRequestError(`Stok "${sp.name}" tidak mencukupi saat proses simultan (tersisa ${sp.stok}, butuh ${input.qty})`);
        }
        await tx.inventarisLog.create({
          data: {
            sparepartId: input.sparepartId,
            type: 'keluar',
            qty: input.qty,
            keterangan: `Tambah item SPK ${spk.noSpk}`,
          },
        });
      }

      let existingItem = null;
      if (input.type === 'sparepart' && input.sparepartId) {
        existingItem = await tx.spkItem.findFirst({ where: { spkId, type: 'sparepart', sparepartId: input.sparepartId } });
      } else if (input.type === 'jasa' && input.jasaId) {
        existingItem = await tx.spkItem.findFirst({ where: { spkId, type: 'jasa', jasaId: input.jasaId } });
      }

      if (existingItem) {
        const newQty = existingItem.qty + input.qty;
        const newHargaSatuan = existingItem.hargaSatuan; // Gunakan harga existing untuk cegah efek retroaktif (BUG-02)
        const newSubtotal = newQty * Number(newHargaSatuan);
        
        await tx.spkItem.update({
          where: { id: existingItem.id },
          data: { qty: newQty, subtotal: newSubtotal }
        });
      } else {
        await tx.spkItem.create({
          data: {
            spkId,
            type: input.type,
            sparepartId: input.type === 'sparepart' ? (input.sparepartId ?? null) : null,
            jasaId: input.type === 'jasa' ? (input.jasaId ?? null) : null,
            nama: input.nama,
            qty: input.qty,
            hargaSatuan: input.hargaSatuan,
            subtotal,
          },
        });
      }

      await this.recalcTotalHarga(tx, spkId);

      await tx.activityLog.create({
        data: {
          userId: userId ?? null,
          action: 'add_item',
          module: 'spk',
          targetId: spkId,
          targetName: spk.noSpk,
          detail: JSON.stringify({ nama: input.nama, qty: input.qty, type: input.type, subtotal }),
        },
      });
    });

    return this.findById(spkId);
  }

  async removeItem(spkId: number, itemId: number, userId?: number) {
    const spk = await prisma.spk.findUnique({
      where: { id: spkId },
      select: { id: true, noSpk: true, status: true },
    });
    if (!spk) throw new NotFoundError('SPK');
    if (spk.status === 'selesai' || spk.status === 'dibatalkan') {
      throw new BadRequestError(`Tidak bisa menghapus item pada SPK yang sudah ${spk.status}`);
    }

    const item = await prisma.spkItem.findFirst({ where: { id: itemId, spkId } });
    if (!item) throw new NotFoundError('Item SPK');

    await prisma.$transaction(async (tx) => {
      // Kembalikan stok jika sparepart
      if (item.type === 'sparepart' && item.sparepartId) {
        const sp = await tx.sparepart.findUnique({ where: { id: item.sparepartId } });
        if (sp) {
          await tx.sparepart.update({
            where: { id: item.sparepartId },
            data: { stok: { increment: item.qty } },
          });
        }
        await tx.inventarisLog.create({
          data: {
            sparepartId: item.sparepartId,
            type: 'masuk',
            qty: item.qty,
            keterangan: `Item dihapus dari SPK ${spk.noSpk}${!sp ? ' (Master data tidak ada)' : ''}`,
          },
        });
      }

      await tx.spkItem.delete({ where: { id: itemId } });
      await this.recalcTotalHarga(tx, spkId);

      await tx.activityLog.create({
        data: {
          userId: userId ?? null,
          action: 'remove_item',
          module: 'spk',
          targetId: spkId,
          targetName: spk.noSpk,
          detail: JSON.stringify({ nama: item.nama, qty: item.qty }),
        },
      });
    });

    return this.findById(spkId);
  }

  async updateItem(spkId: number, itemId: number, input: UpdateSpkItemInput, userId?: number) {
    const spk = await prisma.spk.findUnique({
      where: { id: spkId },
      select: { id: true, noSpk: true, status: true },
    });
    if (!spk) throw new NotFoundError('SPK');
    if (spk.status === 'selesai' || spk.status === 'dibatalkan') {
      throw new BadRequestError(`Tidak bisa mengubah item pada SPK yang sudah ${spk.status}`);
    }

    const item = await prisma.spkItem.findFirst({ where: { id: itemId, spkId } });
    if (!item) throw new NotFoundError('Item SPK');

    await prisma.$transaction(async (tx) => {
      const newQty = input.qty ?? item.qty;
      const newHarga = input.hargaSatuan ?? Number(item.hargaSatuan);
      const qtyDelta = newQty - item.qty;

      // Adjust stok sparepart jika qty berubah
      if (item.type === 'sparepart' && item.sparepartId && qtyDelta !== 0) {
        if (qtyDelta > 0) {
          const sp = await tx.sparepart.findUnique({
            where: { id: item.sparepartId },
            select: { name: true, stok: true },
          });
          if (!sp || sp.stok < qtyDelta) {
            throw new BadRequestError(
              `Stok "${sp?.name}" tidak mencukupi (tersisa ${sp?.stok ?? 0}, butuh tambahan ${qtyDelta})`
            );
          }
          await tx.sparepart.update({ where: { id: item.sparepartId }, data: { stok: { decrement: qtyDelta } } });
          await tx.inventarisLog.create({
            data: { sparepartId: item.sparepartId, type: 'keluar', qty: qtyDelta, keterangan: `Edit item SPK ${spk.noSpk}` },
          });
        } else {
          await tx.sparepart.update({ where: { id: item.sparepartId }, data: { stok: { increment: Math.abs(qtyDelta) } } });
          await tx.inventarisLog.create({
            data: { sparepartId: item.sparepartId, type: 'masuk', qty: Math.abs(qtyDelta), keterangan: `Edit item SPK ${spk.noSpk}` },
          });
        }
      }

      await tx.spkItem.update({
        where: { id: itemId },
        data: { qty: newQty, hargaSatuan: newHarga, subtotal: newQty * newHarga, status: input.status ?? item.status },
      });

      await this.recalcTotalHarga(tx, spkId);
      if (input.status) await this.recalcProgress(tx, spkId);

      await tx.activityLog.create({
        data: {
          userId: userId ?? null,
          action: 'update_item',
          module: 'spk',
          targetId: spkId,
          targetName: spk.noSpk,
          detail: JSON.stringify({ nama: item.nama, oldQty: item.qty, newQty }),
        },
      });
    });

    return this.findById(spkId);
  }

  async updateStage(spkId: number, stageId: number, input: { status?: 'pending' | 'in_progress' | 'done' }, userId?: number) {
    const spk = await prisma.spk.findUnique({
      where: { id: spkId },
      select: { id: true, noSpk: true, status: true },
    });
    if (!spk) throw new NotFoundError('SPK');
    if (spk.status === 'selesai' || spk.status === 'dibatalkan') {
      throw new BadRequestError(`Tidak bisa mengubah tahapan pada SPK yang sudah ${spk.status}`);
    }

    const stage = await prisma.spkStage.findFirst({ where: { id: stageId, spkId } });
    if (!stage) throw new NotFoundError('Tahapan SPK');

    await prisma.$transaction(async (tx) => {
      await tx.spkStage.update({
        where: { id: stageId },
        data: { status: input.status ?? stage.status },
      });
      await this.recalcProgress(tx, spkId);
      
      await tx.activityLog.create({
        data: {
          userId: userId ?? null,
          action: 'update_stage',
          module: 'spk',
          targetId: spkId,
          targetName: spk.noSpk,
          detail: JSON.stringify({ nama: stage.nama, newStatus: input.status }),
        },
      });
    });

    return this.findById(spkId);
  }

  async addStage(spkId: number, input: AddSpkStageInput, userId?: number) {
    const spk = await prisma.spk.findUnique({
      where: { id: spkId },
      select: { id: true, noSpk: true, status: true },
    });
    if (!spk) throw new NotFoundError('SPK');
    if (spk.status === 'selesai' || spk.status === 'dibatalkan') {
      throw new BadRequestError(`Tidak bisa menambah tahapan pada SPK yang sudah ${spk.status}`);
    }

    await prisma.$transaction(async (tx) => {
      // Cari urutan tertinggi yang ada
      const lastStage = await tx.spkStage.findFirst({
        where: { spkId },
        orderBy: { urutan: 'desc' },
        select: { urutan: true },
      });
      const nextUrutan = (lastStage?.urutan ?? 0) + 1;

      await tx.spkStage.create({
        data: {
          spkId,
          urutan: nextUrutan,
          nama: input.nama,
          estimasiBiaya: input.estimasiBiaya,
          durasiHari: input.durasiHari,
          status: 'pending',
        },
      });

      await this.recalcTotalHarga(tx, spkId);

      await tx.activityLog.create({
        data: {
          userId: userId ?? null,
          action: 'add_stage',
          module: 'spk',
          targetId: spkId,
          targetName: spk.noSpk,
          detail: JSON.stringify({ nama: input.nama, urutan: nextUrutan, estimasiBiaya: input.estimasiBiaya }),
        },
      });
    });

    return this.findById(spkId);
  }
}

export const spkService = new SpkService();
