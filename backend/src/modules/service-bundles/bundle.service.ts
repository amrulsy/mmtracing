import db from '../../config/db';
import { NotFoundError } from '../../shared/errors';
import { CreateBundleInput, UpdateBundleInput } from './bundle.schema';

export interface Bundle {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  items: Array<{
    type: 'jasa' | 'sparepart';
    id: number;
    qty: number;
  }>;
  estimasiWaktu: string | null;
  garansi: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export class BundleService {
  async findAll(activeOnly = false): Promise<Bundle[]> {
    const where = activeOnly ? 'WHERE isActive = TRUE' : '';
    const rows = await db.query<any>(
      `SELECT * FROM service_bundles ${where} ORDER BY sortOrder ASC, name ASC`
    );
    return rows.map(this.mapRowToBundle);
  }

  async findById(id: string): Promise<Bundle> {
    const row = await db.queryOne<any>('SELECT * FROM service_bundles WHERE id = ?', [id]);
    if (!row) throw new NotFoundError('Service Bundle');
    return this.mapRowToBundle(row);
  }

  async create(input: CreateBundleInput): Promise<Bundle> {
    const id = input.id || this.generateBundleId(input.name);
    const now = new Date();
    
    await db.insert('service_bundles', {
      id,
      name: input.name,
      description: input.description || null,
      icon: input.icon,
      items: JSON.stringify(input.items),
      estimasiWaktu: input.estimasiWaktu || null,
      garansi: input.garansi || null,
      isActive: input.isActive,
      sortOrder: input.sortOrder,
      createdAt: now,
      updatedAt: now,
    });

    return this.findById(id);
  }

  async update(id: string, input: UpdateBundleInput): Promise<Bundle> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundError('Service Bundle');

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description || null;
    if (input.icon !== undefined) updateData.icon = input.icon;
    if (input.items !== undefined) updateData.items = JSON.stringify(input.items);
    if (input.estimasiWaktu !== undefined) updateData.estimasiWaktu = input.estimasiWaktu || null;
    if (input.garansi !== undefined) updateData.garansi = input.garansi || null;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;

    await db.update('service_bundles', updateData, 'id = ?', [id]);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    const result = await db.execute('DELETE FROM service_bundles WHERE id = ?', [id]);
    if (result.affectedRows === 0) throw new NotFoundError('Service Bundle');
  }

  private mapRowToBundle(row: any): Bundle {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
      estimasiWaktu: row.estimasiWaktu,
      garansi: row.garansi,
      isActive: row.isActive === 1 || row.isActive === true,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private generateBundleId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }
}

export const bundleService = new BundleService();
