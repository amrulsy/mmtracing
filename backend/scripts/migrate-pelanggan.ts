import db from './src/config/db';

async function run() {
  try {
    console.log('Adding password column to pelanggan...');
    await db.execute('ALTER TABLE pelanggan ADD COLUMN password VARCHAR(255) DEFAULT NULL');
    console.log('Added password column.');
  } catch (err: any) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Column password already exists.');
    } else {
      console.error(err);
    }
  }

  try {
    console.log('Adding role column to pelanggan...');
    await db.execute("ALTER TABLE pelanggan ADD COLUMN role VARCHAR(50) DEFAULT 'customer'");
    console.log('Added role column.');
  } catch (err: any) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Column role already exists.');
    } else {
      console.error(err);
    }
  }

  process.exit(0);
}

run();
