"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Plus, Clock, Edit, Trash2, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import type { Jasa, Pagination } from "@/lib/types";
import { Skeleton, TableRowSkeleton } from "@/components/ui/loading-skeleton";

export default function JasaPage() {
  const [tab, setTab] = useState("semua");
  const [services, setServices] = useState<Jasa[]>([]);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced, tab]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (searchDebounced) params.search = searchDebounced;
      if (tab !== "semua") params.kategori = tab;

      const res = await api.getPaginated<Jasa>("/jasa", params);
      setServices(res.data);
      setPagination(res.pagination);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data jasa");
    } finally {
      setLoading(false);
    }
  }, [page, searchDebounced, tab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: number, nama: string) => {
    toast.confirm(`Hapus jasa "${nama}"?`, async () => {
      setDeleting(id);
      try {
        await api.delete(`/jasa/${id}`);
        toast.success("Berhasil", `Jasa "${nama}" berhasil dihapus`);
        fetchData();
      } catch (err: unknown) {
        toast.error("Gagal", err instanceof Error ? err.message : "Gagal menghapus jasa");
      } finally {
        setDeleting(null);
      }
    });
  };

  const formatRp = (n: number | string) => `Rp ${Number(n).toLocaleString("id-ID")}`;

  return (
    <div className="space-y-4 lg:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Jasa & Layanan</h1>
          <p className="text-muted-foreground text-sm">Kelola daftar jasa servis, tarif, dan template paket.</p>
        </div>
        <Link href="/app/master/jasa/tambah" className="flex items-center gap-1.5 btn-glossy bg-primary text-primary-foreground px-3 py-2 rounded-xl text-sm font-medium shadow-glossy-primary hover:shadow-glossy-primary-dark">
          <Plus size={16} /> Tambah Jasa
        </Link>
      </div>

      {/* Tabs + Search */}
      <div className="glass-panel p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="flex items-center gap-2 bg-background px-3 py-2 rounded-lg border border-surface-border flex-1 focus-within:ring-1 focus-within:ring-primary">
          <Search size={16} className="text-muted-foreground shrink-0" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari jasa..." className="bg-transparent border-none focus:outline-none text-sm w-full" />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {["semua", "Servis Rutin", "Servis Besar", "Lainnya"].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${tab === t ? "bg-primary text-white shadow-sm" : "text-muted-foreground border border-surface-border hover:bg-surface-hover"}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="glass-panel p-8 text-center text-red-500">{error}</div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block glass-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase bg-surface-hover/50 border-b border-surface-border">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Kode</th>
                    <th className="px-4 py-3 text-left font-semibold">Jasa</th>
                    <th className="px-4 py-3 text-left font-semibold">Kategori</th>
                    <th className="px-4 py-3 text-right font-semibold">Tarif</th>
                    <th className="px-4 py-3 text-center font-semibold">Estimasi</th>
                    <th className="px-4 py-3 text-center font-semibold">Garansi</th>
                    <th className="px-4 py-3 text-center font-semibold">Bundle</th>
                    <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableRowSkeleton count={6} />
                  ) : services.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Tidak ada data jasa</td></tr>
                  ) : (
                    services.map((s) => (
                      <tr key={s.id} className="bg-surface border-b border-surface-border hover:bg-surface-hover/30 transition-colors">
                        <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{s.kode}</td>
                        <td className="px-4 py-3 font-medium">{s.name}</td>
                        <td className="px-4 py-3">
                          {s.kategori ? (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border bg-blue-500/10 text-blue-600 border-blue-500/20">{s.kategori}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium">
                          <div>{formatRp(s.harga)}</div>
                          {s.hargaModal && s.hargaModal > 0 ? (
                            <div className="text-[10px] text-muted-foreground font-normal">Modal: {formatRp(s.hargaModal)}</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                          {s.estimasiWaktu ? <><Clock size={12} className="inline mr-1" />{s.estimasiWaktu}</> : "—"}
                        </td>
                        <td className="px-4 py-3 text-center text-xs">{s.garansiHari && s.garansiHari > 0 ? `${s.garansiHari} Hari` : "-"}</td>
                        <td className="px-4 py-3 text-center">
                          {(s.sparepartBundles?.length ?? 0) > 0 ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{s.sparepartBundles!.length} item</span>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Link href={`/app/master/jasa/tambah?edit=${s.id}`} className="p-1.5 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-foreground"><Edit size={14} /></Link>
                            <button onClick={() => handleDelete(s.id, s.name)} disabled={deleting === s.id}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 disabled:opacity-50">
                              {deleting === s.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            </button>
                          </div>
                        </td>
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
                <div key={i} className="glass-panel p-3"><Skeleton className="h-14 w-full" /></div>
              ))
            ) : services.length === 0 ? (
              <div className="glass-panel p-8 text-center text-sm text-muted-foreground">Tidak ada data jasa</div>
            ) : services.map((s) => (
              <div key={s.id} className="glass-panel p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold truncate">{s.name}</p>
                    {s.kategori && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border shrink-0 bg-blue-500/10 text-blue-600 border-blue-500/20">{s.kategori}</span>}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="font-mono">{s.kode}</span>
                    {s.estimasiWaktu && <span className="flex items-center gap-0.5"><Clock size={10} />{s.estimasiWaktu}</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm font-bold text-primary font-mono">{formatRp(s.harga)}</p>
                    {s.hargaModal && s.hargaModal > 0 ? (
                      <span className="text-[9px] text-muted-foreground">/ modal {formatRp(s.hargaModal)}</span>
                    ) : null}
                    {(s.sparepartBundles?.length ?? 0) > 0 && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{s.sparepartBundles!.length} bundle</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Link href={`/app/master/jasa/tambah?edit=${s.id}`} className="p-1.5 rounded-lg hover:bg-surface-hover text-muted-foreground border border-surface-border"><Edit size={14} /></Link>
                  <button onClick={() => handleDelete(s.id, s.name)} disabled={deleting === s.id}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 border border-surface-border disabled:opacity-50">
                    {deleting === s.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="text-xs">
                Halaman {page} dari {pagination.totalPages}
              </span>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!pagination.hasPrev} className="px-3 py-1 rounded border border-surface-border bg-surface hover:bg-surface-hover text-xs disabled:opacity-50">←</button>
                <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={!pagination.hasNext} className="px-3 py-1 rounded border border-surface-border bg-surface hover:bg-surface-hover text-xs disabled:opacity-50">→</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
