/**
 * Portal Type Definitions
 * Centralized type definitions for the customer portal.
 */

// ============ Profile ============
export interface PortalProfile {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  totalTrx: string;
  avatar: string | null;
  createdAt: string;
}

// ============ SPK ============
export interface PortalSPK {
  id: number;
  noSpk: string;
  status: SPKStatus;
  progress: number;
  totalTagihan: string;
  sisaTagihan: string;
  mode: string;
  createdAt: string;
}

export type SPKStatus = "selesai" | "batal" | "dikerjakan" | "kendala" | "antri" | "baru";

export interface SPKStage {
  id: number;
  nama: string;
  status: "selesai" | "dikerjakan" | "pending";
  catatanMekanik: string | null;
}

export interface SPKItem {
  id: number;
  nama: string;
  type: "jasa" | "sparepart";
  qty: number;
  hargaSatuan: string;
  subtotal: string;
}

export interface SPKPhoto {
  id: number;
  url: string;
  keterangan: string | null;
}

export interface SPKKendaraan {
  name: string;
  plat: string;
}

export interface SPKMekanik {
  name: string;
}

export interface SPKPembayaran {
  publicId: string;
}

export interface SPKDetail {
  id: number;
  noSpk: string;
  status: SPKStatus;
  progress: number;
  totalHarga: string;
  diskon: string;
  keluhan: string | null;
  createdAt: string;
  updatedAt: string;
  kendaraan: SPKKendaraan | null;
  mekanik: SPKMekanik | null;
  stages: SPKStage[];
  items: SPKItem[];
  photos: SPKPhoto[];
  pembayaran: SPKPembayaran | null;
}

export interface SPKReview {
  id: number;
  rating: number;
  comment: string | null;
  tags: string[];
  createdAt: string;
}

// ============ Booking ============
export interface PortalBooking {
  id: number;
  jenisKendaraan: string;
  merkTipe: string;
  layanan: string;
  tanggal: string;
  jamPreferensi: string;
  status: string;
  keluhan: string;
  createdAt: string;
}

// ============ Pembayaran ============
export interface PembayaranDetail {
  id: number;
  jumlah: string;
  metode: string;
  createdAt: string;
}

export interface Pembayaran {
  id: number;
  spkId: number;
  noInvoice: string | null;
  publicId: string;
  total: string;
  sudahDibayar: string;
  sisaTagihan: string;
  status: string;
  createdAt: string;
  noSpk: string;
  spkStatus: string;
  details: PembayaranDetail[];
}

// ============ Loyalty ============
export interface LoyaltyData {
  balance: number;
  tier: { id: number; name: string } | null;
  nextTier: { name: string; minPoints: number } | null;
}

export interface LoyaltyReward {
  id: number;
  name: string;
  description: string | null;
  pointsCost: number;
  stock: number;
}

export interface LoyaltyHistory {
  id: number;
  type: "earn" | "redeem";
  points: number;
  description: string;
  createdAt: string;
}

// ============ Garansi ============
export interface GaransiClaim {
  id: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "resolved";
  resolution: string | null;
  createdAt: string;
}

export interface Garansi {
  id: number;
  itemName: string;
  noSpk: string;
  type: string;
  startDate: string;
  endDate: string;
  daysLeft: number;
  computedStatus: "aktif" | "hampir" | "expired";
  claims: GaransiClaim[];
}

// ============ Notifikasi ============
export interface Notifikasi {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

// ============ Kendaraan ============
export interface Kendaraan {
  id: number;
  pelangganId: number;
  name: string;
  plat: string;
  tahun: string | null;
  warna: string | null;
  noRangka: string | null;
  noMesin: string | null;
  odometer: number | null;
  createdAt: string;
  updatedAt: string;
}

// ============ API Response ============
export interface PortalApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

// ============ Status Colors ============
export const STATUS_COLORS: Record<string, string> = {
  selesai: "bg-emerald-500/10 text-emerald-500",
  batal: "bg-red-500/10 text-red-500",
  dikerjakan: "bg-blue-500/10 text-blue-500",
  kendala: "bg-amber-500/10 text-amber-500",
  antri: "bg-surface-hover text-muted-foreground",
  baru: "bg-primary/10 text-primary",
};
