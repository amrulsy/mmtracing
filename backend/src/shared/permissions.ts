/**
 * Single source of truth for all permission modules in the system.
 * Used by both backend middleware and frontend role management UI.
 */
export const PERMISSION_MODULES = [
  { key: 'dashboard',   label: 'Dashboard',       description: 'Halaman utama & KPI' },
  { key: 'master',      label: 'Master Data',      description: 'Pelanggan, Kendaraan, Mekanik, Jasa, Sparepart, Supplier' },
  { key: 'spk',         label: 'SPK',              description: 'Surat Perintah Kerja' },
  { key: 'monitoring',  label: 'Monitoring',       description: 'Monitoring pekerjaan bengkel' },
  { key: 'inventaris',  label: 'Inventaris',       description: 'Stok masuk/keluar, opname, retur' },
  { key: 'pembayaran',  label: 'Pembayaran',       description: 'Invoice, pembayaran, refund' },
  { key: 'pengeluaran', label: 'Pengeluaran',      description: 'Pencatatan pengeluaran operasional' },
  { key: 'booking',     label: 'Booking',          description: 'Manajemen booking servis' },
  { key: 'garansi',     label: 'Garansi',          description: 'Garansi pekerjaan & sparepart' },
  { key: 'jadwal',      label: 'Jadwal',           description: 'Penjadwalan mekanik' },
  { key: 'loyalty',     label: 'Loyalty',          description: 'Program loyalitas pelanggan' },
  { key: 'laporan',     label: 'Laporan',          description: 'Laporan keuangan & operasional' },
  { key: 'settings',    label: 'Pengaturan',       description: 'User, role, konfigurasi sistem' },
] as const;

export const PERMISSION_MODULE_KEYS = PERMISSION_MODULES.map(m => m.key);

export const PERMISSION_LEVELS = {
  none: 0,
  view: 1,
  edit: 2,
  full: 3,
} as const;

export type PermissionLevel = keyof typeof PERMISSION_LEVELS;
export type PermissionModuleKey = typeof PERMISSION_MODULE_KEYS[number];
