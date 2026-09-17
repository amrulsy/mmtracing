"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAuditDiff = buildAuditDiff;
exports.logActivity = logActivity;
exports.logUpdateWithDiff = logUpdateWithDiff;
const db_1 = __importDefault(require("../config/db"));
const logger_1 = __importDefault(require("../config/logger"));
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
function buildAuditDiff(before, after, fields) {
    const diff = {};
    const keysToCheck = fields || [...new Set([...Object.keys(before), ...Object.keys(after)])];
    for (const key of keysToCheck) {
        // Skip sensitive, internal, and timestamp fields
        if (SENSITIVE_FIELDS.has(key.toLowerCase()))
            continue;
        if (key === 'updatedAt' || key === 'createdAt')
            continue;
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
function normalizeValue(val) {
    if (val === null || val === undefined)
        return 'null';
    if (val instanceof Date)
        return val.toISOString();
    if (typeof val === 'object' && val !== null && 'toNumber' in val) {
        return String(val.toNumber());
    }
    if (typeof val === 'object')
        return JSON.stringify(val);
    return String(val);
}
/**
 * Log an activity to the ActivityLog table with structured detail.
 */
async function logActivity(params) {
    try {
        await db_1.default.insert('activity_logs', {
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
    }
    catch (err) {
        // Never let audit logging break the main flow
        logger_1.default.error('[AuditHelper] Failed to log activity:', err);
    }
}
/**
 * Convenience: Log an update action with before/after diff.
 */
async function logUpdateWithDiff(params) {
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
//# sourceMappingURL=auditHelper.js.map