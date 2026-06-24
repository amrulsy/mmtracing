import 'dotenv/config';
import db from '../src/config/db';

async function main() {
  try {
    await db.execute('ALTER TABLE roles ADD COLUMN isProtected TINYINT(1) DEFAULT 0');
    console.log('Column added');
  } catch (err: any) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Column already exists');
    } else {
      console.error(err);
    }
  } finally {
    process.exit(0);
  }
}
main();
