import { z } from 'zod';
export declare const createWoSchema: z.ZodObject<{
    pelangganId: z.ZodNumber;
    kendaraanId: z.ZodOptional<z.ZodNumber>;
    mekanikId: z.ZodOptional<z.ZodNumber>;
    mode: z.ZodEnum<{
        modifikasi: "modifikasi";
        rutin: "rutin";
        bubut: "bubut";
    }>;
    keluhan: z.ZodOptional<z.ZodString>;
    judulProyek: z.ZodOptional<z.ZodString>;
    spesifikasi: z.ZodOptional<z.ZodString>;
    prioritas: z.ZodDefault<z.ZodEnum<{
        rendah: "rendah";
        normal: "normal";
        tinggi: "tinggi";
        urgent: "urgent";
    }>>;
    catatan: z.ZodOptional<z.ZodString>;
    diskon: z.ZodDefault<z.ZodNumber>;
    odometerMasuk: z.ZodOptional<z.ZodNumber>;
    items: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<{
            jasa: "jasa";
            sparepart: "sparepart";
        }>;
        sparepartId: z.ZodOptional<z.ZodNumber>;
        jasaId: z.ZodOptional<z.ZodNumber>;
        nama: z.ZodString;
        qty: z.ZodDefault<z.ZodNumber>;
        hargaSatuan: z.ZodNumber;
    }, z.core.$strip>>>;
    stages: z.ZodOptional<z.ZodArray<z.ZodObject<{
        nama: z.ZodString;
        estimasiBiaya: z.ZodNumber;
        durasiHari: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const updateWoStatusSchema: z.ZodObject<{
    status: z.ZodEnum<{
        selesai: "selesai";
        antri: "antri";
        dikerjakan: "dikerjakan";
        kendala: "kendala";
        dibatalkan: "dibatalkan";
    }>;
    catatan: z.ZodOptional<z.ZodString>;
    progress: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const addWoItemSchema: z.ZodObject<{
    type: z.ZodEnum<{
        jasa: "jasa";
        sparepart: "sparepart";
    }>;
    sparepartId: z.ZodOptional<z.ZodNumber>;
    jasaId: z.ZodOptional<z.ZodNumber>;
    nama: z.ZodString;
    qty: z.ZodDefault<z.ZodNumber>;
    hargaSatuan: z.ZodNumber;
}, z.core.$strip>;
export declare const updateWoItemSchema: z.ZodObject<{
    qty: z.ZodOptional<z.ZodNumber>;
    hargaSatuan: z.ZodOptional<z.ZodNumber>;
    status: z.ZodOptional<z.ZodEnum<{
        done: "done";
        pending: "pending";
    }>>;
}, z.core.$strip>;
export declare const addWoStageSchema: z.ZodObject<{
    nama: z.ZodString;
    estimasiBiaya: z.ZodDefault<z.ZodNumber>;
    durasiHari: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const updateWoStageSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<{
        in_progress: "in_progress";
        done: "done";
        pending: "pending";
    }>>;
}, z.core.$strip>;
export declare const updateWoSchema: z.ZodObject<{
    keluhan: z.ZodOptional<z.ZodString>;
    judulProyek: z.ZodOptional<z.ZodString>;
    spesifikasi: z.ZodOptional<z.ZodString>;
    prioritas: z.ZodOptional<z.ZodEnum<{
        rendah: "rendah";
        normal: "normal";
        tinggi: "tinggi";
        urgent: "urgent";
    }>>;
    catatan: z.ZodOptional<z.ZodString>;
    mekanikId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    estimasiSelesai: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const assignMekanikSchema: z.ZodObject<{
    mekanikId: z.ZodNullable<z.ZodNumber>;
}, z.core.$strip>;
export type CreateWoInput = z.infer<typeof createWoSchema>;
export type UpdateWoStatusInput = z.infer<typeof updateWoStatusSchema>;
export type AddWoItemInput = z.infer<typeof addWoItemSchema>;
export type UpdateWoItemInput = z.infer<typeof updateWoItemSchema>;
export type AddWoStageInput = z.infer<typeof addWoStageSchema>;
export type UpdateWoStageInput = z.infer<typeof updateWoStageSchema>;
