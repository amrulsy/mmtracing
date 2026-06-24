import db from './src/config/db';
async function test() {
  const p = await db.query('DESCRIBE spk');
  console.log(p.map(x => x.Field));
  process.exit(0);
}
test();
