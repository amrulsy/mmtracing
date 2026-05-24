import mysql, { Pool, PoolConnection, ResultSetHeader } from 'mysql2/promise';

// ═══════════════════════════════════════════════════════════════
// MySQL2 Connection Pool & Query Helpers
// Native MySQL2 database layer.
// Usage:
//   import db from '../config/db';
//   const rows = await db.query('SELECT * FROM supplier WHERE id = ?', [id]);
//   await db.transaction(async (tx) => { await tx.execute(...); });
// ═══════════════════════════════════════════════════════════════

function getPoolConfig(): mysql.PoolOptions {
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

export const pool: Pool = mysql.createPool({
  ...getPoolConfig(),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  decimalNumbers: true,
  dateStrings: false,
  timezone: '+07:00',
  typeCast(field: any, next: any) {
    if (field.type === 'TINY' && field.length === 1) {
      const val = field.string();
      return val === null ? null : val === '1';
    }
    return next();
  },
});

// ─── Queryable interface (shared by pool & transaction) ──────────
export interface Queryable {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
  queryVal<T = any>(sql: string, params?: any[]): Promise<T>;
  execute(sql: string, params?: any[]): Promise<ResultSetHeader>;
  insert(table: string, data: Record<string, any>): Promise<number>;
  update(table: string, data: Record<string, any>, where: string, whereParams?: any[]): Promise<number>;
  upsert(table: string, data: Record<string, any>, updateCols?: string[]): Promise<number>;
}

function wrap(src: { query: Function }): Queryable {
  return {
    async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
      const [rows] = await src.query(sql, params);
      return rows as T[];
    },
    async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
      const [rows] = await src.query(sql, params);
      return (rows as any[])[0] ?? null;
    },
    async queryVal<T = any>(sql: string, params?: any[]): Promise<T> {
      const [rows] = await src.query(sql, params);
      const row = (rows as any[])[0];
      if (!row) return undefined as any;
      return Object.values(row)[0] as T;
    },
    async execute(sql: string, params?: any[]): Promise<ResultSetHeader> {
      const [result] = await src.query(sql, params);
      return result as ResultSetHeader;
    },
    async insert(table: string, data: Record<string, any>): Promise<number> {
      const entries = Object.entries(data).filter(([, v]) => v !== undefined);
      const cols = entries.map(([k]) => `\`${k}\``).join(', ');
      const phs = entries.map(() => '?').join(', ');
      const vals = entries.map(([, v]) => v);
      const [result] = await src.query(
        `INSERT INTO \`${table}\` (${cols}) VALUES (${phs})`,
        vals,
      );
      return (result as ResultSetHeader).insertId;
    },
    async update(table: string, data: Record<string, any>, where: string, whereParams: any[] = []): Promise<number> {
      const entries = Object.entries(data).filter(([, v]) => v !== undefined);
      if (entries.length === 0) return 0;
      const sets = entries.map(([k]) => `\`${k}\` = ?`).join(', ');
      const vals = [...entries.map(([, v]) => v), ...whereParams];
      const [result] = await src.query(
        `UPDATE \`${table}\` SET ${sets} WHERE ${where}`,
        vals,
      );
      return (result as ResultSetHeader).affectedRows;
    },
    async upsert(table: string, data: Record<string, any>, updateCols?: string[]): Promise<number> {
      const entries = Object.entries(data).filter(([, v]) => v !== undefined);
      const cols = entries.map(([k]) => `\`${k}\``).join(', ');
      const phs = entries.map(() => '?').join(', ');
      const vals = entries.map(([, v]) => v);
      const updatable = updateCols
        ? entries.filter(([k]) => updateCols.includes(k))
        : entries;
      const updates = updatable.map(([k]) => `\`${k}\` = VALUES(\`${k}\`)`).join(', ');
      const [result] = await src.query(
        `INSERT INTO \`${table}\` (${cols}) VALUES (${phs}) ON DUPLICATE KEY UPDATE ${updates}`,
        vals,
      );
      return (result as ResultSetHeader).insertId;
    },
  };
}

// ─── Main db singleton ───────────────────────────────────────────
const base = wrap(pool);

export const db = {
  ...base,
  pool,

  /** Run callback inside a MySQL transaction. tx has the same API as db. */
  async transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T> {
    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      const result = await fn(wrap(conn));
      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  /** Health check */
  async checkHealth(): Promise<boolean> {
    try {
      await base.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  },

  /** Graceful shutdown */
  async close(): Promise<void> {
    await pool.end();
  },
};

export type { Pool, PoolConnection, ResultSetHeader };
export default db;
