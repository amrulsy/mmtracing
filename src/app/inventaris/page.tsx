"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Package, AlertTriangle, XCircle, TrendingUp, ArrowDownToLine, ClipboardList, Search } from "lucide-react";
import { api } from "@/lib/api";
import type { InventarisSummary, InventarisLog, Sparepart } from "@/lib/types";
import { CardSkeleton, ListSkeleton, Skeleton } from "@/components/ui/loading-skeleton";

export default function InventarisPage() {
  const [summary, setSummary] = useState<InventarisSummary | null>(null);
  const [stokMenipis, setStokMenipis] = useState<Sparepart[]>([]);
  const [recentLogs, setRecentLogs] = useState<InventarisLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.get<InventarisSummary>("/inventaris/summary"),
      api.getPaginated<InventarisLog>("/inventaris", { limit: 5 }),
      api.getPaginated<Sparepart>("/sparepart", { limit: 100 }),
    ])
      .then(([summaryRes, logsRes, sparepartRes]) => {
        setSummary(summaryRes.data);
        setRecentLogs(logsRes.data);
        // Filter items where stok <= stokMinimum and stok > 0
        const menipis = sparepartRes.data.filter(s => s.stok > 0 && s.stok <= s.stokMinimum);
        setStokMenipis(menipis);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const formatRp = (n: number) => {
    if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`;
    return `Rp ${n.toLocaleString("id-ID")}`;
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short" });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 animate-in fade-in duration-500">
        <AlertTriangle size={32} className="text-red-500" />
        <p className="text-muted-foreground text-sm">{error}</p>
        <button onClick={() => window.location.reload()} className="text-primary text-sm font-medium hover:underline">Coba lagi</button>
      </div>
    );
  }

  if (loading || !summary) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <div className="space-y-2"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-72" /></div>
          <div className="flex gap-2"><Skeleton className="h-10 w-28" /><Skeleton className="h-10 w-28" /></div>
        </div>
        <CardSkeleton count={4} />
        <div className="glass-panel p-6"><ListSkeleton count={5} /></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Inventaris & Stok</h1>
          <p className="text-muted-foreground">Pantau stok real-time, barang masuk/keluar, dan opname.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/inventaris/masuk" className="flex items-center gap-2 text-sm bg-surface border border-surface-border px-3 py-2 rounded-xl hover:bg-surface-hover font-medium">
            <ArrowDownToLine size={16} /> Stok Masuk
          </Link>
          <Link href="/inventaris/opname" className="flex items-center gap-2 text-sm bg-surface border border-surface-border px-3 py-2 rounded-xl hover:bg-surface-hover font-medium">
            <ClipboardList size={16} /> Stok Opname
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Item Terdaftar", value: String(summary.totalItem), icon: Package, color: "" },
          { label: "Total Nilai Stok", value: formatRp(summary.nilaiStok), icon: TrendingUp, color: "text-primary" },
          { label: "Stok Menipis", value: `${summary.menipis} item`, icon: AlertTriangle, color: "text-amber-500" },
          { label: "Stok Habis", value: `${summary.habis} item`, icon: XCircle, color: "text-red-500" },
        ].map((s, i) => (
          <div key={i} className="glass-panel p-4 flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl bg-surface-hover flex items-center justify-center shrink-0 ${s.color}`}>
              <s.icon size={20} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
              <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Stok Menipis Alert */}
      {stokMenipis.length > 0 && (
        <div className="glass-panel p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-amber-600 dark:text-amber-500 mb-4 flex items-center gap-2">
            <AlertTriangle size={16} /> Stok Menipis — Perlu Restock
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {stokMenipis.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                  <AlertTriangle size={16} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">Sisa: <span className="text-amber-600 font-bold">{item.stok}</span> / Min: {item.stokMinimum}</p>
                </div>
                <span className="text-xs font-mono font-medium text-muted-foreground">{formatRp(Number(item.hargaJual))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-panel p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">📥 Stok Masuk Terakhir</h3>
          <div className="space-y-2">
            {recentLogs.filter(l => l.type === "masuk").length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Belum ada data stok masuk</p>
            ) : (
              recentLogs.filter(l => l.type === "masuk").map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-xl border border-surface-border hover:bg-surface-hover/30 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{log.supplier?.name || "—"}</p>
                    <p className="text-[10px] text-muted-foreground">{formatDate(log.createdAt)} • {log.noPo || "—"} • {log.qty} {log.sparepart?.satuan || "pcs"}</p>
                  </div>
                  <span className="text-sm font-bold font-mono text-emerald-600">{formatRp(log.totalHarga)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-panel p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">📤 Stok Keluar Terakhir</h3>
          <div className="space-y-2">
            {recentLogs.filter(l => l.type === "keluar").length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Belum ada data stok keluar</p>
            ) : (
              recentLogs.filter(l => l.type === "keluar").map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-xl border border-surface-border hover:bg-surface-hover/30 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{log.sparepart?.name || "—"}</p>
                    <p className="text-[10px] text-muted-foreground">{formatDate(log.createdAt)} • {log.qty} {log.sparepart?.satuan || "pcs"}</p>
                  </div>
                  <span className="text-sm font-bold font-mono text-red-500">{formatRp(log.totalHarga)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
