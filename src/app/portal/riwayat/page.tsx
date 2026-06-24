"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, History, Search, Filter, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { portalFetch, portalLogout } from "@/lib/portalFetch";
import { SkeletonCard } from "@/components/portal/PortalSkeleton";
import { PortalError } from "@/components/portal/PortalError";
import type { PortalSPK } from "@/types/portal";
import { STATUS_COLORS } from "@/types/portal";

export default function RiwayatPage() {
  const [data, setData] = useState<PortalSPK[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("semua");
  const [error, setError] = useState<{ type: "auth" | "network" | "server"; message: string } | null>(null);

  const fetchRiwayat = useCallback(async () => {
    setError(null);
    try {
      const res = await portalFetch("/api/v1/customer-auth/history");
      if (res.status === 401 || res.status === 403) { portalLogout(); return; }
      const json = await res.json();
      if (json.success) {
        setData(json.data.spk || []);
      } else {
        setError({ type: "server", message: json.message || "Gagal memuat riwayat" });
      }
    } catch {
      setError({ type: "network", message: "Koneksi bermasalah. Periksa internet Anda." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRiwayat(); }, [fetchRiwayat]);

  // Filter and search
  const filtered = data.filter(spk => {
    const matchStatus = statusFilter === "semua" || spk.status === statusFilter;
    const matchSearch = !search || 
      spk.noSpk.toLowerCase().includes(search.toLowerCase()) ||
      spk.mode?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 10;
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  // Reset page when filter changes
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  // Stats
  const stats = {
    total: data.length,
    aktif: data.filter(s => s.status === "dikerjakan" || s.status === "antri").length,
    selesai: data.filter(s => s.status === "selesai").length,
    batal: data.filter(s => s.status === "batal").length,
  };

  if (loading) {
    return (
      <div className="max-w-sm md:max-w-2xl mx-auto p-4 space-y-4">
        <SkeletonCard height="h-20" />
        <SkeletonCard height="h-24" />
        <SkeletonCard height="h-24" />
        <SkeletonCard height="h-24" />
      </div>
    );
  }

  if (error && data.length === 0) {
    return (
      <div className="max-w-sm md:max-w-2xl mx-auto p-4">
        <PortalError error={error} onRetry={fetchRiwayat} />
      </div>
    );
  }

  return (
    <div className="max-w-sm md:max-w-2xl mx-auto p-4 space-y-6 pb-28 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Link href="/portal/dashboard" className="p-2.5 bg-surface-hover/50 border border-surface-border hover:bg-surface-hover rounded-xl transition-colors md:hidden">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
          <History className="text-primary" size={24} /> Riwayat Servis
        </h1>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Aktif", value: stats.aktif, color: "text-primary" },
          { label: "Selesai", value: stats.selesai, color: "text-emerald-500" },
          { label: "Batal", value: stats.batal, color: "text-red-500" },
        ].map(s => (
          <div key={s.label} className="glass-panel p-3 text-center">
            <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nomor SPK..."
            className="w-full bg-surface-hover/50 border border-surface-border rounded-xl pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all focus:bg-background"
          />
        </div>
        <div className="flex items-center gap-2 bg-surface-hover/50 p-1.5 rounded-xl border border-surface-border shrink-0">
          <Filter size={14} className="text-muted-foreground ml-2" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-transparent text-sm font-semibold outline-none pr-2 py-1 text-foreground cursor-pointer"
          >
            <option value="semua">Semua</option>
            <option value="dikerjakan">Dikerjakan</option>
            <option value="antri">Antri</option>
            <option value="selesai">Selesai</option>
            <option value="kendala">Kendala</option>
            <option value="batal">Batal</option>
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-3">
        {paginated.length === 0 ? (
          <div className="text-center py-12 glass-panel">
            <History size={56} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-bold mb-1">
              {search || statusFilter !== "semua" ? "Pencarian Tidak Ditemukan" : "Belum Ada Riwayat"}
            </p>
            <p className="text-sm text-muted-foreground">
              {search || statusFilter !== "semua" ? "Coba sesuaikan filter atau kata kunci pencarian Anda." : "Riwayat servis Anda akan muncul di sini setelah membuat SPK."}
            </p>
          </div>
        ) : (
          paginated.map(spk => {
            const isActive = spk.status === "dikerjakan" || spk.status === "antri";
            const hasSisa = Number(spk.sisaTagihan) > 0;
            return (
              <Link
                key={spk.id}
                href={`/portal/spk/${spk.id}`}
                className={`block p-4 border rounded-xl hover:bg-surface-hover transition-all group relative overflow-hidden active:scale-[0.99] ${
                  isActive ? "bg-primary/5 border-primary/20" : "bg-surface-hover/50 border-surface-border"
                }`}
              >
                {isActive && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary animate-pulse" />}

                <div className="flex justify-between items-start mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">{spk.noSpk}</p>
                      <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(spk.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                      {spk.mode && <span className="ml-1.5 opacity-60">• {spk.mode}</span>}
                    </p>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${STATUS_COLORS[spk.status] || STATUS_COLORS.antri}`}>
                    {spk.status}
                  </span>
                </div>

                {hasSisa && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 font-bold border border-red-500/15 mb-2 inline-block">
                    Sisa: Rp {Number(spk.sisaTagihan).toLocaleString("id-ID")}
                  </span>
                )}

                <div className="mt-1">
                  <div className="flex justify-between text-[9px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">
                    <span>Progress</span>
                    <span>{spk.progress}%</span>
                  </div>
                  <div className="w-full bg-background rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${spk.progress === 100 ? "bg-emerald-500" : "bg-primary"}`}
                      style={{ width: `${spk.progress}%` }}
                    />
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="p-2.5 bg-surface-hover border border-surface-border rounded-xl hover:bg-background transition-colors disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-bold text-muted-foreground">
            {page} / {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            className="p-2.5 bg-surface-hover border border-surface-border rounded-xl hover:bg-background transition-colors disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
