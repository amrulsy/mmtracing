import db from '../config/db';

type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'stok_masuk' | 'stok_keluar' | 'opname' | string;
type AuditModule = 'spk' | 'pembayaran' | 'inventaris' | 'sparepart' | 'jasa' | 'pelanggan' | 'mekanik' | 'garansi' | 'auth' | 'booking' | 'settings' | string;

interface DiffEntry {
  from: unknown;
  to: unknown;
}

/** Fields to never include in audit diffs */
const SENSITIVE_FIELDS = new Set(['password', 'token', 'secret', 'jwt']);

/**
 * Compare two objects and return a diff of changed fields.
 * Only includes fields that actually changed.
 * 
 * @param before - Object state before the change
 * @param after - Object state after the change
 * @param fields - Optional whitelist of fields to compare, compares all if omitted
 * @returns Record of changed fields with { from, to } values, or null if no changes
 */
export function buildAuditDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields?: string[]
): Record<string, DiffEntry> | null {
  const diff: Record<string, DiffEntry> = {};
  const keysToCheck = fields || [...new Set([...Object.keys(before), ...Object.keys(after)])];

  for (const key of keysToCheck) {
    // Skip sensitive, internal, and timestamp fields
    if (SENSITIVE_FIELDS.has(key.toLowerCase())) continue;
    if (key === 'updatedAt' || key === 'createdAt') continue;

    const oldVal = before[key];
    const newVal = after[key];

    // Normalize for comparison (handle Decimal, Date, etc.)
    const oldStr = normalizeValue(oldVal);
    const newStr = normalizeValue(newVal);

    if (oldStr !== newStr) {
      diff[key] = { from: oldVal, to: newVal };
    }
  }

  return Object.keys(diff).length > 0 ? diff : null;
}

/**
 * Normalize a value for comparison (handles Decimal, Date objects, etc.)
 */
function normalizeValue(val: unknown): string {
  if (val === null || val === undefined) return 'null';
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'object' && val !== null && 'toNumber' in val) {
    return String((val as { toNumber(): number }).toNumber());
  }
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

/**
 * Log an activity to the ActivityLog table with structured detail.
 */
export async function logActivity(params: {
  userId?: number;
  action: AuditAction;
  module: AuditModule;
  targetId?: number;
  targetName?: string;
  detail?: Record<string, unknown> | string | null;
  ipAddress?: string;
}): Promise<void> {
  try {
    await db.insert('activity_logs', {
      userId: params.userId || null,
      action: params.action,
      module: params.module,
      targetId: params.targetId || null,
      targetName: params.targetName || null,
      detail: params.detail
        ? (typeof params.detail === 'string' ? params.detail : JSON.stringify(params.detail))
        : null,
      ipAddress: params.ipAddress || null,
    });
  } catch (err) {
    // Never let audit logging break the main flow
    console.error('[AuditHelper] Failed to log activity:', err);
  }
}

/**
 * Convenience: Log an update action with before/after diff.
 */
export async function logUpdateWithDiff(params: {
  userId?: number;
  module: AuditModule;
  targetId: number;
  targetName: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  fields?: string[];
  ipAddress?: string;
}): Promise<void> {
  const diff = buildAuditDiff(params.before, params.after, params.fields);
  
  await logActivity({
    userId: params.userId,
    action: 'update',
    module: params.module,
    targetId: params.targetId,
    targetName: params.targetName,
    detail: diff ? { changes: diff } : { changes: 'no_diff' },
    ipAddress: params.ipAddress,
  });
}
