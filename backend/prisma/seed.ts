import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ===== ROLES =====
  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: { name: 'Admin', description: 'Full access ke semua fitur', permissions: ['*'] },
  });
  const saRole = await prisma.role.upsert({
    where: { name: 'Service Advisor' },
    update: {},
    create: { name: 'Service Advisor', description: 'Kelola SPK, pelanggan, dan pembayaran', permissions: ['spk', 'pelanggan', 'pembayaran', 'kendaraan', 'jadwal'] },
  });
  const mekanikRole = await prisma.role.upsert({
    where: { name: 'Mekanik' },
    update: {},
    create: { name: 'Mekanik', description: 'Update progress SPK dan monitoring', permissions: ['monitoring', 'spk.update'] },
  });
  console.log('✅ Roles created');

  // ===== USERS =====
  const password = await bcrypt.hash('admin123', 12);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: { name: 'Pak Budi (Owner)', username: 'admin', email: 'admin@mmtracing.com', password, roleId: adminRole.id, status: 'aktif' },
  });
  await prisma.user.upsert({
    where: { username: 'rina_sa' },
    update: {},
    create: { name: 'Mbak Rina', username: 'rina_sa', password, roleId: saRole.id, status: 'aktif' },
  });
  await prisma.user.upsert({
    where: { username: 'agus_mech' },
    update: {},
    create: { name: 'Mas Agus', username: 'agus_mech', password, roleId: mekanikRole.id, status: 'aktif' },
  });
  console.log('✅ Users created (password: admin123)');

  // ===== LOYALTY TIERS =====
  const bronze = await prisma.loyaltyTier.upsert({ where: { name: 'Bronze' }, update: {}, create: { name: 'Bronze', minPoints: 0, maxPoints: 999, benefits: 'Gratis check-up 1x/bulan' } });
  const silver = await prisma.loyaltyTier.upsert({ where: { name: 'Silver' }, update: {}, create: { name: 'Silver', minPoints: 1000, maxPoints: 4999, benefits: 'Diskon 5% semua servis + Gratis ganti oli filter' } });
  const gold = await prisma.loyaltyTier.upsert({ where: { name: 'Gold' }, update: {}, create: { name: 'Gold', minPoints: 5000, benefits: 'Diskon 10% + Prioritas antrian + Gratis tune up 2x/tahun' } });
  console.log('✅ Loyalty tiers created');

  // ===== LOYALTY REWARDS =====
  const rewards = [
    { name: 'Gratis Ganti Oli + Filter', pointsCost: 200, stock: 12 },
    { name: 'Diskon 15% Servis Besar', pointsCost: 350, stock: 8 },
    { name: 'Gratis Tune Up Full', pointsCost: 500, stock: 5 },
    { name: 'Gratis Servis CVT Lengkap', pointsCost: 750, stock: 3 },
    { name: 'Voucher Modifikasi Rp 500.000', pointsCost: 2000, stock: 2 },
  ];
  for (const r of rewards) {
    await prisma.loyaltyReward.create({ data: r });
  }
  console.log('✅ Loyalty rewards created');

  // ===== MEKANIK =====
  const mekaniks = [
    { name: 'Agus Prayogo', phone: '0813-5555-6666', spesialisasi: 'Motor & Modifikasi', initial: 'AG', color: 'bg-emerald-500', rating: 4.8, totalSpk: 142, avgTime: '48 mnt' },
    { name: 'Budi Hermawan', phone: '0812-7777-8888', spesialisasi: 'Servis Rutin Motor & Mobil', initial: 'BD', color: 'bg-blue-500', rating: 4.9, totalSpk: 280, avgTime: '35 mnt' },
    { name: 'Toni Kusuma', phone: '0811-9999-0000', spesialisasi: 'Welder / Jasa Bubut', initial: 'TK', color: 'bg-purple-500', rating: 4.7, totalSpk: 85, avgTime: '3.2 hari' },
    { name: 'Rizal Mahendra', spesialisasi: 'Elektronikal & Kelistrikan', initial: 'RM', color: 'bg-amber-500', status: 'off', rating: 4.5, totalSpk: 98, avgTime: '40 mnt' },
    { name: 'Fajar Aditya', spesialisasi: 'Servis Rutin Motor', initial: 'FA', color: 'bg-rose-500', rating: 4.3, totalSpk: 65, avgTime: '42 mnt' },
  ];
  for (const m of mekaniks) {
    await prisma.mekanik.create({ data: m });
  }
  console.log('✅ Mekanik created');

  // ===== SUPPLIERS =====
  await prisma.supplier.create({ data: { name: 'Toko AHM Jogja', phone: '0274-512345', address: 'Jl. Solo Km 5, Yogyakarta' } });
  await prisma.supplier.create({ data: { name: 'Daytona Store', phone: '0274-567890', address: 'Jl. Magelang, Yogyakarta' } });
  console.log('✅ Suppliers created');

  // ===== KATEGORI SPAREPART =====
  const cats = ['Oli', 'Filter', 'Busi', 'Rem', 'CVT', 'Bearing', 'Coolant', 'Kelistrikan', 'Body', 'Lainnya'];
  const catMap: Record<string, number> = {};
  for (const c of cats) {
    const cat = await prisma.kategoriSparepart.upsert({
      where: { name: c },
      update: {},
      create: { name: c },
    });
    catMap[c] = cat.id;
  }
  console.log('✅ Kategori sparepart created');

  // ===== SPAREPART =====
  const parts = [
    { kode: 'SP-001', name: 'Oli Mesin Yamalube 10W-40', merk: 'Yamaha', kategoriId: catMap['Oli'], hargaBeli: 52000, hargaJual: 85000, stok: 24, stokMinimum: 10 },
    { kode: 'SP-002', name: 'Oli CVT Yamalube', merk: 'Yamaha', kategoriId: catMap['Oli'], hargaBeli: 28000, hargaJual: 45000, stok: 18, stokMinimum: 10 },
    { kode: 'SP-003', name: 'Filter Oli Honda Genuine', merk: 'Honda', kategoriId: catMap['Filter'], hargaBeli: 18000, hargaJual: 35000, stok: 32, stokMinimum: 15 },
    { kode: 'SP-004', name: 'Busi NGK Iridium CR8EIX', merk: 'NGK', kategoriId: catMap['Busi'], hargaBeli: 55000, hargaJual: 95000, stok: 8, stokMinimum: 10 },
    { kode: 'SP-005', name: 'Kampas Rem Depan Nissin', merk: 'Nissin', kategoriId: catMap['Rem'], hargaBeli: 35000, hargaJual: 65000, stok: 3, stokMinimum: 5 },
    { kode: 'SP-006', name: 'V-Belt KVB Daytona', merk: 'Daytona', kategoriId: catMap['CVT'], hargaBeli: 85000, hargaJual: 150000, stok: 6, stokMinimum: 4 },
    { kode: 'SP-007', name: 'Bearing 6301 2RS', merk: 'NTN', kategoriId: catMap['Bearing'], hargaBeli: 25000, hargaJual: 50000, stok: 20, stokMinimum: 8 },
    { kode: 'SP-008', name: 'Cairan Coolant 500ml', merk: 'Prestone', kategoriId: catMap['Coolant'], hargaBeli: 22000, hargaJual: 40000, stok: 15, stokMinimum: 5 },
  ];
  for (const p of parts) {
    await prisma.sparepart.create({ data: p });
  }
  console.log('✅ Sparepart created');

  // ===== JASA =====
  const jasaList = [
    { kode: 'JSA-001', name: 'Ganti Oli Mesin', kategori: 'Servis Rutin', harga: 25000, estimasiWaktu: '15 mnt', garansiHari: 30 },
    { kode: 'JSA-002', name: 'Tune Up Full', kategori: 'Servis Rutin', harga: 85000, estimasiWaktu: '45 mnt', garansiHari: 30 },
    { kode: 'JSA-003', name: 'Servis CVT Lengkap', kategori: 'Servis Rutin', harga: 150000, estimasiWaktu: '1 jam', garansiHari: 30 },
    { kode: 'JSA-004', name: 'Ganti Kampas Rem', kategori: 'Servis Rutin', harga: 30000, estimasiWaktu: '20 mnt', garansiHari: 30 },
    { kode: 'JSA-005', name: 'Ganti Busi', kategori: 'Servis Rutin', harga: 15000, estimasiWaktu: '10 mnt', garansiHari: 30 },
    { kode: 'JSA-006', name: 'Servis Besar', kategori: 'Servis Besar', harga: 250000, estimasiWaktu: '2 jam', garansiHari: 30 },
    { kode: 'JSA-007', name: 'Balancing Roda', kategori: 'Lainnya', harga: 50000, estimasiWaktu: '30 mnt', garansiHari: 7 },
  ];
  for (const j of jasaList) {
    await prisma.jasa.create({ data: j });
  }
  console.log('✅ Jasa created');

  // ===== KATEGORI PENGELUARAN =====
  const expCats = ['Sewa Tempat', 'Listrik', 'Internet & Telepon', 'Air PDAM', 'Gaji Karyawan', 'Lain-lain'];
  for (const c of expCats) {
    await prisma.kategoriPengeluaran.upsert({
      where: { name: c },
      update: {},
      create: { name: c },
    });
  }
  console.log('✅ Kategori pengeluaran created');

  // ===== PELANGGAN & KENDARAAN =====
  const plg1 = await prisma.pelanggan.create({
    data: {
      name: 'Budi Santoso', phone: '0812-3456-7890', email: 'budi@email.com', type: 'kendaraan', totalTrx: 12500000, loyaltyTierId: gold.id,
      kendaraan: { create: [
        { name: 'Honda Vario 150', plat: 'AB 1234 CD', tahun: '2020', warna: 'Hitam Doff', odometer: 24500 },
        { name: 'Toyota Avanza', plat: 'B 7777 XX', tahun: '2018', warna: 'Putih' },
      ] },
    },
  });
  const plg2 = await prisma.pelanggan.create({
    data: {
      name: 'Doni Pratama', phone: '0812-9876-5432', type: 'kendaraan', totalTrx: 3200000, loyaltyTierId: silver.id,
      kendaraan: { create: [
        { name: 'Yamaha NMAX 155', plat: 'D 4567 EF', tahun: '2023', warna: 'Hitam' },
      ] },
    },
  });
  const plg3 = await prisma.pelanggan.create({
    data: {
      name: 'Siti Rahma', phone: '0812-1111-2222', type: 'kendaraan', totalTrx: 1800000, loyaltyTierId: bronze.id,
      kendaraan: { create: [
        { name: 'Honda Beat', plat: 'B 5678 GH', tahun: '2021', warna: 'Merah' },
      ] },
    },
  });
  await prisma.pelanggan.create({
    data: { name: 'PT Maju Jaya Teknik', phone: '0274-567890', email: 'maju.jaya@mail.com', type: 'bubut', totalTrx: 8700000, loyaltyTierId: gold.id },
  });
  await prisma.pelanggan.create({
    data: {
      name: 'Reza Kurniawan', phone: '0811-2233-4455', type: 'both', totalTrx: 5300000, loyaltyTierId: gold.id,
      kendaraan: { create: [
        { name: 'Honda CBR 150R', plat: 'D 3456 GH', tahun: '2023', warna: 'Merah' },
      ] },
    },
  });
  console.log('✅ Pelanggan & kendaraan created');

  // ===== SETTINGS (Bengkel Profile) =====
  const settings = [
    { key: 'bengkel_nama', value: 'Bengkel MM Tracing', group: 'bengkel' },
    { key: 'bengkel_phone', value: '0274-123456', group: 'bengkel' },
    { key: 'bengkel_alamat', value: 'Jl. Kaliurang Km 10, Yogyakarta', group: 'bengkel' },
    { key: 'bengkel_email', value: 'info@mmtracing.com', group: 'bengkel' },
    { key: 'garansi_jasa_hari', value: '30', group: 'general' },
    { key: 'garansi_part_hari', value: '180', group: 'general' },
    { key: 'garansi_modif_hari', value: '90', group: 'general' },
    { key: 'dp_minimum_persen', value: '40', group: 'general' },
    { key: 'loyalty_poin_per_10rb', value: '1', group: 'general' },
  ];
  for (const s of settings) {
    await prisma.setting.create({ data: s });
  }
  console.log('✅ Settings created');

  console.log('\n🎉 Seed completed successfully!');
  console.log('📝 Admin login: username=admin, password=admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
