"use client";

import type { Spk } from "@/lib/types";
import { Receipt, CheckCircle2, Wallet, Activity } from "lucide-react";

const fmt = (n: number) => `Rp ${Number(n).toLocaleString("id-ID")}`;

interface SpkKpiCardsProps {
 spk: Spk;
 sisaBayar: number;
 displayProgress: number;
}

export function SpkKpiCards({ spk, sisaBayar, displayProgress }: SpkKpiCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="glass-panel p-3 lg:p-4 flex items-center gap-3 relative overflow-hidden">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Receipt size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] lg:text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5 truncate">Total Harga</p>
          <p className="text-xl lg:text-2xl font-black font-mono leading-none text-primary">{fmt(Number(spk.totalHarga))}</p>
          {Number(spk.diskon) > 0 && <p className="text-[10px] text-emerald-500 mt-1 truncate">Diskon: {fmt(Number(spk.diskon))}</p>}
        </div>
      </div>
      <div className="glass-panel p-3 lg:p-4 flex items-center gap-3 relative overflow-hidden">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
          <CheckCircle2 size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] lg:text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5 truncate">Sudah Dibayar</p>
          <p className="text-xl lg:text-2xl font-black font-mono leading-none text-emerald-500">{fmt(Number(spk.totalBayar))}</p>
        </div>
      </div>
      <div className="glass-panel p-3 lg:p-4 flex items-center gap-3 relative overflow-hidden">
        <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
          <Wallet size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] lg:text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5 truncate">Sisa Tagihan</p>
          <p className={`text-xl lg:text-2xl font-black font-mono leading-none ${Number(sisaBayar) > 0 ? "text-red-500" : "text-emerald-500"}`}>{fmt(Number(sisaBayar))}</p>
        </div>
      </div>
      <div className="glass-panel p-3 lg:p-4 flex items-center gap-3 relative overflow-hidden">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
          <Activity size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] lg:text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5 truncate">Progress</p>
          <p className="text-xl lg:text-2xl font-black font-mono leading-none">{displayProgress}%</p>
          <div className="h-1.5 bg-surface-border rounded-full mt-2 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${displayProgress === 100 ? "bg-emerald-500" : "bg-blue-500"}`} style={{ width: `${displayProgress}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
