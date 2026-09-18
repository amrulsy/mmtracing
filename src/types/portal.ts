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
  kendaraan?: Kendaraan[];
}

// ============ Work Order (WO) ============
export interface PortalWO {
  id: number;
  noWo: string;
  status: WOStatus;
  progress: number;
  totalTagihan: string;
  sisaTagihan: string;
  mode: string;
  createdAt: string;
}
export type PortalSPK = PortalWO;

export type WOStatus = "selesai" | "batal" | "dikerjakan" | "kendala" | "antri" | "baru";
export type SPKStatus = WOStatus;

export interface WOStage {
  id: number;
  nama: string;
  status: "selesai" | "dikerjakan" | "pending";
  catatanMekanik: string | null;
}
export type SPKStage = WOStage;

export interface WOItem {
  id: number;
  nama: string;
  type: "jasa" | "sparepart";
  qty: number;
  hargaSatuan: string;
  subtotal: string;
}
export type SPKItem = WOItem;

export interface WOPhoto {
  id: number;
  url: string;
  keterangan: string | null;
}
export type SPKPhoto = WOPhoto;

export interface WOKendaraan {
  name: string;
  plat: string;
}
export type SPKKendaraan = WOKendaraan;

export interface WOMekanik {
  name: string;
}
export type SPKMekanik = WOMekanik;

export interface WOPembayaran {
  publicId: string;
}
export type SPKPembayaran = WOPembayaran;

export interface WODetail {
  id: number;
  noWo: string;
  status: WOStatus;
  progress: number;
  totalHarga: string;
  diskon: string;
  keluhan: string | null;
  createdAt: string;
  updatedAt: string;
  kendaraan: WOKendaraan | null;
  mekanik: WOMekanik | null;
  stages: WOStage[];
  items: WOItem[];
  photos: WOPhoto[];
  pembayaran: WOPembayaran | null;
  estimateApprovalStatus?: "not_required" | "pending" | "approved" | "rejected";
  estimateApprovalNote?: string | null;
  estimateApprovedAt?: string | null;
}
export type SPKDetail = WODetail;

export interface WOReview {
  id: number;
  rating: number;
  comment: string | null;
  tags: string[];
  createdAt: string;
}
export type SPKReview = WOReview;

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
  updatedAt?: string;
  catatan?: string | null;
  alasanPenolakan?: string | null;
  woId?: number | null;
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
  woId?: number;
  noInvoice: string | null;
  publicId: string;
  total: string;
  sudahDibayar: string;
  sisaTagihan: string;
  status: string;
  createdAt: string;
  noWo?: string;
  woStatus?: string;
  details: PembayaranDetail[];
}

// ============ Loyalty ============
export interface LoyaltyData {
  balance: number;
  tier: { id: number; name: string; minPoints?: number } | null;
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
export interface LoyaltyVoucher {
  id: number;
  code: string;
  status: "tersedia" | "digunakan" | "kedaluwarsa" | "dibatalkan";
  expiresAt: string | null;
  usedAt?: string | null;
  rewardName?: string;
  rewardDescription?: string | null;
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
  noWo?: string;
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
  link?: string | null;
  woId?: number | null;
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
