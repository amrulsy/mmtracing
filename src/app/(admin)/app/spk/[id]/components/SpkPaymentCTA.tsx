"use client";

import Link from "next/link";
import { Receipt } from "lucide-react";

interface SpkPaymentCTAProps {
  sisaBayar: number;
  pembayaranId?: number | null;
  status: string;
}

const fmt = (n: number) => `Rp ${Number(n).toLocaleString("id-ID")}`;

export function SpkPaymentCTA({ sisaBayar, pembayaranId, status }: SpkPaymentCTAProps) {
  const shouldShow = Number(sisaBayar) > 0 && !!pembayaranId && status !== "dibatalkan";
  if (!shouldShow) return null;

  return (
    <Link
      href={`/app/pembayaran/${pembayaranId}`}
      className="glass-panel p-4 flex items-center justify-between gap-4 border-2 border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
          <Receipt size={18} />
        </div>
        <div>
          <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Sisa Tagihan</p>
          <p className="text-xl font-bold text-amber-900 dark:text-amber-300">{fmt(Number(sisaBayar))}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-amber-500 text-white shadow-glossy-primary">
        Bayar Sekarang
      </div>
    </Link>
  );
}
