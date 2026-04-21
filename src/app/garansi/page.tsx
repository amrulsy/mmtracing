"use client";

import { useState, useEffect } from "react";
import { Shield, AlertTriangle, CheckCircle, Clock as ClockIcon, XCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/loading-skeleton";

interface Garansi {
  id: number;
  type: string;
  item: string;
  startDate: string;
  endDate: string;
  daysLeft: number;
  computedStatus: string; // 'aktif', 'hampir', 'expired'
  status: string;
  spk?: { noSpk: string; pelanggan?: { name: string }; kendaraan?: { name: string } };
}

interface GaransiClaim {
  id: number;
  reason: string;
  status: string;
  resolution?: string;
  createdAt: string;
  garansi?: { item: string; spk?: { noSpk: string; pelanggan?: { name: string } } };
}

export default function GaransiPage() {
  const [tab, setTab] = useState("aktif");
  const [warranties, setWarranties] = useState<Garansi[]>([]);
  const [claims, setClaims] = useState<GaransiClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<Garansi[]>("/garansi"),
      api.get<GaransiClaim[]>("/garansi/claims")
    ])
      .then(([gRes, cRes]) => {
        setWarranties(gRes.data || []);
        setClaims(cRes.data || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Gagal memuat garansi"))
      .finally(() => setLoading(false));
  }, []);

  const filteredWarranties = tab === "semua" 
    ? warranties 
    : warranties.filter(w => w.computedStatus === tab || (tab === "aktif" && w.computedStatus === "hampir"));

  const typeLabel = (t: string) => {
    switch (t) {
      case "jasa": return { text: "Jasa", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" };
      case "sparepart": return { text: "Part", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
      case "modif": return { text: "Modif", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" };
      default: return { text: t, color: "bg-surface text-muted-foreground border-surface-border" };
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

  if (error) {
    return <div className="glass-panel p-8 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Shield className="text-primary" size={28} /> Manajemen Garansi
        </h1>
        <p className="text-muted-foreground">Track garansi jasa & sparepart. Alert otomatis jika masa garansi hampir habis.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Garansi Aktif", value: warranties.filter(w => w.computedStatus === "aktif" || w.computedStatus === "hampir").length, icon: Shield, color: "text-emerald-500" },
          { label: "Hampir Expired", value: warranties.filter(w => w.computedStatus === "hampir").length, icon: AlertTriangle, color: "text-amber-500" },
          { label: "Claim Aktif", value: claims.filter(c => c.status !== "selesai").length, icon: ClockIcon, color: "text-primary" },
          { label: "Claim Selesai", value: claims.filter(c => c.status === "selesai").length, icon: CheckCircle, color: "text-blue-500" },
        ].map((s, i) => (
          <div key={i} className="glass-panel p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-surface-hover flex items-center justify-center ${s.color}`}><s.icon size={20} /></div>
            <div>
              <p className={`text-2xl font-bold ${s.color}`}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : s.value}
              </p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto bg-surface-hover rounded-xl border border-surface-border p-1">
        {[
          { key: "aktif", label: "Aktif" },
          { key: "hampir", label: "⚠️ Hampir Expired" },
          { key: "expired", label: "Expired" },
          { key: "semua", label: "Semua Garansi" },
          { key: "claim", label: "🛡️ Daftar Claim" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${tab === t.key ? "bg-background shadow text-foreground border border-surface-border" : "text-muted-foreground hover:bg-surface"}`}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" />
        </div>
      ) : tab !== "claim" ? (
        <div className="space-y-2">
          {filteredWarranties.length === 0 ? (
            <div className="glass-panel p-8 text-center text-muted-foreground">Tidak ada data garansi</div>
          ) : filteredWarranties.map((w) => {
            const tl = typeLabel(w.type);
            return (
              <div key={w.id} className={`glass-panel p-4 flex items-center gap-4 hover:shadow-sm transition-shadow ${w.computedStatus === "hampir" ? "border-l-4 border-l-amber-500" : w.computedStatus === "expired" ? "opacity-50" : ""}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${w.computedStatus === "expired" ? "bg-red-500/10" : w.computedStatus === "hampir" ? "bg-amber-500/10" : "bg-emerald-500/10"}`}>
                  {w.computedStatus === "expired" ? <XCircle size={20} className="text-red-500" /> : w.computedStatus === "hampir" ? <AlertTriangle size={20} className="text-amber-500" /> : <Shield size={20} className="text-emerald-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{w.item}</p>
                  <p className="text-[10px] text-muted-foreground">{w.spk?.noSpk || "—"} • {w.spk?.pelanggan?.name || "—"} • {w.spk?.kendaraan?.name || "—"}</p>
                  <p className="text-[10px] text-muted-foreground">{formatDate(w.startDate)} → {formatDate(w.endDate)}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tl.color}`}>{tl.text}</span>
                <div className="text-right shrink-0">
                  {w.computedStatus === "expired" ? (
                    <p className="text-xs font-bold text-red-500">Expired</p>
                  ) : (
                    <p className={`text-sm font-bold ${w.daysLeft <= 7 ? "text-amber-500" : "text-emerald-600"}`}>{w.daysLeft} hari</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">sisa</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Claim List */
        <div className="space-y-3">
          {claims.length === 0 ? (
            <div className="glass-panel p-8 text-center text-muted-foreground">Tidak ada riwayat klaim</div>
          ) : claims.map((c) => (
            <div key={c.id} className={`glass-panel p-5 ${c.status !== "selesai" ? "border-l-4 border-l-primary" : ""}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold">{c.garansi?.item || "—"}</p>
                  <p className="text-xs text-muted-foreground">{c.garansi?.spk?.noSpk} • {c.garansi?.spk?.pelanggan?.name} • Klaim: {formatDate(c.createdAt)}</p>
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${c.status !== "selesai" ? "bg-primary/10 text-primary border-primary/20" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"}`}>{c.status}</span>
              </div>
              <div className="bg-surface-hover/30 rounded-lg p-3 text-sm">
                <p className="text-xs text-muted-foreground font-medium mb-1">Alasan Claim:</p>
                <p className="text-sm">{c.reason}</p>
              </div>
              {c.resolution && (
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3 mt-2">
                  <p className="text-xs text-emerald-600 font-medium mb-1">Resolusi:</p>
                  <p className="text-sm">{c.resolution}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
