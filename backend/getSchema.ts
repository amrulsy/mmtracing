import db from './src/config/db';

async function run() {
  try {
    const res = await db.query('SHOW CREATE TABLE pelanggan');
    console.log(res[0]['Create Table']);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
