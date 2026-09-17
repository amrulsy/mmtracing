"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const db_1 = __importDefault(require("../../config/db"));
const router = (0, express_1.Router)();
// Endpoint for GET /api/v1/:entity/export
router.get('/:entity/export', auth_1.authMiddleware, (0, auth_1.requirePermission)('laporan', 'full'), async (req, res, next) => {
    try {
        const entityKey = String(req.params.entity);
        // Map standard entity names to MySQL table names
        const entityMap = {
            'pelanggan': 'pelanggan',
            'kendaraan': 'kendaraan',
            'spk': 'spk',
            'pembayaran': 'pembayaran',
            'sparepart': 'sparepart',
            'mekanik': 'mekanik',
            'inventaris': 'inventaris_log',
            'log-aktivitas': 'activity_logs',
            'users': 'users'
        };
        const tableName = entityMap[entityKey];
        if (!tableName) {
            res.status(404).json({ success: false, message: 'Entity not found or export not supported' });
            return;
        }
        const data = await db_1.default.query(`SELECT * FROM \`${tableName}\``);
        if (data.length === 0) {
            res.setHeader('Content-Type', 'text/csv');
            res.attachment(`${entityKey}.csv`);
            res.send('');
            return;
        }
        // Convert JSON to CSV using a simple strategy
        const headers = Object.keys(data[0]);
        const escapeCsv = (str) => {
            if (str === null || str === undefined)
                return '';
            const s = String(str).replace(/"/g, '""');
            return `"${s}"`;
        };
        const csvRows = [];
        csvRows.push(headers.join(',')); // Add Header
        for (const row of data) {
            const values = headers.map(header => escapeCsv(row[header]));
            csvRows.push(values.join(','));
        }
        const csvString = csvRows.join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.attachment(`${entityKey}.csv`);
        res.send(csvString);
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=export.routes.js.map