"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Plus, FileText, ChevronRight, Hammer, Loader2, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import type { Spk, Pagination } from "@/lib/types";
import { Skeleton, TableRowSkeleton } from "@/components/ui/loading-skeleton";

export default function SpkPage() {
  const [tab, setTab] = useState("semua");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [spks, setSpks] = useState<Spk[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page on filter/search change
  useEffect(() => {
    setPage(1);
  }, [tab, searchDebounced]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (tab !== "semua") params.status = tab;
      if (searchDebounced) params.search = searchDebounced;

      const res = await api.getPaginated<Spk>("/spk", params);
      setSpks(res.data);
      setPagination(res.pagination);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data SPK");
    } finally {
      setLoading(false);
    }
  }, [tab, searchDebounced, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statusStyle = (s: string) => {
    switch (s.toLowerCase()) {
      case "selesai": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "dikerjakan": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "antri": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "kendala": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "dibatalkan": return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
      default: return "bg-surface-hover text-muted-foreground";
    }
  };

  const prioritasIcon = (p: string) => {
    if (p === "urgent") return <AlertTriangle size={12} className="text-red-500" aria-label="Urgent" />;
    if (p === "tinggi") return <AlertTriangle size={12} className="text-amber-500" aria-label="Prioritas Tinggi" />;
    return null;
  };

  const formatRp = (n: number) => {
    if (n >= 1_000_000) {
      const val = n / 1_000_000;
      return `Rp ${val % 1 === 0 ? val.toFixed(0) : val.toFixed(2).replace(/\.?0+$/, "")}M`;
    }
    if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`;
    return `Rp ${n.toLocaleString("id-ID")}`;
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="space-y-4 lg:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
          <AlertTriangle size={18} className="shrink-0" />
          <span>{error}</span>
          <button onClick={() => { setError(""); fetchData(); }} className="ml-auto text-xs font-medium hover:underline">Coba lagi</button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Manajemen SPK</h1>
          <p className="text-muted-foreground text-sm">Kelola Surat Perintah Kerja untuk Servis maupun Modifikasi.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/app/spk/create?mode=bubut" className="flex items-center gap-1.5 text-sm bg-surface border border-surface-border px-3 py-2 rounded-xl font-medium hover:bg-surface-hover">
            <Hammer size={16} /> Bubut Lepas
          </Link>
          <Link href="/app/spk/create" className="flex items-center gap-1.5 btn-glossy bg-primary text-primary-foreground px-3 py-2 rounded-xl text-sm font-medium shadow-glossy-primary hover:shadow-glossy-primary-dark">
            <Plus size={16} /> SPK Baru
          </Link>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="glass-panel p-3 space-y-3">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {["semua", "antri", "dikerjakan", "selesai", "kendala", "dibatalkan"].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${tab === t ? "bg-primary text-white shadow-glossy-primary" : "text-muted-foreground hover:bg-surface-hover border border-surface-border"}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-background px-3 py-2 rounded-lg border border-surface-border focus-within:ring-1 focus-within:ring-primary">
          <Search size={16} className="text-muted-foreground shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari No SPK, pelanggan, kendaraan..."
            className="bg-transparent border-none focus:outline-none text-sm w-full"
          />
          {loading && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-surface-hover/50 border-b border-surface-border">
              <tr>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">No. SPK / Tanggal</th>
                <th className="px-6 py-4 font-semibold">Pelanggan / Kendaraan</th>
                <th className="px-6 py-4 font-semibold">Tipe / Progres</th>
                <th className="px-6 py-4 font-semibold">Total Harga</th>
                <th className="px-6 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableRowSkeleton count={5} />
              ) : spks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    {searchDebounced ? `Tidak ada hasil untuk "${searchDebounced}"` : "Belum ada data SPK"}
                  </td>
                </tr>
              ) : (
                spks.map((spk) => (
                  <tr key={spk.id} className="bg-surface border-b border-surface-border hover:bg-surface-hover/50 transition-colors">
                    <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyle(spk.status)}`}>{spk.status}</span></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-medium">
                        {prioritasIcon(spk.prioritas)}
                        {spk.noSpk}
                      </div>
                      <div className="text-xs text-muted-foreground">{formatDate(spk.createdAt)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{spk.pelanggan?.name || "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {spk.kendaraan ? `${spk.kendaraan.name} (${spk.kendaraan.plat})` : "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mb-1"><FileText size={14} />{spk.mode}</div>
                      {(spk.status === "dikerjakan" || spk.status === "selesai" || spk.status === "kendala") && (
                        <div className="w-24">
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                            <span>Progres</span><span>{spk.status === "selesai" ? 100 : spk.progress ?? 0}%</span>
                          </div>
                          <div className="h-1 bg-surface-border rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${spk.status === "selesai" ? "bg-emerald-500" : spk.status === "kendala" ? "bg-red-500" : "bg-blue-500"}`} style={{ width: `${spk.status === "selesai" ? 100 : spk.progress ?? 0}%` }} />
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {formatRp(Number(spk.totalTagihan ?? (Number(spk.totalHarga) - Number(spk.diskon ?? 0))))}
                      {Number(spk.diskon ?? 0) > 0 && <span className="block text-[10px] text-emerald-500 font-normal">Diskon {formatRp(Number(spk.diskon))}</span>}
                    </td>
                    <td className="px-6 py-4 text-right"><Link href={`/app/spk/${spk.id}`} className="text-primary hover:text-primary-hover font-medium text-sm">Detail</Link></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List */}
      <div className="lg:hidden space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-panel p-4 flex items-center gap-3">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))
        ) : spks.length === 0 ? (
          <div className="glass-panel p-8 text-center text-muted-foreground text-sm">
            {searchDebounced ? `Tidak ada hasil untuk "${searchDebounced}"` : "Belum ada data SPK"}
          </div>
        ) : (
          spks.map((spk) => (
            <Link key={spk.id} href={`/app/spk/${spk.id}`} className="glass-panel p-4 flex items-center gap-3 active:scale-[0.98] transition-transform block">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-muted-foreground">{spk.noSpk}</span>
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${statusStyle(spk.status)}`}>{spk.status}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {prioritasIcon(spk.prioritas)}
                  <p className="font-semibold text-sm truncate">{spk.pelanggan?.name || "—"}</p>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {spk.kendaraan ? `${spk.kendaraan.name}` : "—"} • {spk.mode}
                </p>
                <p className="text-sm font-bold text-primary mt-1">{formatRp(Number(spk.totalTagihan ?? (Number(spk.totalHarga) - Number(spk.diskon ?? 0))))}</p>
              </div>
              <ChevronRight size={18} className="text-muted-foreground shrink-0" />
            </Link>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="text-xs">
            {((page - 1) * pagination.limit) + 1}-{Math.min(page * pagination.limit, pagination.total)} dari {pagination.total} SPK
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={!pagination.hasPrev}
              className="px-3 py-1 rounded border border-surface-border bg-surface hover:bg-surface-hover text-xs disabled:opacity-50"
            >
              ←
            </button>
            {Array.from({ length: Math.min(pagination.totalPages, 5) }).map((_, i) => {
              // Jika halaman aktif misalnya 7 (total > 5), tampilkan halaman 5,6,7,8,9 (ditengah)
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
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={!pagination.hasNext}
              className="px-3 py-1 rounded border border-surface-border bg-surface hover:bg-surface-hover text-xs disabled:opacity-50"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
