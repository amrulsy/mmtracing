import db from '../src/config/db';
db.execute(`UPDATE qris_payment_attempts SET payload = REPLACE(payload, '"provider":"midtrans"', '"provider":"midtrans-closed"') WHERE confirmedAt IS NULL`).then(() => {
  console.log('Cleared stuck QRIS attempts');
  process.exit(0);
});
