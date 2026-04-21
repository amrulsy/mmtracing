// ==========================================
// API Response Types
// ==========================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T[];
  pagination: Pagination;
}

// ==========================================
// Auth
// ==========================================

export interface User {
  id: number;
  name: string;
  username: string;
  email: string | null;
  roleId: number;
  roleName: string;
  role?: Role;
}

export interface Role {
  id: number;
  name: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// ==========================================
// Pelanggan
// ==========================================

export interface Pelanggan {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  type: 'kendaraan' | 'bubut' | 'both';
  loyaltyPoints?: number;
  loyaltyTier?: LoyaltyTier | null;
  kendaraan?: Kendaraan[];
  spk?: Spk[];
  _count?: { spk: number };
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Kendaraan
// ==========================================

export interface Kendaraan {
  id: number;
  pelangganId: number;
  name: string;
  plat: string;
  tahun?: string | null;
  warna?: string | null;
  noRangka?: string | null;
  noMesin?: string | null;
  odometer?: number | null;
  pelanggan?: Pelanggan;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Mekanik
// ==========================================

export interface Mekanik {
  id: number;
  name: string;
  phone?: string | null;
  spesialisasi?: string | null;
  status: string;
  spk?: { noSpk: string }[];
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// SPK
// ==========================================

export interface SpkStage {
  id: number;
  spkId: number;
  urutan: number;
  nama: string;
  estimasiBiaya: number;
  durasiHari: number;
  status: 'pending' | 'in_progress' | 'done';
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface SpkPhoto {
  id: number;
  spkId: number;
  url: string;
  caption?: string | null;
  type: 'before' | 'progress' | 'after' | 'lampiran';
  createdAt: string;
}

export interface Spk {
  id: number;
  noSpk: string;
  tanggal: string;
  pelangganId: number;
  kendaraanId?: number | null;
  mekanikId?: number | null;
  createdById: number;
  mode: 'rutin' | 'modifikasi' | 'bubut';
  status: 'antri' | 'dikerjakan' | 'kendala' | 'selesai' | 'dibatalkan';
  keluhan?: string | null;
  judulProyek?: string | null;
  spesifikasi?: string | null;
  // Pricing — sesuai dengan field di DB
  totalHarga: number;
  totalBayar: number;
  minimumDp: number;
  // Progress
  progress: number;
  prioritas: 'rendah' | 'normal' | 'tinggi' | 'urgent';
  catatan?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  estimasiSelesai?: string | null;
  diskon: number;
  createdAt: string;
  updatedAt: string;
  // Relations
  pelanggan?: Pelanggan;
  kendaraan?: Kendaraan | null;
  mekanik?: Mekanik | null;
  createdBy?: { id: number; name: string };
  items?: SpkItem[];
  stages?: SpkStage[];
  photos?: SpkPhoto[];
  pembayaran?: Pembayaran[];
  garansi?: Garansi[];
  _count?: { items: number; photos: number };
}

export interface Garansi {
  id: number;
  spkId: number;
  itemName: string;
  type: 'jasa' | 'part' | 'modif';
  startDate: string;
  endDate: string;
  status: 'aktif' | 'hampir' | 'expired';
  createdAt: string;
}

export interface SpkItem {
  id: number;
  spkId: number;
  type: 'jasa' | 'sparepart';
  jasaId?: number | null;
  sparepartId?: number | null;
  nama: string;
  qty: number;
  hargaSatuan: number;
  subtotal: number;
  status?: 'pending' | 'done';
}

// ==========================================
// Sparepart
// ==========================================

export interface Sparepart {
  id: number;
  kode: string;
  name: string;           // backend: name
  merk?: string | null;   // backend: merk
  kategori?: { id: number, name: string } | null;
  hargaBeli: number;
  hargaJual: number;
  stok: number;
  stokMinimum: number;
  satuan: string;
  lokasi?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Jasa
// ==========================================

export interface Jasa {
  id: number;
  kode: string;
  name: string;
  kategori?: string | null;
  harga: number;
  estimasiWaktu?: string | null;
  garansiHari?: number | null;
  createdAt: string;
  updatedAt: string;
  sparepartBundles?: Array<{
    id: number;
    qtyDefault: number;
    sparepart: Sparepart;
  }>;
}


// ==========================================
// Supplier
// ==========================================

export interface Supplier {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Inventaris
// ==========================================

export interface InventarisLog {
  id: number;
  sparepartId: number;
  supplierId?: number | null;
  type: 'masuk' | 'keluar' | 'opname';
  qty: number;
  hargaSatuan: number;
  totalHarga: number;
  noPo?: string | null;
  keterangan?: string | null;
  sparepart?: Sparepart;
  supplier?: Supplier | null;
  createdAt: string;
}

export interface InventarisSummary {
  totalItem: number;
  nilaiStok: number;
  menipis: number;
  habis: number;
}

// ==========================================
// Pembayaran
// ==========================================

export interface Pembayaran {
  id: number;
  spkId: number;
  noInvoice: string;
  totalTagihan: number;
  totalBayar: number;
  sisaBayar: number;
  sisa?: number;
  status: string;
  jatuhTempo?: string | null;
  spk?: Spk;
  detail?: PembayaranDetail[];
  details?: PembayaranDetail[];
  createdAt: string;
  updatedAt: string;
}

export interface PembayaranDetail {
  id: number;
  pembayaranId: number;
  jumlah: number;
  metode: string;
  tanggal: string;
  keterangan?: string | null;
}

// ==========================================
// Loyalty
// ==========================================

export interface LoyaltyTier {
  id: number;
  name: string;
  minPoints: number;
  discount: number;
}

// ==========================================
// Dashboard
// ==========================================

export interface DashboardKPI {
  spkAntri: number;
  spkDikerjakan: number;
  spkSelesaiHariIni: number;
  spkKendala: number;
  pendapatanHariIni: number;
  pendapatanBulan: number;
  pengeluaranHariIni: number;
  pengeluaranBulan: number;
  stokMenipis: number;
  stokHabis: number;
  pelangganBaru: number;
}

export interface DashboardData {
  kpi: DashboardKPI;
  mekanikAktif: Mekanik[];
  recentSpk: Spk[];
  recentActivity: ActivityLog[];
  distribution?: Record<string, number>;
}

export interface ActivityLog {
  id: number;
  action: string;
  module: string;
  targetId?: number | null;
  targetName?: string | null;
  detail?: string | null;
  userId?: number | null;
  user?: { name: string; username: string };
  createdAt: string;
}
