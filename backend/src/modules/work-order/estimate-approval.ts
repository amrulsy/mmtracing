import db from '../../config/db';

let ready = false;

/** Adds the small approval state needed by existing installations without a manual migration. */
export async function ensureEstimateApprovalSchema(): Promise<void> {
  if (ready) return;
  const rows = await db.query<{ columnName: string }>(`SELECT COLUMN_NAME AS columnName FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'work_orders' AND column_name IN ('estimateApprovalStatus', 'estimateApprovalNote', 'estimateApprovedAt')`);
  const columns = new Set(rows.map((row) => row.columnName));
  if (!columns.has('estimateApprovalStatus')) await db.execute("ALTER TABLE work_orders ADD COLUMN estimateApprovalStatus VARCHAR(20) NOT NULL DEFAULT 'not_required'");
  if (!columns.has('estimateApprovalNote')) await db.execute('ALTER TABLE work_orders ADD COLUMN estimateApprovalNote TEXT NULL');
  if (!columns.has('estimateApprovedAt')) await db.execute('ALTER TABLE work_orders ADD COLUMN estimateApprovedAt DATETIME NULL');
  ready = true;
}
