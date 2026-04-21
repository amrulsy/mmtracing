import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format angka menjadi Rupiah.
 * - mode "compact": Rp 1.5M, Rp 500rb (untuk list/card)
 * - mode "full": Rp 1.500.000 (untuk detail/invoice)
 */
export function formatRupiah(n: number | null | undefined, mode: "compact" | "full" = "full"): string {
  const num = Number(n ?? 0);
  if (mode === "compact") {
    if (num >= 1_000_000_000) return `Rp ${(num / 1_000_000_000).toFixed(1)}B`;
    if (num >= 1_000_000) return `Rp ${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `Rp ${(num / 1_000).toFixed(0)}rb`;
    return `Rp ${num.toLocaleString("id-ID")}`;
  }
  return `Rp ${num.toLocaleString("id-ID")}`;
}

/** Format input string menjadi tampilan Rupiah (1500000 → "1.500.000") */
export function formatCurrencyDisplay(value: string): string {
  const num = value.replace(/\D/g, "");
  if (!num) return "";
  return Number(num).toLocaleString("id-ID");
}

/** Parse masked currency input kembali ke number */
export function parseCurrencyInput(value: string): number {
  return Number(value.replace(/\D/g, "")) || 0;
}

/** Format tanggal ke format Indonesia */
export function formatTanggal(d: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", opts ?? { day: "numeric", month: "short", year: "numeric" });
}

/** Format tanggal + waktu */
export function formatTanggalWaktu(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
