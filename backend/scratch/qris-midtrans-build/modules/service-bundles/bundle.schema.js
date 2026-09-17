"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBundleSchema = exports.createBundleSchema = void 0;
const zod_1 = require("zod");
const bundleItemSchema = zod_1.z.object({
    type: zod_1.z.enum(['jasa', 'sparepart']),
    id: zod_1.z.number().int().positive(),
    qty: zod_1.z.number().int().min(1).default(1),
});
exports.createBundleSchema = zod_1.z.object({
    id: zod_1.z.string().min(1).max(100).optional(),
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().max(500).optional(),
    icon: zod_1.z.enum(['tuneup', 'cvt', 'rem', 'oli', 'mesin', 'general']).default('general'),
    items: zod_1.z.array(bundleItemSchema).min(1, 'Minimal 1 item wajib diisi'),
    estimasiWaktu: zod_1.z.string().max(100).optional(),
    garansi: zod_1.z.string().max(100).optional(),
    isActive: zod_1.z.boolean().default(true),
    sortOrder: zod_1.z.number().int().min(0).default(0),
});
exports.updateBundleSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255).optional(),
    description: zod_1.z.string().max(500).optional(),
    icon: zod_1.z.enum(['tuneup', 'cvt', 'rem', 'oli', 'mesin', 'general']).optional(),
    items: zod_1.z.array(bundleItemSchema).min(1).optional(),
    estimasiWaktu: zod_1.z.string().max(100).optional(),
    garansi: zod_1.z.string().max(100).optional(),
    isActive: zod_1.z.boolean().optional(),
    sortOrder: zod_1.z.number().int().min(0).optional(),
});
//# sourceMappingURL=bundle.schema.js.map