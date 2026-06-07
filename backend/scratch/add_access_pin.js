const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'amrulsy',
    password: 'syaifflab.com',
    database: 'mmtracing',
  });
  
  try {
    await conn.query(`ALTER TABLE pembayaran ADD COLUMN accessPin VARCHAR(10) NULL;`);
    console.log('Successfully added accessPin column to pembayaran table.');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Column already exists.');
    } else {
      console.error('Error adding column:', err);
    }
  }
  
  await conn.end();
}

run();
