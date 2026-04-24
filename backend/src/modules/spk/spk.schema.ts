import { z } from 'zod';

export const createSpkSchema = z.object({
  pelangganId: z.number().int().positive(),
  kendaraanId: z.number().int().positive().optional(),
  mekanikId: z.number().int().positive().optional(),
  mode: z.enum(['rutin', 'modifikasi', 'bubut']),
  keluhan: z.string().optional(),
  judulProyek: z.string().max(200).optional(),
  spesifikasi: z.string().optional(),
  prioritas: z.enum(['rendah', 'normal', 'tinggi', 'urgent']).default('normal'),
  catatan: z.string().optional(),
  diskon: z.number().min(0).default(0),
  items: z.array(z.object({
    type: z.enum(['jasa', 'sparepart']),
    sparepartId: z.number().int().positive().optional(),
    jasaId: z.number().int().positive().optional(),
    nama: z.string().min(1),
    qty: z.number().int().positive().default(1),
    hargaSatuan: z.number().min(0),
  })).optional(),
  stages: z.array(z.object({
    nama: z.string().min(1, 'Nama tahap wajib diisi'),
    estimasiBiaya: z.number().min(0),
    durasiHari: z.number().int().positive().default(1),
  })).optional(),
}).superRefine((data, ctx) => {
  // Mode modifikasi butuh judulProyek atau keluhan
  if (data.mode === 'modifikasi' && !data.judulProyek && !data.keluhan) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Mode modifikasi membutuhkan judul proyek atau deskripsi keluhan',
      path: ['judulProyek'],
    });
  }
  // Mode bubut wajib isi keluhan/deskripsi pekerjaan
  if (data.mode === 'bubut' && !data.keluhan?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Mode bubut membutuhkan deskripsi pekerjaan (keluhan)',
      path: ['keluhan'],
    });
  }
  // items dan stages tidak bisa bersamaan
  if (data.items?.length && data.stages?.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Tidak bisa menggunakan items dan stages bersamaan',
      path: ['items'],
    });
  }
});

export const updateSpkStatusSchema = z.object({
  status: z.enum(['antri', 'dikerjakan', 'kendala', 'selesai', 'dibatalkan']),
  catatan: z.string().optional(),
  progress: z.number().int().min(0).max(100).optional(),
});

// Schema untuk tambah item saat SPK sedang dikerjakan
export const addSpkItemSchema = z.object({
  type: z.enum(['jasa', 'sparepart']),
  sparepartId: z.number().int().positive().optional(),
  jasaId: z.number().int().positive().optional(),
  nama: z.string().min(1, 'Nama item wajib diisi'),
  qty: z.number().int().positive().default(1),
  hargaSatuan: z.number().min(0, 'Harga tidak boleh negatif'),
}).refine(
  (data) => {
    if (data.type === 'sparepart') return !!data.sparepartId;
    return true; // type 'jasa' tidak diwajibkan punya jasaId untuk item manual
  },
  { message: 'sparepartId harus diisi untuk item sparepart' }
);

// Schema untuk update qty/harga/status item
export const updateSpkItemSchema = z.object({
  qty: z.number().int().positive().optional(),
  hargaSatuan: z.number().min(0).optional(),
  status: z.enum(['pending', 'done']).optional(),
});

// Schema untuk tambah stage baru saat SPK sedang dikerjakan
export const addSpkStageSchema = z.object({
  nama: z.string().min(1, 'Nama tahap wajib diisi'),
  estimasiBiaya: z.number().min(0, 'Estimasi biaya tidak boleh negatif').default(0),
  durasiHari: z.number().int().positive('Durasi minimal 1 hari').default(1),
});

// Schema untuk update stage
export const updateSpkStageSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'done']).optional(),
});

export type CreateSpkInput = z.infer<typeof createSpkSchema>;
export type UpdateSpkStatusInput = z.infer<typeof updateSpkStatusSchema>;
export type AddSpkItemInput = z.infer<typeof addSpkItemSchema>;
export type UpdateSpkItemInput = z.infer<typeof updateSpkItemSchema>;
export type AddSpkStageInput = z.infer<typeof addSpkStageSchema>;

