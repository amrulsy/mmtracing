"use client";

import type { Spk } from "@/lib/types";

const fmt = (n: number) => `Rp ${Number(n).toLocaleString("id-ID")}`;

interface SpkKpiCardsProps {
  spk: Spk;
  sisaBayar: number;
  displayProgress: number;
}

export function SpkKpiCards({ spk, sisaBayar, displayProgress }: SpkKpiCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="glass-panel p-4">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Harga</p>
        <p className="text-lg font-bold text-primary mt-1">{fmt(Number(spk.totalHarga))}</p>
        {Number(spk.diskon) > 0 && <p className="text-[10px] text-emerald-500">Diskon: {fmt(Number(spk.diskon))}</p>}
      </div>
      <div className="glass-panel p-4">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sudah Dibayar</p>
        <p className="text-lg font-bold text-emerald-500 mt-1">{fmt(Number(spk.totalBayar))}</p>
      </div>
      <div className="glass-panel p-4">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sisa Tagihan</p>
        <p className={`text-lg font-bold mt-1 ${Number(sisaBayar) > 0 ? "text-red-500" : "text-emerald-500"}`}>{fmt(Number(sisaBayar))}</p>
      </div>
      <div className="glass-panel p-4">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Progress</p>
        <p className="text-lg font-bold mt-1">{displayProgress}%</p>
        <div className="h-1.5 bg-surface-border rounded-full mt-2 overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${displayProgress}%` }} />
        </div>
      </div>
    </div>
  );
}
