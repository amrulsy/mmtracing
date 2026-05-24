"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Search, Plus, FileText, ChevronRight, Hammer, Loader2, AlertTriangle,
  Wrench, Clock, Flame, Receipt, Filter, X, Calendar, TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Spk, Pagination, Mekanik } from "@/lib/types";
import { Skeleton, TableRowSkeleton } from "@/components/ui/loading-skeleton";
import { formatRupiah, formatTanggal } from "@/lib/utils";

interface SpkStats {
  antri: number;
  dikerjakan: number;
  kendala: number;
  overdue: number;
  pendingPayment: number;
}

export default function SpkPage() {
  const [tab, setTab] = useState("semua");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [spks, setSpks] = useState<Spk[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Extra filters
  const [mode, setMode] = useState("semua");
  const [mekanikId, setMekanikId] = useState("");
  const [pembayaranStatus, setPembayaranStatus] = useState("");
  const [prioritas, setPrioritas] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [mekaniks, setMekaniks] = useState<Mekanik[]>([]);
  const [stats, setStats] = useState<SpkStats | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page on filter/search change
  useEffect(() => {
    setPage(1);
  }, [tab, searchDebounced, mode, mekanikId, pembayaranStatus, prioritas, dateFrom, dateTo]);

  // Load mekanik list + stats once
  useEffect(() => {
    api.getPaginated<Mekanik>("/mekanik", { limit: 100 }).then(r => setMekaniks(r.data)).catch(() => { /* silent */ });
    api.get<SpkStats>("/spk/stats").then(r => setStats(r.data)).catch(() => { /* silent */ });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (tab !== "semua") params.status = tab;
      if (searchDebounced) params.search = searchDebounced;
      if (mode !== "semua") params.mode = mode;
      if (mekanikId) params.mekanikId = mekanikId;
      if (pembayaranStatus) params.pembayaranStatus = pembayaranStatus;
      if (prioritas) params.prioritas = prioritas;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const res = await api.getPaginated<Spk>("/spk", params);
      setSpks(res.data);
      setPagination(res.pagination);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data SPK");
    } finally {
      setLoading(false);
    }
  }, [tab, searchDebounced, page, mode, mekanikId, pembayaranStatus, prioritas, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Keyboard shortcut: / or Ctrl+K to focus search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
      if ((e.key === "/" && !isInput) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
    if (p === "urgent") return <Flame size={12} className="text-red-500" aria-label="Urgent" />;
    if (p === "tinggi") return <AlertTriangle size={12} className="text-amber-500" aria-label="Prioritas Tinggi" />;
    return null;
  };

  const isOverdue = (spk: Spk): boolean => {
    if (!spk.estimasiSelesai) return false;
    if (spk.status === "selesai" || spk.status === "dibatalkan") return false;
    return new Date(spk.estimasiSelesai) < new Date();
  };

  const paymentStatus = (spk: Spk): { label: string; color: string } | null => {
    const pem = spk.pembayaran?.[0];
    if (!pem) return null;
    if (pem.status === "lunas") return { label: "Lunas", color: "text-emerald-600 bg-emerald-500/10" };
    if (pem.status === "parsial") return { label: "Parsial", color: "text-amber-600 bg-amber-500/10" };
    return { label: "Belum", color: "text-red-600 bg-red-500/10" };
  };

  const hasActiveExtraFilters = mode !== "semua" || !!mekanikId || !!pembayaranStatus || !!prioritas || !!dateFrom || !!dateTo;

  const clearExtraFilters = () => {
    setMode("semua"); setMekanikId(""); setPembayaranStatus(""); setPrioritas(""); setDateFrom(""); setDateTo("");
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Manajemen SPK</h1>
          <p className="text-muted-foreground text-sm">Kelola Surat Perintah Kerja untuk Servis maupun Modifikasi.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/app/spk/analytics" className="flex items-center gap-1.5 text-sm bg-surface border border-surface-border px-3 py-2 rounded-xl font-medium hover:bg-surface-hover">
            <TrendingUp size={16} /> Analitik
          </Link>
          <Link href="/app/spk/create?mode=bubut" className="flex items-center gap-1.5 text-sm bg-surface border border-surface-border px-3 py-2 rounded-xl font-medium hover:bg-surface-hover">
            <Hammer size={16} /> Bubut Lepas
          </Link>
          <Link href="/app/spk/create" className="flex items-center gap-1.5 btn-glossy bg-primary text-primary-foreground px-3 py-2 rounded-xl text-sm font-medium shadow-glossy-primary hover:shadow-glossy-primary-dark">
            <Plus size={16} /> SPK Baru
          </Link>
        </div>
      </div>

      {/* Stats Widget */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3">
          <StatCard label="Antri" value={stats.antri} icon={<Clock size={14} />} onClick={() => setTab("antri")} active={tab === "antri"}
            className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" />
          <StatCard label="Dikerjakan" value={stats.dikerjakan} icon={<Wrench size={14} />} onClick={() => setTab("dikerjakan")} active={tab === "dikerjakan"}
            className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20" />
          <StatCard label="Kendala" value={stats.kendala} icon={<AlertTriangle size={14} />} onClick={() => setTab("kendala")} active={tab === "kendala"}
            className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20" />
          <StatCard label="Overdue" value={stats.overdue} icon={<Flame size={14} />} onClick={() => setTab("semua")} active={false}
            className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30" highlight />
          <StatCard label="Belum Lunas" value={stats.pendingPayment} icon={<Receipt size={14} />} onClick={() => { setTab("semua"); setPembayaranStatus("belum"); }} active={pembayaranStatus === "belum"}
            className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20" />
        </div>
      )}

      {/* Tabs + Search + Filter toggle */}
      <div className="glass-panel p-3 space-y-3">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {["semua", "antri", "dikerjakan", "selesai", "kendala", "dibatalkan"].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${tab === t ? "bg-primary text-white shadow-glossy-primary" : "text-muted-foreground hover:bg-surface-hover border border-surface-border"}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-background px-3 py-2 rounded-lg border border-surface-border focus-within:ring-1 focus-within:ring-primary flex-1">
            <Search size={16} className="text-muted-foreground shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari No SPK, pelanggan, kendaraan... (tekan /)"
              aria-label="Cari SPK"
              className="bg-transparent border-none focus:outline-none text-sm w-full"
            />
            {loading && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${hasActiveExtraFilters ? "bg-primary/10 text-primary border-primary/30" : "bg-surface border-surface-border text-muted-foreground hover:bg-surface-hover"}`}
          >
            <Filter size={14} /> Filter {hasActiveExtraFilters && <span className="min-w-[16px] h-[16px] rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center px-1">•</span>}
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="pt-3 border-t border-surface-border grid grid-cols-2 md:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <FilterField label="Mode">
              <select value={mode} onChange={e => setMode(e.target.value)} className="w-full bg-background border border-surface-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="semua">Semua Mode</option>
                <option value="rutin">Rutin</option>
                <option value="modifikasi">Modifikasi</option>
                <option value="bubut">Bubut</option>
              </select>
            </FilterField>
            <FilterField label="Mekanik">
              <select value={mekanikId} onChange={e => setMekanikId(e.target.value)} className="w-full bg-background border border-surface-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">Semua</option>
                {mekaniks.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </FilterField>
            <FilterField label="Prioritas">
              <select value={prioritas} onChange={e => setPrioritas(e.target.value)} className="w-full bg-background border border-surface-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">Semua</option>
                <option value="urgent">Urgent</option>
                <option value="tinggi">Tinggi</option>
                <option value="normal">Normal</option>
                <option value="rendah">Rendah</option>
              </select>
            </FilterField>
            <FilterField label="Pembayaran">
              <select value={pembayaranStatus} onChange={e => setPembayaranStatus(e.target.value)} className="w-full bg-background border border-surface-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">Semua</option>
                <option value="belum">Belum</option>
                <option value="parsial">Parsial</option>
                <option value="lunas">Lunas</option>
              </select>
            </FilterField>
            <FilterField label="Dari Tanggal">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full bg-background border border-surface-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
            </FilterField>
            <FilterField label="Sampai Tanggal">
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full bg-background border border-surface-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
            </FilterField>
            {hasActiveExtraFilters && (
              <div className="md:col-span-2 flex items-end">
                <button type="button" onClick={clearExtraFilters} className="text-xs text-red-600 hover:underline flex items-center gap-1">
                  <X size={12} /> Reset filter tambahan
                </button>
              </div>
            )}
          </div>
        )}
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
                <th className="px-6 py-4 font-semibold">Mekanik / Tipe</th>
                <th className="px-6 py-4 font-semibold">Progres</th>
                <th className="px-6 py-4 font-semibold">Tagihan</th>
                <th className="px-6 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableRowSkeleton count={5} />
              ) : spks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    {searchDebounced ? `Tidak ada hasil untuk "${searchDebounced}"` : "Belum ada data SPK"}
                  </td>
                </tr>
              ) : (
                spks.map((spk) => {
                  const overdue = isOverdue(spk);
                  const payment = paymentStatus(spk);
                  return (
                    <tr key={spk.id} className={`bg-surface border-b border-surface-border hover:bg-surface-hover/50 transition-colors ${overdue ? "border-l-4 border-l-red-500" : ""}`}>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyle(spk.status)}`}>{spk.status}</span>
                        {overdue && (
                          <span className="ml-1 text-[9px] font-bold text-red-600 uppercase tracking-wider">Overdue</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 font-medium font-mono text-xs">
                          {prioritasIcon(spk.prioritas)}
                          {spk.noSpk}
                        </div>
                        <div className="text-xs text-muted-foreground">{formatTanggal(spk.createdAt)}</div>
                        {spk.estimasiSelesai && (
                          <div className={`text-[10px] flex items-center gap-1 mt-0.5 ${overdue ? "text-red-600 font-bold" : "text-muted-foreground"}`}>
                            <Calendar size={10} /> ETA {formatTanggal(spk.estimasiSelesai)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium">{spk.pelanggan?.name || "—"}</div>
                        <div className="text-xs text-muted-foreground">
                          {spk.kendaraan ? `${spk.kendaraan.name} (${spk.kendaraan.plat})` : "—"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {spk.mekanik ? (
                          <div className="text-xs font-medium">{spk.mekanik.name}</div>
                        ) : (
                          <div className="text-xs text-red-500 italic">Belum diassign</div>
                        )}
                        <div className="inline-flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5 capitalize"><FileText size={10} />{spk.mode}</div>
                      </td>
                      <td className="px-6 py-4">
                        {(spk.status === "dikerjakan" || spk.status === "selesai" || spk.status === "kendala") && (
                          <div className="w-24">
                            <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                              <span>{spk.status === "selesai" ? 100 : spk.progress ?? 0}%</span>
                            </div>
                            <div className="h-1 bg-surface-border rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${spk.status === "selesai" ? "bg-emerald-500" : spk.status === "kendala" ? "bg-red-500" : "bg-blue-500"}`} style={{ width: `${spk.status === "selesai" ? 100 : spk.progress ?? 0}%` }} />
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-sm">{formatRupiah(Number(spk.totalTagihan ?? (Number(spk.totalHarga) - Number(spk.diskon ?? 0))), "compact")}</p>
                        {payment && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${payment.color}`}>{payment.label}</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/app/spk/${spk.id}`} className="text-primary hover:text-primary-hover font-medium text-sm">Detail</Link>
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
          spks.map((spk) => {
            const overdue = isOverdue(spk);
            const payment = paymentStatus(spk);
            return (
              <Link key={spk.id} href={`/app/spk/${spk.id}`} className={`glass-panel p-4 flex items-center gap-3 active:scale-[0.98] transition-transform block ${overdue ? "border-l-4 border-l-red-500" : ""}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-mono text-muted-foreground">{spk.noSpk}</span>
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${statusStyle(spk.status)}`}>{spk.status}</span>
                    {overdue && <span className="text-[9px] font-bold text-red-600 uppercase">Overdue</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {prioritasIcon(spk.prioritas)}
                    <p className="font-semibold text-sm truncate">{spk.pelanggan?.name || "—"}</p>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {spk.kendaraan ? `${spk.kendaraan.name}` : "—"} • {spk.mode} {spk.mekanik && `• ${spk.mekanik.name}`}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm font-bold text-primary">{formatRupiah(Number(spk.totalTagihan ?? (Number(spk.totalHarga) - Number(spk.diskon ?? 0))), "compact")}</p>
                    {payment && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${payment.color}`}>{payment.label}</span>}
                  </div>
                </div>
                <ChevronRight size={18} className="text-muted-foreground shrink-0" />
              </Link>
            );
          })
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
              aria-label="Halaman sebelumnya"
            >←</button>
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
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={!pagination.hasNext}
              className="px-3 py-1 rounded border border-surface-border bg-surface hover:bg-surface-hover text-xs disabled:opacity-50"
              aria-label="Halaman berikutnya"
            >→</button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, onClick, active, className, highlight }: { label: string; value: number; icon: React.ReactNode; onClick: () => void; active: boolean; className: string; highlight?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`glass-panel p-3 text-left border transition-all hover:scale-[1.02] ${className} ${active ? "ring-2 ring-current" : ""} ${highlight && value > 0 ? "animate-pulse" : ""}`}
      aria-pressed={active}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
        <span className="opacity-70">{icon}</span>
      </div>
      <p className="text-2xl font-bold mt-0.5">{value}</p>
    </button>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}
