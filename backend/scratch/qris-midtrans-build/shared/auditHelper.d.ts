type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'stok_masuk' | 'stok_keluar' | 'opname' | string;
type AuditModule = 'wo' | 'pembayaran' | 'inventaris' | 'sparepart' | 'jasa' | 'pelanggan' | 'mekanik' | 'garansi' | 'auth' | 'booking' | 'settings' | string;
interface DiffEntry {
    from: unknown;
    to: unknown;
}
/**
 * Compare two objects and return a diff of changed fields.
 * Only includes fields that actually changed.
 *
 * @param before - Object state before the change
 * @param after - Object state after the change
 * @param fields - Optional whitelist of fields to compare, compares all if omitted
 * @returns Record of changed fields with { from, to } values, or null if no changes
 */
export declare function buildAuditDiff(before: Record<string, unknown>, after: Record<string, unknown>, fields?: string[]): Record<string, DiffEntry> | null;
/**
 * Log an activity to the ActivityLog table with structured detail.
 */
export declare function logActivity(params: {
    userId?: number;
    action: AuditAction;
    module: AuditModule;
    targetId?: number;
    targetName?: string;
    detail?: Record<string, unknown> | string | null;
    ipAddress?: string;
}): Promise<void>;
/**
 * Convenience: Log an update action with before/after diff.
 */
export declare function logUpdateWithDiff(params: {
    userId?: number;
    module: AuditModule;
    targetId: number;
    targetName: string;
    before: Record<string, unknown>;
    after: Record<string, unknown>;
    fields?: string[];
    ipAddress?: string;
}): Promise<void>;
export {};
