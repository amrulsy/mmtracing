"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Receipt, ExternalLink, Filter, AlertCircle, CheckCircle2 } from "lucide-react";
import { portalFetch, portalLogout } from "@/lib/portalFetch";
import { SkeletonCard } from "@/components/portal/PortalSkeleton";
import { PortalError } from "@/components/portal/PortalError";
import type { Pembayaran } from "@/types/portal";

export default function PembayaranPage() {
  const [data, setData] = useState<Pembayaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("semua");
  const [error, setError] = useState<{ type: "auth" | "network" | "server"; message: string } | null>(null);

  const fetchPembayaran = async () => {
    setError(null);
    try {
      const res = await portalFetch("/api/v1/customer-auth/pembayaran");
      if (res.status === 401 || res.status === 403) { portalLogout(); return; }
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError({ type: "server", message: json.message || "Gagal memuat data pembayaran" });
    } catch {
      setError({ type: "network", message: "Koneksi bermasalah. Periksa internet Anda." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPembayaran(); }, []);

  useEffect(() => {
    if (!loading) {
      const target = window.location.hash;
      if (target) document.querySelector(target)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [loading, data.length]);

  if (loading) {
    return (
      <div className="max-w-sm md:max-w-2xl mx-auto p-4 space-y-4">
        <SkeletonCard height="h-24" />
        <SkeletonCard height="h-32" />
        <SkeletonCard height="h-32" />
      </div>
    );
  }

  if (error && data.length === 0) {
    return (
      <div className="max-w-sm md:max-w-2xl mx-auto p-4">
        <PortalError error={error} onRetry={fetchPembayaran} />
      </div>
    );
  }

  const filteredData = data.filter(item => filter === "semua" || item.status === filter);
  const getTotal = (curr: any) => Number(curr.total ?? curr.totalTagihan ?? 0);
  const getSisa = (curr: any) => Number(curr.sisaTagihan ?? curr.sisaBayar ?? 0);
  const getDibayar = (curr: any) => Number(curr.sudahDibayar ?? (getTotal(curr) - getSisa(curr)));

  const totalTagihan = data.reduce((acc, curr) => acc + getTotal(curr), 0);
  const totalDibayar = data.reduce((acc, curr) => acc + getDibayar(curr), 0);
  const totalSisa = data.reduce((acc, curr) => acc + getSisa(curr), 0);
  const overdueCount = data.filter(d => d.status !== "lunas").length;

  return (
    <div className="max-w-sm md:max-w-2xl mx-auto p-4 space-y-6 pb-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/portal/dashboard" className="p-2.5 bg-surface-hover/50 border border-surface-border hover:bg-surface-hover rounded-xl transition-colors md:hidden">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <Receipt className="text-primary" size={24} /> Riwayat Transaksi
          </h1>
        </div>
        
        <div className="flex items-center gap-2 bg-surface-hover/50 p-1.5 rounded-xl border border-surface-border self-start sm:self-auto">
          <Filter size={14} className="text-muted-foreground ml-2" />
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="bg-transparent text-sm font-semibold outline-none pr-2 py-1 text-foreground cursor-pointer"
          >
            <option value="semua">Semua Status</option>
            <option value="lunas">Lunas</option>
            <option value="belum_bayar">Belum Bayar</option>
            <option value="parsial">Cicilan / Parsial</option>
          </select>
        </div>
      </div>

      {/* Overdue Banner */}
      {overdueCount > 0 && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
          <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-600 dark:text-red-400">
              Anda memiliki {overdueCount} transaksi yang belum diselesaikan
            </p>
            <p className="text-xs text-red-500/70 mt-0.5">
              Total sisa: <strong className="font-mono">Rp {totalSisa.toLocaleString("id-ID")}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-panel p-3">
          <div className="flex items-center gap-1.5 mb-1 text-foreground">
            <Receipt size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Tagihan</span>
          </div>
          <p className="text-xl font-black font-mono truncate" title={`Rp ${totalTagihan.toLocaleString("id-ID")}`}>Rp {(totalTagihan/1000).toLocaleString("id-ID")}k</p>
        </div>
        <div className="glass-panel p-3">
          <div className="flex items-center gap-1.5 mb-1 text-emerald-500">
            <CheckCircle2 size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sudah Dibayar</span>
          </div>
          <p className="text-xl font-black font-mono truncate text-emerald-500" title={`Rp ${totalDibayar.toLocaleString("id-ID")}`}>Rp {(totalDibayar/1000).toLocaleString("id-ID")}k</p>
        </div>
        <div className="glass-panel p-3">
          <div className="flex items-center gap-1.5 mb-1 text-red-500">
            <AlertCircle size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">Sisa Hutang</span>
          </div>
          <p className="text-xl font-black font-mono truncate text-red-500" title={`Rp ${totalSisa.toLocaleString("id-ID")}`}>Rp {(totalSisa/1000).toLocaleString("id-ID")}k</p>
        </div>
      </div>

      <div className="space-y-4">
        {filteredData.length === 0 ? (
          <div className="text-center py-12 glass-panel">
            <Receipt size={56} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-bold">Belum Ada Transaksi</p>
            <p className="text-sm text-muted-foreground">Tidak ada riwayat transaksi</p>
          </div>
        ) : (
          filteredData.map(item => {
                    const isLunas = item.status === "lunas";
                    const isParsial = item.status === "parsial";
                    return (
              <div id={`pembayaran-${item.id}`} key={item.id} className="glass-panel overflow-hidden border border-surface-border/50 transition-all hover:border-surface-border target:ring-2 target:ring-primary/60">
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 justify-between items-start">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-black tracking-tight">{item.noInvoice || "Menunggu Invoice"}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        isLunas ? "bg-emerald-500/10 text-emerald-500" : 
                        isParsial ? "bg-amber-500/10 text-amber-500" : 
                        "bg-red-500/10 text-red-500"
                      }`}>
                        {item.status === "belum_bayar" ? "belum bayar" : item.status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono bg-surface-hover px-1.5 py-0.5 rounded text-[10px]">{item.noWo}</span>
                      <span>•</span>
                      <span>{new Date(item.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
                    </div>
                  </div>
                  
                  <div className="text-left sm:text-right shrink-0 w-full sm:w-auto flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start">
                    <p className="text-lg font-black font-mono">Rp {getTotal(item).toLocaleString("id-ID")}</p>
                    <Link href={`/pub/pembayaran/${item.publicId}/kwitansi`} className="text-xs font-bold text-primary hover:underline flex items-center gap-1 mt-1">
                      Lihat Kwitansi <ExternalLink size={12} />
                    </Link>
                  </div>
                </div>

                {item.details && item.details.length > 0 && (
                  <div className="bg-surface-hover/30 border-t border-surface-border/50 p-4">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Riwayat Cicilan</p>
                    <div className="space-y-1.5">
                      {item.details.map((d, i) => (
                        <div key={d.id} className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground flex items-center gap-2">
                            <span className="w-4 h-4 bg-background rounded-full flex items-center justify-center text-[9px] border border-surface-border">{i+1}</span>
                            {new Date(d.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                            <span className="opacity-50">({d.metode})</span>
                          </span>
                          <span className="font-mono font-medium text-emerald-500">+ Rp {Number(d.jumlah).toLocaleString("id-ID")}</span>
                        </div>
                      ))}
                    </div>
                    {getSisa(item) > 0 && (
                      <div className="flex justify-between items-center text-xs font-bold mt-2 pt-2 border-t border-surface-border/50">
                        <span className="text-red-500">Sisa Hutang</span>
                        <span className="font-mono text-red-500">Rp {getSisa(item).toLocaleString("id-ID")}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
