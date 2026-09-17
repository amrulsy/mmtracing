"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.pool = void 0;
require("dotenv/config");
const promise_1 = __importDefault(require("mysql2/promise"));
// ═══════════════════════════════════════════════════════════════
// MySQL2 Connection Pool & Query Helpers
// Native MySQL2 database layer.
// Usage:
//   import db from '../config/db';
//   const rows = await db.query('SELECT * FROM supplier WHERE id = ?', [id]);
//   await db.transaction(async (tx) => { await tx.execute(...); });
// ═══════════════════════════════════════════════════════════════
function getPoolConfig() {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
        const u = new URL(dbUrl);
        return {
            host: u.hostname,
            port: parseInt(u.port) || 3306,
            user: decodeURIComponent(u.username),
            password: decodeURIComponent(u.password),
            database: u.pathname.slice(1),
        };
    }
    return {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USERNAME || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE || 'mmtracing',
    };
}
exports.pool = promise_1.default.createPool({
    ...getPoolConfig(),
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    decimalNumbers: true,
    dateStrings: false,
    timezone: '+07:00',
    typeCast(field, next) {
        if (field.type === 'TINY' && field.length === 1) {
            const val = field.string();
            return val === null ? null : val === '1';
        }
        return next();
    },
});
function wrap(src) {
    return {
        async query(sql, params) {
            const [rows] = await src.query(sql, params);
            return rows;
        },
        async queryOne(sql, params) {
            const [rows] = await src.query(sql, params);
            return rows[0] ?? null;
        },
        async queryVal(sql, params) {
            const [rows] = await src.query(sql, params);
            const row = rows[0];
            if (!row)
                return undefined;
            return Object.values(row)[0];
        },
        async execute(sql, params) {
            const [result] = await src.query(sql, params);
            return result;
        },
        async insert(table, data) {
            const entries = Object.entries(data).filter(([, v]) => v !== undefined);
            const cols = entries.map(([k]) => `\`${k}\``).join(', ');
            const phs = entries.map(() => '?').join(', ');
            const vals = entries.map(([, v]) => v);
            const [result] = await src.query(`INSERT INTO \`${table}\` (${cols}) VALUES (${phs})`, vals);
            return result.insertId;
        },
        async update(table, data, where, whereParams = []) {
            const entries = Object.entries(data).filter(([, v]) => v !== undefined);
            if (entries.length === 0)
                return 0;
            const sets = entries.map(([k]) => `\`${k}\` = ?`).join(', ');
            const vals = [...entries.map(([, v]) => v), ...whereParams];
            const [result] = await src.query(`UPDATE \`${table}\` SET ${sets} WHERE ${where}`, vals);
            return result.affectedRows;
        },
        async upsert(table, data, updateCols) {
            const entries = Object.entries(data).filter(([, v]) => v !== undefined);
            const cols = entries.map(([k]) => `\`${k}\``).join(', ');
            const phs = entries.map(() => '?').join(', ');
            const vals = entries.map(([, v]) => v);
            const updatable = updateCols
                ? entries.filter(([k]) => updateCols.includes(k))
                : entries;
            const updates = updatable.map(([k]) => `\`${k}\` = VALUES(\`${k}\`)`).join(', ');
            const [result] = await src.query(`INSERT INTO \`${table}\` (${cols}) VALUES (${phs}) ON DUPLICATE KEY UPDATE ${updates}`, vals);
            return result.insertId;
        },
    };
}
// ─── Main db singleton ───────────────────────────────────────────
const base = wrap(exports.pool);
exports.db = {
    ...base,
    pool: exports.pool,
    /** Run callback inside a MySQL transaction. tx has the same API as db. */
    async transaction(fn) {
        const conn = await exports.pool.getConnection();
        await conn.beginTransaction();
        try {
            const result = await fn(wrap(conn));
            await conn.commit();
            return result;
        }
        catch (err) {
            await conn.rollback();
            throw err;
        }
        finally {
            conn.release();
        }
    },
    /** Health check */
    async checkHealth() {
        try {
            await base.query('SELECT 1');
            return true;
        }
        catch {
            return false;
        }
    },
    /** Graceful shutdown */
    async close() {
        await exports.pool.end();
    },
};
exports.default = exports.db;
//# sourceMappingURL=db.js.map