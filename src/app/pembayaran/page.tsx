"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Receipt, CreditCard, Eye, ChevronRight, AlertTriangle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { Pembayaran, Pagination } from "@/lib/types";
import { Skeleton, TableRowSkeleton } from "@/components/ui/loading-skeleton";

interface PembayaranSummary {
  menunggu: { total: number; count: number };
  hariIni: { total: number; count: number };
  bulanIni: number;
}

export default function PembayaranPage() {
  const [tab, setTab] = useState("semua");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [invoices, setInvoices] = useState<Pembayaran[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [summary, setSummary] = useState<PembayaranSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { setPage(1); }, [tab, searchDebounced]);

  // Load summary
  useEffect(() => {
    api.get<PembayaranSummary>("/pembayaran/summary")
      .then((res) => setSummary(res.data))
      .catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (tab !== "semua") params.status = tab;
      if (searchDebounced) params.search = searchDebounced;
      const res = await api.getPaginated<Pembayaran>("/pembayaran", params);
      setInvoices(res.data);
      setPagination(res.pagination);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [tab, searchDebounced, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatRp = (n: number) => {
    if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`;
    return `Rp ${n.toLocaleString("id-ID")}`;
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

  const statusStyle = (s: string) => {
    switch (s.toLowerCase()) {
      case "lunas": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "parsial": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      default: return "bg-primary/10 text-primary border-primary/20";
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 animate-in fade-in duration-500">
        <AlertTriangle size={32} className="text-red-500" />
        <p className="text-muted-foreground text-sm">{error}</p>
        <button onClick={() => window.location.reload()} className="text-primary text-sm font-medium hover:underline">Coba lagi</button>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Pembayaran & Invoice</h1>
        <p className="text-muted-foreground text-sm">Manajemen tagihan, Down Payment (DP), dan pencetakan kwitansi.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 lg:gap-4">
        {summary ? (
          <>
            <div className="glass-panel p-3 lg:p-5 border-l-4 border-l-primary/80">
              <p className="text-[10px] lg:text-sm font-medium text-muted-foreground">Menunggu</p>
              <p className="text-lg lg:text-2xl font-bold mt-0.5">{formatRp(summary.menunggu.total)}</p>
              <p className="text-[10px] text-muted-foreground hidden sm:block">{summary.menunggu.count} Invoice</p>
            </div>
            <div className="glass-panel p-3 lg:p-5 border-l-4 border-l-emerald-500/80">
              <p className="text-[10px] lg:text-sm font-medium text-muted-foreground">Hari Ini</p>
              <p className="text-lg lg:text-2xl font-bold mt-0.5">{formatRp(summary.hariIni.total)}</p>
              <p className="text-[10px] text-muted-foreground hidden sm:block">{summary.hariIni.count} Transaksi</p>
            </div>
            <div className="glass-panel p-3 lg:p-5 border-l-4 border-l-amber-500/80">
              <p className="text-[10px] lg:text-sm font-medium text-muted-foreground">Bulan Ini</p>
              <p className="text-lg lg:text-2xl font-bold mt-0.5">{formatRp(summary.bulanIni)}</p>
              <p className="text-[10px] text-muted-foreground hidden sm:block">Total pendapatan</p>
            </div>
          </>
        ) : (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-panel p-5 space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-7 w-24" /></div>
          ))
        )}
      </div>

      {/* Tabs + Search */}
      <div className="glass-panel p-3 space-y-2">
        <div className="flex gap-1 overflow-x-auto">
          {[{ k: "semua", l: "Semua" }, { k: "belum_bayar", l: "Belum Bayar" }, { k: "parsial", l: "Parsial" }, { k: "lunas", l: "Lunas" }].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${tab === t.k ? "bg-primary text-white shadow-sm" : "text-muted-foreground border border-surface-border hover:bg-surface-hover"}`}>{t.l}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-background px-3 py-2 rounded-lg border border-surface-border focus-within:ring-1 focus-within:ring-primary">
          <Search size={16} className="text-muted-foreground shrink-0" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari invoice, SPK, pelanggan..." className="bg-transparent border-none focus:outline-none text-sm w-full" />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-surface-hover/50 border-b border-surface-border">
              <tr>
                <th className="px-6 py-4 font-semibold">Invoice / Tgl</th>
                <th className="px-6 py-4 font-semibold">SPK / Pelanggan</th>
                <th className="px-6 py-4 font-semibold">Total</th>
                <th className="px-6 py-4 font-semibold">Dibayar</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {loading ? (
                <TableRowSkeleton count={5} />
              ) : invoices.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">Tidak ada data pembayaran</td></tr>
              ) : (
                invoices.map((item) => {
                  const sisa = item.sisa || 0;
                  return (
                    <tr key={item.id} className="bg-surface hover:bg-surface-hover/50 transition-colors">
                      <td className="px-6 py-4"><div className="font-semibold font-mono text-primary">{item.noInvoice}</div><div className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</div></td>
                      <td className="px-6 py-4 text-xs">{item.spk?.noSpk || "—"} • {item.spk?.pelanggan?.name || "—"}</td>
                      <td className="px-6 py-4 font-medium font-mono">{formatRp(item.totalTagihan)}</td>
                      <td className="px-6 py-4 text-xs flex items-center gap-1.5">
                        {item.status === "lunas" ? <Receipt size={14} className="text-emerald-500" /> : <CreditCard size={14} className="text-muted-foreground" />}
                        {formatRp(item.totalBayar)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${statusStyle(item.status)}`}>{item.status}</span>
                        {sisa > 0 && <span className="block text-xs font-semibold text-primary mt-1">Sisa: {formatRp(sisa)}</span>}
                        {item.status !== "lunas" && item.jatuhTempo && (() => {
                          const jt = new Date(item.jatuhTempo);
                          const now = new Date();
                          const daysLeft = Math.ceil((jt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                          if (daysLeft <= 7) {
                            return (
                              <span className={`block text-[9px] mt-1 font-semibold ${daysLeft < 0 ? "text-red-500" : daysLeft <= 2 ? "text-amber-600" : "text-muted-foreground"}`}>
                                {daysLeft < 0 ? `⚠️ Lewat ${Math.abs(daysLeft)} hari` : daysLeft === 0 ? "⏰ Jatuh tempo hari ini" : `📅 ${daysLeft} hari lagi`}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {item.status !== "lunas" && (
                          <Link href={`/pembayaran/${item.id}`} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-white shadow-sm hover:shadow-glossy-primary">Bayar</Link>
                        )}
                        <Link href={`/pembayaran/${item.id}`} className="p-1.5 text-muted-foreground hover:text-foreground border border-surface-border rounded-lg inline-block" title="Lihat Detail"><Eye size={16} /></Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List */}
      <div className="lg:hidden space-y-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-panel p-4 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48" /><Skeleton className="h-6 w-24" /></div>
          ))
        ) : invoices.length === 0 ? (
          <div className="glass-panel p-8 text-center text-muted-foreground text-sm">Tidak ada data pembayaran</div>
        ) : (
          invoices.map((item) => (
            <Link key={item.id} href={`/pembayaran/${item.id}`} className="glass-panel p-4 space-y-2 block">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-mono text-sm font-bold text-primary">{item.noInvoice}</p>
                  <p className="text-[10px] text-muted-foreground">{formatDate(item.createdAt)} • {item.spk?.noSpk} • {item.spk?.pelanggan?.name || "—"}</p>
                </div>
                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${statusStyle(item.status)}`}>{item.status}</span>
              </div>
              <div className="flex justify-between items-end pt-2 border-t border-surface-border">
                <div>
                  <p className="text-[10px] text-muted-foreground">Total</p>
                  <p className="font-bold font-mono">{formatRp(item.totalTagihan)}</p>
                </div>
                {(item.sisa ?? 0) > 0 && (
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">Sisa</p>
                    <p className="text-sm font-bold text-primary font-mono">{formatRp(item.sisa ?? 0)}</p>
                  </div>
                )}
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="text-xs">
            {((page - 1) * pagination.limit) + 1}-{Math.min(page * pagination.limit, pagination.total)} dari {pagination.total}
          </span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!pagination.hasPrev} className="px-3 py-1 rounded border border-surface-border bg-surface hover:bg-surface-hover text-xs disabled:opacity-50">←</button>
            {Array.from({ length: Math.min(pagination.totalPages, 5) }).map((_, i) => {
              const startPage = Math.max(1, Math.min(page - 2, pagination.totalPages - 4));
              const pageNum = startPage + i;
              if (pageNum > pagination.totalPages) return null;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`px-3 py-1 rounded border text-xs ${page === pageNum ? "border-primary bg-primary text-white" : "border-surface-border bg-surface hover:bg-surface-hover"}`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={!pagination.hasNext} className="px-3 py-1 rounded border border-surface-border bg-surface hover:bg-surface-hover text-xs disabled:opacity-50">→</button>
          </div>
        </div>
      )}
    </div>
  );
}
