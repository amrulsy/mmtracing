import db from './src/config/db';

async function run() {
  try {
    console.log('Creating service_bundles table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS service_bundles (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        icon VARCHAR(50) DEFAULT 'general',
        items JSON NOT NULL,
        estimasiWaktu VARCHAR(100),
        garansi VARCHAR(100),
        isActive BOOLEAN DEFAULT TRUE,
        sortOrder INT DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Created service_bundles table.');
  } catch (err: any) {
    console.error('Error creating table:', err.message);
    process.exit(1);
  }

  // Seed default bundles
  const defaultBundles = [
    {
      id: 'tuneup-ringan',
      name: 'Tune Up Ringan',
      description: 'Servis ringan untuk perawatan berkala',
      icon: 'tuneup',
      items: JSON.stringify([
        { type: 'jasa', id: 1, qty: 1 },
        { type: 'sparepart', id: 5, qty: 1 },
        { type: 'sparepart', id: 8, qty: 1 },
      ]),
      estimasiWaktu: '30-45 menit',
      garansi: '7 hari',
      sortOrder: 1,
    },
    {
      id: 'cvt-service',
      name: 'CVT Service',
      description: 'Servis lengkap CVT + ganti vanbelt',
      icon: 'cvt',
      items: JSON.stringify([
        { type: 'jasa', id: 3, qty: 1 },
        { type: 'sparepart', id: 12, qty: 1 },
        { type: 'sparepart', id: 15, qty: 1 },
        { type: 'sparepart', id: 18, qty: 1 },
      ]),
      estimasiWaktu: '1-2 jam',
      garansi: '14 hari',
      sortOrder: 2,
    },
    {
      id: 'servis-rem',
      name: 'Servis Rem Lengkap',
      description: 'Cek & servis sistem pengereman',
      icon: 'rem',
      items: JSON.stringify([
        { type: 'jasa', id: 5, qty: 1 },
        { type: 'sparepart', id: 22, qty: 2 },
        { type: 'sparepart', id: 23, qty: 1 },
        { type: 'sparepart', id: 25, qty: 1 },
      ]),
      estimasiWaktu: '45-60 menit',
      garansi: '30 hari',
      sortOrder: 3,
    },
    {
      id: 'ganti-oli',
      name: 'Ganti Oli + Filter',
      description: 'Paket ganti oli mesin & filter',
      icon: 'oli',
      items: JSON.stringify([
        { type: 'jasa', id: 2, qty: 1 },
        { type: 'sparepart', id: 5, qty: 1 },
        { type: 'sparepart', id: 8, qty: 1 },
      ]),
      estimasiWaktu: '20-30 menit',
      garansi: '7 hari',
      sortOrder: 4,
    },
    {
      id: 'servis-mesin',
      name: 'Servis Mesin Ringan',
      description: 'Pembersihan & tune up mesin',
      icon: 'mesin',
      items: JSON.stringify([
        { type: 'jasa', id: 7, qty: 1 },
        { type: 'sparepart', id: 30, qty: 1 },
        { type: 'sparepart', id: 31, qty: 1 },
        { type: 'sparepart', id: 5, qty: 1 },
      ]),
      estimasiWaktu: '1-1.5 jam',
      garansi: '14 hari',
      sortOrder: 5,
    },
    {
      id: 'servis-lengkap',
      name: 'Servis Lengkap',
      description: 'Servis komprehensif untuk kendaraan',
      icon: 'general',
      items: JSON.stringify([
        { type: 'jasa', id: 1, qty: 1 },
        { type: 'jasa', id: 3, qty: 1 },
        { type: 'jasa', id: 5, qty: 1 },
        { type: 'sparepart', id: 5, qty: 1 },
        { type: 'sparepart', id: 8, qty: 1 },
        { type: 'sparepart', id: 31, qty: 1 },
      ]),
      estimasiWaktu: '2-3 jam',
      garansi: '30 hari',
      sortOrder: 6,
    },
  ];

  for (const bundle of defaultBundles) {
    try {
      await db.execute(
        `INSERT INTO service_bundles (id, name, description, icon, items, estimasiWaktu, garansi, sortOrder, isActive) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)
         ON DUPLICATE KEY UPDATE 
         name = VALUES(name), 
         description = VALUES(description),
         items = VALUES(items),
         estimasiWaktu = VALUES(estimasiWaktu),
         garansi = VALUES(garansi)`,
        [bundle.id, bundle.name, bundle.description, bundle.icon, bundle.items, bundle.estimasiWaktu, bundle.garansi, bundle.sortOrder]
      );
      console.log(`Seeded bundle: ${bundle.name}`);
    } catch (err: any) {
      console.error(`Error seeding ${bundle.name}:`, err.message);
    }
  }

  console.log('Migration complete!');
  process.exit(0);
}

run();
