import { z } from 'zod';
export declare const createBundleSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    icon: z.ZodDefault<z.ZodEnum<{
        tuneup: "tuneup";
        cvt: "cvt";
        rem: "rem";
        oli: "oli";
        mesin: "mesin";
        general: "general";
    }>>;
    items: z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<{
            jasa: "jasa";
            sparepart: "sparepart";
        }>;
        id: z.ZodNumber;
        qty: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>;
    estimasiWaktu: z.ZodOptional<z.ZodString>;
    garansi: z.ZodOptional<z.ZodString>;
    isActive: z.ZodDefault<z.ZodBoolean>;
    sortOrder: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const updateBundleSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    icon: z.ZodOptional<z.ZodEnum<{
        tuneup: "tuneup";
        cvt: "cvt";
        rem: "rem";
        oli: "oli";
        mesin: "mesin";
        general: "general";
    }>>;
    items: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<{
            jasa: "jasa";
            sparepart: "sparepart";
        }>;
        id: z.ZodNumber;
        qty: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>>;
    estimasiWaktu: z.ZodOptional<z.ZodString>;
    garansi: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    sortOrder: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type CreateBundleInput = z.infer<typeof createBundleSchema>;
export type UpdateBundleInput = z.infer<typeof updateBundleSchema>;
