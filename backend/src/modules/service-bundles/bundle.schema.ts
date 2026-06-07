import { z } from 'zod';

const bundleItemSchema = z.object({
  type: z.enum(['jasa', 'sparepart']),
  id: z.number().int().positive(),
  qty: z.number().int().min(1).default(1),
});

export const createBundleSchema = z.object({
  id: z.string().min(1).max(100).optional(),
  name: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
  icon: z.enum(['tuneup', 'cvt', 'rem', 'oli', 'mesin', 'general']).default('general'),
  items: z.array(bundleItemSchema).min(1, 'Minimal 1 item wajib diisi'),
  estimasiWaktu: z.string().max(100).optional(),
  garansi: z.string().max(100).optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateBundleSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(500).optional(),
  icon: z.enum(['tuneup', 'cvt', 'rem', 'oli', 'mesin', 'general']).optional(),
  items: z.array(bundleItemSchema).min(1).optional(),
  estimasiWaktu: z.string().max(100).optional(),
  garansi: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export type CreateBundleInput = z.infer<typeof createBundleSchema>;
export type UpdateBundleInput = z.infer<typeof updateBundleSchema>;
