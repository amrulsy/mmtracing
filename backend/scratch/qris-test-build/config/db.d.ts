import 'dotenv/config';
import mysql, { Pool, PoolConnection, ResultSetHeader } from 'mysql2/promise';
export declare const pool: Pool;
export interface Queryable {
    query<T = any>(sql: string, params?: any[]): Promise<T[]>;
    queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
    queryVal<T = any>(sql: string, params?: any[]): Promise<T>;
    execute(sql: string, params?: any[]): Promise<ResultSetHeader>;
    insert(table: string, data: Record<string, any>): Promise<number>;
    update(table: string, data: Record<string, any>, where: string, whereParams?: any[]): Promise<number>;
    upsert(table: string, data: Record<string, any>, updateCols?: string[]): Promise<number>;
}
export declare const db: {
    pool: mysql.Pool;
    /** Run callback inside a MySQL transaction. tx has the same API as db. */
    transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>;
    /** Health check */
    checkHealth(): Promise<boolean>;
    /** Graceful shutdown */
    close(): Promise<void>;
    query<T = any>(sql: string, params?: any[]): Promise<T[]>;
    queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
    queryVal<T = any>(sql: string, params?: any[]): Promise<T>;
    execute(sql: string, params?: any[]): Promise<ResultSetHeader>;
    insert(table: string, data: Record<string, any>): Promise<number>;
    update(table: string, data: Record<string, any>, where: string, whereParams?: any[]): Promise<number>;
    upsert(table: string, data: Record<string, any>, updateCols?: string[]): Promise<number>;
};
export type { Pool, PoolConnection, ResultSetHeader };
export default db;
