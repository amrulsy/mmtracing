import 'dotenv/config';
import db from '../src/config/db';

async function main() {
  try {
    await db.execute("UPDATE roles SET isProtected = 1 WHERE name = 'Admin'");
    console.log('Admin role protected');
  } catch (err: any) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
main();
