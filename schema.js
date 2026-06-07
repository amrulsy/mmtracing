const db = require('./backend/dist/config/db').default;
async function run() {
  const p = await db.query('DESCRIBE pelanggan');
  console.log('pelanggan:', p.map(x => x.Field));
  const s = await db.query('DESCRIBE spk');
  console.log('spk:', s.map(x => x.Field));
  process.exit(0);
}
run();
