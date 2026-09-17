"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignMekanikSchema = exports.updateWoSchema = exports.updateWoStageSchema = exports.addWoStageSchema = exports.updateWoItemSchema = exports.addWoItemSchema = exports.updateWoStatusSchema = exports.createWoSchema = void 0;
const zod_1 = require("zod");
exports.createWoSchema = zod_1.z.object({
    pelangganId: zod_1.z.number().int().positive(),
    kendaraanId: zod_1.z.number().int().positive().optional(),
    mekanikId: zod_1.z.number().int().positive().optional(),
    mode: zod_1.z.enum(['rutin', 'modifikasi', 'bubut']),
    keluhan: zod_1.z.string().optional(),
    judulProyek: zod_1.z.string().max(200).optional(),
    spesifikasi: zod_1.z.string().optional(),
    prioritas: zod_1.z.enum(['rendah', 'normal', 'tinggi', 'urgent']).default('normal'),
    catatan: zod_1.z.string().optional(),
    diskon: zod_1.z.number().min(0).default(0),
    odometerMasuk: zod_1.z.number().int().min(0).optional(),
    items: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum(['jasa', 'sparepart']),
        sparepartId: zod_1.z.number().int().positive().optional(),
        jasaId: zod_1.z.number().int().positive().optional(),
        nama: zod_1.z.string().min(1),
        qty: zod_1.z.number().int().positive().default(1),
        hargaSatuan: zod_1.z.number().min(0),
    })).optional(),
    stages: zod_1.z.array(zod_1.z.object({
        nama: zod_1.z.string().min(1, 'Nama tahap wajib diisi'),
        estimasiBiaya: zod_1.z.number().min(0),
        durasiHari: zod_1.z.number().int().positive().default(1),
    })).optional(),
}).superRefine((data, ctx) => {
    // Mode modifikasi butuh judulProyek atau keluhan
    if (data.mode === 'modifikasi' && !data.judulProyek && !data.keluhan) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: 'Mode modifikasi membutuhkan judul proyek atau deskripsi keluhan',
            path: ['judulProyek'],
        });
    }
    // Mode modifikasi wajib punya minimal 1 stage dengan nama
    if (data.mode === 'modifikasi') {
        const validStages = data.stages?.filter(s => s.nama?.trim()) ?? [];
        if (validStages.length === 0) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: 'Mode modifikasi membutuhkan minimal 1 tahapan pekerjaan',
                path: ['stages'],
            });
        }
    }
    // Mode bubut wajib isi keluhan/deskripsi pekerjaan
    if (data.mode === 'bubut' && !data.keluhan?.trim()) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: 'Mode bubut membutuhkan deskripsi pekerjaan (keluhan)',
            path: ['keluhan'],
        });
    }
    // Mode rutin tidak boleh punya stages
    if (data.mode === 'rutin' && data.stages?.length) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: 'Mode rutin tidak menggunakan tahapan',
            path: ['stages'],
        });
    }
});
exports.updateWoStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['antri', 'dikerjakan', 'kendala', 'selesai', 'dibatalkan']),
    catatan: zod_1.z.string().optional(),
    progress: zod_1.z.number().int().min(0).max(100).optional(),
});
// Schema untuk tambah item saat WO sedang dikerjakan
exports.addWoItemSchema = zod_1.z.object({
    type: zod_1.z.enum(['jasa', 'sparepart']),
    sparepartId: zod_1.z.number().int().positive().optional(),
    jasaId: zod_1.z.number().int().positive().optional(),
    nama: zod_1.z.string().min(1, 'Nama item wajib diisi'),
    qty: zod_1.z.number().int().positive().default(1),
    hargaSatuan: zod_1.z.number().min(0, 'Harga tidak boleh negatif'),
}).refine((data) => {
    if (data.type === 'sparepart')
        return !!data.sparepartId;
    return true; // type 'jasa' tidak diwajibkan punya jasaId untuk item manual
}, { message: 'sparepartId harus diisi untuk item sparepart' });
// Schema untuk update qty/harga/status item
exports.updateWoItemSchema = zod_1.z.object({
    qty: zod_1.z.number().int().positive().optional(),
    hargaSatuan: zod_1.z.number().min(0).optional(),
    status: zod_1.z.enum(['pending', 'done']).optional(),
});
// Schema untuk tambah stage baru saat SPK sedang dikerjakan
exports.addWoStageSchema = zod_1.z.object({
    nama: zod_1.z.string().min(1, 'Nama tahap wajib diisi'),
    estimasiBiaya: zod_1.z.number().min(0, 'Estimasi biaya tidak boleh negatif').default(0),
    durasiHari: zod_1.z.number().int().positive('Durasi minimal 1 hari').default(1),
});
// Schema untuk update stage
exports.updateWoStageSchema = zod_1.z.object({
    status: zod_1.z.enum(['pending', 'in_progress', 'done']).optional(),
});
// Schema untuk edit field non-finansial SPK (keluhan/judul/spesifikasi/prioritas/catatan/mekanik)
exports.updateWoSchema = zod_1.z.object({
    keluhan: zod_1.z.string().optional(),
    judulProyek: zod_1.z.string().max(200).optional(),
    spesifikasi: zod_1.z.string().optional(),
    prioritas: zod_1.z.enum(['rendah', 'normal', 'tinggi', 'urgent']).optional(),
    catatan: zod_1.z.string().optional(),
    mekanikId: zod_1.z.number().int().positive().nullable().optional(),
    estimasiSelesai: zod_1.z.string().datetime().nullable().optional(),
});
// Schema untuk assign/change mekanik
exports.assignMekanikSchema = zod_1.z.object({
    mekanikId: zod_1.z.number().int().positive().nullable(),
});
//# sourceMappingURL=wo.schema.js.map