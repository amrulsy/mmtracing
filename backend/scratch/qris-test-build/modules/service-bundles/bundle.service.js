"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bundleService = exports.BundleService = void 0;
const db_1 = __importDefault(require("../../config/db"));
const errors_1 = require("../../shared/errors");
class BundleService {
    async findAll(activeOnly = false) {
        const where = activeOnly ? 'WHERE isActive = TRUE' : '';
        const rows = await db_1.default.query(`SELECT * FROM service_bundles ${where} ORDER BY sortOrder ASC, name ASC`);
        return rows.map(this.mapRowToBundle);
    }
    async findById(id) {
        const row = await db_1.default.queryOne('SELECT * FROM service_bundles WHERE id = ?', [id]);
        if (!row)
            throw new errors_1.NotFoundError('Service Bundle');
        return this.mapRowToBundle(row);
    }
    async create(input) {
        const id = input.id || this.generateBundleId(input.name);
        const now = new Date();
        await db_1.default.insert('service_bundles', {
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
    async update(id, input) {
        const existing = await this.findById(id);
        if (!existing)
            throw new errors_1.NotFoundError('Service Bundle');
        const updateData = {
            updatedAt: new Date(),
        };
        if (input.name !== undefined)
            updateData.name = input.name;
        if (input.description !== undefined)
            updateData.description = input.description || null;
        if (input.icon !== undefined)
            updateData.icon = input.icon;
        if (input.items !== undefined)
            updateData.items = JSON.stringify(input.items);
        if (input.estimasiWaktu !== undefined)
            updateData.estimasiWaktu = input.estimasiWaktu || null;
        if (input.garansi !== undefined)
            updateData.garansi = input.garansi || null;
        if (input.isActive !== undefined)
            updateData.isActive = input.isActive;
        if (input.sortOrder !== undefined)
            updateData.sortOrder = input.sortOrder;
        await db_1.default.update('service_bundles', updateData, 'id = ?', [id]);
        return this.findById(id);
    }
    async delete(id) {
        const result = await db_1.default.execute('DELETE FROM service_bundles WHERE id = ?', [id]);
        if (result.affectedRows === 0)
            throw new errors_1.NotFoundError('Service Bundle');
    }
    mapRowToBundle(row) {
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
    generateBundleId(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 50);
    }
}
exports.BundleService = BundleService;
exports.bundleService = new BundleService();
//# sourceMappingURL=bundle.service.js.map