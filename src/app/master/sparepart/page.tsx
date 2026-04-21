"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Plus, Filter, Package, Edit, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import type { Sparepart, Pagination } from "@/lib/types";
import { Skeleton, TableRowSkeleton } from "@/components/ui/loading-skeleton";

export default function SparepartPage() {
  const [parts, setParts] = useState<Sparepart[]>([]);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState("semua");
  const [kategoriList, setKategoriList] = useState<{id: number, name: string}[]>([]);
  const [deleting, setDeleting] = useState<number | null>(null);

  const formatRp = (n: number | string) => `Rp ${Number(n).toLocaleString("id-ID")}`;
  const safeMargin = (beli: number | string, jual: number | string) => {
    const b = Number(beli), j = Number(jual);
    if (b <= 0) return 0;
    return Math.round(((j - b) / b) * 100);
  };

  const handleDelete = async (id: number, nama: string) => {
    if (!confirm(`Hapus sparepart "${nama}"?`)) return;
    setDeleting(id);
    try {
      await api.delete(`/sparepart/${id}`);
      toast.success("Berhasil", `Sparepart "${nama}" berhasil dihapus`);
      fetchData();
    } catch (err: any) {
      toast.error("Gagal", err.message || "Gagal menghapus sparepart");
    } finally { setDeleting(null); }
  };

  // Fetch kategori on mount
  useEffect(() => {
    api.get<{id: number, name: string}[]>("/sparepart/categories")
      .then(res => setKategoriList(res.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced, kategoriFilter]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (searchDebounced) params.search = searchDebounced;
      if (kategoriFilter !== "semua") params.kategoriId = kategoriFilter;

      const res = await api.getPaginated<Sparepart>("/sparepart", params);
      setParts(res.data);
      setPagination(res.pagination);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [page, searchDebounced, kategoriFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalNilaiStok = parts.reduce((acc, p) => acc + (Number(p.hargaBeli) * p.stok), 0);
  const totalStokMenipis = parts.filter(p => p.stok > 0 && p.stok <= p.stokMinimum).length;
  const totalStokHabis = parts.filter(p => p.stok === 0).length;

  return (
    <div className="space-y-4 lg:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Katalog Sparepart</h1>
          <p className="text-muted-foreground text-sm">Master data sparepart, harga, dan stok.</p>
        </div>
        <Link href="/master/sparepart/tambah" className="flex items-center justify-center gap-1.5 btn-glossy bg-primary text-primary-foreground px-3 py-2 rounded-xl text-sm font-medium shadow-glossy-primary hover:shadow-glossy-primary-dark">
          <Plus size={16} /> Tambah Sparepart
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Item (Halaman Ini)", value: parts.length > 0 ? parts.length : 0 },
          { label: "Nilai Stok (Halaman Ini)", value: formatRp(totalNilaiStok), color: "text-primary" },
          { label: "⚠ Stok Menipis", value: totalStokMenipis || "0", color: "text-amber-500" },
          { label: "🔴 Stok Habis", value: totalStokHabis || "0", color: "text-red-500" },
        ].map((s, i) => (
          <div key={i} className="glass-panel p-3 lg:p-4">
            <p className="text-[10px] lg:text-xs text-muted-foreground font-medium">{s.label}</p>
            <p className={`text-xl lg:text-2xl font-bold mt-0.5 ${s.color || ""}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="glass-panel p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="flex items-center gap-2 bg-background px-3 py-2 rounded-lg border border-surface-border flex-1 focus-within:ring-1 focus-within:ring-primary">
          <Search size={16} className="text-muted-foreground shrink-0" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama, kode, atau merk..." className="bg-transparent border-none focus:outline-none text-sm w-full" />
        </div>
        <div className="flex gap-2">
          <select value={kategoriFilter} onChange={(e) => setKategoriFilter(e.target.value)} className="text-xs bg-surface border border-surface-border px-3 py-2 rounded-lg focus:outline-none flex-1 sm:flex-none">
            <option value="semua">Semua Kategori</option>
            {kategoriList.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
          </select>
          <button className="flex items-center justify-center gap-1.5 text-xs bg-surface border border-surface-border px-3 py-2 rounded-lg hover:bg-surface-hover font-medium"><Filter size={14} /> Stok</button>
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
                    <th className="px-4 py-3 text-left font-semibold">Nama Sparepart</th>
                    <th className="px-4 py-3 text-left font-semibold">Merk</th>
                    <th className="px-4 py-3 text-right font-semibold">Harga Beli</th>
                    <th className="px-4 py-3 text-right font-semibold">Harga Jual</th>
                    <th className="px-4 py-3 text-center font-semibold">Stok</th>
                    <th className="px-4 py-3 text-right font-semibold">Margin</th>
                    <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableRowSkeleton count={8} />
                  ) : parts.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Tidak ada data sparepart</td></tr>
                  ) : (
                    parts.map((p) => {
                      const margin = safeMargin(p.hargaBeli, p.hargaJual);
                      const lowStock = p.stok <= p.stokMinimum;
                      return (
                        <tr key={p.id} className="bg-surface border-b border-surface-border hover:bg-surface-hover/30 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.kode}</td>
                          <td className="px-4 py-3">
                            <Link href={`/master/sparepart/${p.id}`} className="font-medium hover:text-primary">{p.name}</Link>
                            <p className="text-[10px] text-muted-foreground">{p.kategori?.name || "Umum"}</p>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{p.merk || "—"}</td>
                          <td className="px-4 py-3 text-right font-mono text-muted-foreground">{formatRp(p.hargaBeli)}</td>
                          <td className="px-4 py-3 text-right font-mono font-medium">{formatRp(p.hargaJual)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${p.stok === 0 ? "bg-red-500/10 text-red-500 border border-red-500/20" : lowStock ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"}`}>
                              {lowStock && <AlertTriangle size={10} />}{p.stok}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-xs font-bold text-emerald-600">{margin}%</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <Link href={`/master/sparepart/${p.id}`} className="p-1.5 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-foreground"><Edit size={14} /></Link>
                              <button onClick={() => handleDelete(p.id, p.name)} disabled={deleting === p.id}
                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 disabled:opacity-50">
                                {deleting === p.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile List */}
          <div className="lg:hidden space-y-2">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="glass-panel p-3"><Skeleton className="h-10 w-full" /></div>
              ))
            ) : parts.map((p) => {
              const margin = safeMargin(p.hargaBeli, p.hargaJual);
              const lowStock = p.stok <= p.stokMinimum;
              return (
                <div key={p.id} className="glass-panel p-3 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${p.stok === 0 ? "bg-red-500/10" : lowStock ? "bg-amber-500/10" : "bg-surface-hover"}`}>
                    <Package size={18} className={p.stok === 0 ? "text-red-500" : lowStock ? "text-amber-500" : "text-muted-foreground"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.merk} • {p.kategori?.name || "Umum"} • {p.kode}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs font-bold font-mono">{formatRp(p.hargaJual)}</span>
                      <span className="text-[10px] text-emerald-600 font-bold">+{margin}%</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${p.stok === 0 ? "bg-red-500/10 text-red-500" : lowStock ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-600"}`}>
                        Stok: {p.stok}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="text-xs">
                Halaman {page} dari {pagination.totalPages} ({pagination.total} item)
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
