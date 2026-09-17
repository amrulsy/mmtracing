import { randomBytes } from 'crypto';
import db, { Queryable } from '../../config/db';

let ready = false;
export async function ensureVoucherSchema() {
  if (ready) return;
  await db.execute(`CREATE TABLE IF NOT EXISTS vouchers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pelangganId INT NOT NULL,
    rewardId INT NOT NULL,
    code VARCHAR(32) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'tersedia',
    expiresAt DATETIME NULL,
    usedAt DATETIME NULL,
    usedWoId INT NULL,
    createdAt DATETIME NOT NULL,
    INDEX idx_voucher_customer (pelangganId, status)
  )`);
  ready = true;
}

export async function issueVoucher(tx: Queryable, pelangganId: number, rewardId: number) {
  const code = `MMT-${randomBytes(4).toString('hex').toUpperCase()}`;
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 3);
  const id = await tx.insert('vouchers', { pelangganId, rewardId, code, status: 'tersedia', expiresAt, createdAt: new Date() });
  return { id, code, expiresAt };
}
