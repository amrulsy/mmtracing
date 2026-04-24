"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, TrendingDown, TrendingUp, Calendar, Wallet, Trash2, Edit, Loader2, X, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import type { Pagination } from "@/lib/types";
import { Skeleton } from "@/components/ui/loading-skeleton";

interface Pengeluaran {
  id: number;
  tanggal: string;
  deskripsi: string;
  jumlah: number;
  metode: string;
  oleh?: string;
  kategori?: { id: number; name: string };
}

interface Summary {
  bulanIni: number;
  bulanIniCount: number;
  bulanLalu: number;
  breakdown: Array<{
    _sum: { jumlah: number };
    kategori: string;
  }>;
}

const METODE_OPTIONS = ["Cash", "Transfer", "QRIS", "Debit"];

const EMPTY_FORM = { kategoriId: "", tanggal: new Date().toISOString().split("T")[0], deskripsi: "", jumlah: "", metode: "Cash", oleh: "" };

export default function PengeluaranPage() {
  const [tab, setTab] = useState("semua");
  const [expenses, setExpenses] = useState<Pengeluaran[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [categories, setCategories] = useState<{id: number, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  // Add/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Pengeluaran | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Load summary + categories on mount
  useEffect(() => {
    Promise.all([
      api.get<Summary>("/pengeluaran/summary"),
      api.get<{id: number, name: string}[]>("/pengeluaran/categories")
    ]).then(([sRes, cRes]) => {
      setSummary(sRes.data);
      setCategories(cRes.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => { setPage(1); }, [tab]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 15 };
      if (tab !== "semua") {
        const cat = categories.find(c => c.name === tab);
        if (cat) params.kategoriId = cat.id;
      }
      const res = await api.getPaginated<Pengeluaran>("/pengeluaran", params);
      setExpenses(res.data);
      setPagination(res.pagination);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data pengeluaran");
    } finally {
      setLoading(false);
    }
  }, [page, tab, categories]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Refresh summary after mutations ──────────────────────────
  const refreshSummary = () => {
    api.get<Summary>("/pengeluaran/summary")
      .then(res => setSummary(res.data))
      .catch(() => {});
  };

  // ── Open Modal ────────────────────────────────────────────────
  const openAdd = () => {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM, kategoriId: categories[0]?.id.toString() || "" });
    setShowModal(true);
  };

  const openEdit = (exp: Pengeluaran) => {
    setEditTarget(exp);
    setForm({
      kategoriId: exp.kategori?.id.toString() || "",
      tanggal: exp.tanggal.split("T")[0],
      deskripsi: exp.deskripsi,
      jumlah: exp.jumlah.toString(),
      metode: exp.metode,
      oleh: exp.oleh || "",
    });
    setShowModal(true);
  };

  // ── Submit ─────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.deskripsi.trim() || !form.jumlah || !form.kategoriId) {
      return toast.error("Validasi Gagal", "Deskripsi, jumlah, dan kategori wajib diisi");
    }
    setSubmitting(true);
    const payload = {
      kategoriId: Number(form.kategoriId),
      tanggal: form.tanggal || undefined,
      deskripsi: form.deskripsi.trim(),
      jumlah: Number(form.jumlah),
      metode: form.metode,
      oleh: form.oleh || undefined,
    };
    try {
      if (editTarget) {
        await api.put(`/pengeluaran/${editTarget.id}`, payload);
        toast.success("Diperbarui", "Data pengeluaran berhasil diperbarui");
      } else {
        await api.post("/pengeluaran", payload);
        toast.success("Dicatat", "Pengeluaran baru berhasil dicatat");
      }
      setShowModal(false);
      fetchData();
      refreshSummary();
    } catch (err: unknown) {
      toast.error("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────
  const handleDelete = (exp: Pengeluaran) => {
    toast.confirm(`Hapus pengeluaran "${exp.deskripsi}" (${formatRp(exp.jumlah)})?`, async () => {
      setDeleting(exp.id);
      try {
        await api.delete(`/pengeluaran/${exp.id}`);
        toast.success("Dihapus", "Data pengeluaran berhasil dihapus");
        fetchData();
        refreshSummary();
      } catch (err: unknown) {
        toast.error("Gagal", err instanceof Error ? err.message : "Gagal menghapus");
      } finally {
        setDeleting(null);
      }
    });
  };

  // ── Helpers ─────────────────────────────────────────────────────
  const formatRp = (num: number) => `Rp ${Number(num).toLocaleString("id-ID")}`;
  const formatDate = (d: string) => new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });

  let trendStr = "0%";
  let trendUp = false;
  if (summary && summary.bulanLalu > 0) {
    const diff = ((summary.bulanIni - summary.bulanLalu) / summary.bulanLalu) * 100;
    trendUp = diff > 0;
    trendStr = `${trendUp ? "+" : ""}${diff.toFixed(1)}%`;
  } else if (summary && summary.bulanIni > 0) {
    trendUp = true;
    trendStr = "+100%";
  }

  const colors = ["bg-blue-500", "bg-amber-500", "bg-purple-500", "bg-cyan-500", "bg-emerald-500", "bg-rose-500", "bg-indigo-500"];

  return (
    <div className="space-y-4 lg:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Pengeluaran Operasional</h1>
          <p className="text-muted-foreground text-sm">Catat dan pantau biaya operasional bengkel.</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center justify-center gap-2 btn-glossy bg-primary text-primary-foreground px-4 py-2 rounded-xl font-medium shadow-glossy-primary hover:shadow-glossy-primary-dark"
        >
          <Plus size={20} /> Catat Pengeluaran
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
        <div className="glass-panel p-3 lg:p-4 col-span-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] lg:text-xs text-muted-foreground font-medium">Total Bulan Ini</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary mt-0.5 truncate">
                {summary ? formatRp(summary.bulanIni) : <Skeleton className="h-9 w-32 mt-1" />}
              </p>
            </div>
            {summary && (
              <div className={`flex items-center gap-1 px-2 py-0.5 lg:px-2.5 lg:py-1 rounded-full text-[10px] lg:text-xs font-bold shrink-0 ${trendUp ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-600"}`}>
                {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {trendStr}
              </div>
            )}
          </div>
        </div>
        <div className="glass-panel p-3 lg:p-4 text-center">
          <p className="text-[10px] lg:text-xs text-muted-foreground">Bulan Lalu</p>
          <p className="text-lg lg:text-xl font-bold mt-0.5 font-mono truncate">
            {summary ? formatRp(summary.bulanLalu) : <Skeleton className="h-7 w-24 mx-auto" />}
          </p>
        </div>
        <div className="glass-panel p-3 lg:p-4 text-center">
          <p className="text-[10px] lg:text-xs text-muted-foreground">Transaksi</p>
          <p className="text-lg lg:text-xl font-bold mt-0.5">
            {summary ? summary.bulanIniCount : <Skeleton className="h-7 w-8 mx-auto" />}
          </p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="glass-panel p-3 sm:p-4 lg:p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          📊 Breakdown (Bulan Ini)
        </h3>
        <div className="space-y-3">
          {!summary ? (
            <div className="space-y-3"><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-full" /></div>
          ) : summary.breakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Belum ada pengeluaran bulan ini</p>
          ) : (
            summary.breakdown.map((cat, i) => {
              const amount = Number(cat._sum.jumlah || 0);
              const percentage = summary.bulanIni > 0 ? Math.round((amount / summary.bulanIni) * 100) : 0;
              const color = colors[i % colors.length];
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1 gap-2">
                    <span className="font-medium truncate">{cat.kategori}</span>
                    <span className="text-muted-foreground shrink-0">{formatRp(amount)} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-surface border border-surface-border rounded-full h-3 overflow-hidden">
                    <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Expense List */}
      <div className="glass-panel overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-surface-border bg-surface-hover/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
            <button onClick={() => setTab("semua")} className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full border whitespace-nowrap transition-colors ${tab === "semua" ? "bg-primary/10 text-primary border-primary/20" : "text-muted-foreground border-surface-border hover:bg-surface-hover"}`}>Semua</button>
            {categories.slice(0, 6).map(c => (
              <button key={c.id} onClick={() => setTab(c.name)} className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full border whitespace-nowrap transition-colors ${tab === c.name ? "bg-primary/10 text-primary border-primary/20" : "text-muted-foreground border-surface-border hover:bg-surface-hover"}`}>{c.name}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
            <Calendar size={14} /> Daftar Pengeluaran
          </div>
        </div>

        {error ? (
          <div className="p-8 text-center">
            <div className="flex items-center gap-2 justify-center text-red-500 text-sm"><AlertTriangle size={16} />{error}</div>
            <button onClick={() => { setError(""); fetchData(); }} className="text-xs text-primary hover:underline mt-2">Coba lagi</button>
          </div>
        ) : (
          <div className="divide-y divide-surface-border">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-5 py-4"><Skeleton className="h-10 w-full" /></div>
              ))
            ) : expenses.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">Tidak ada data pengeluaran</div>
            ) : (
              expenses.map((exp) => (
                <div key={exp.id} className="flex items-center gap-3 lg:gap-4 px-3 sm:px-5 py-3 hover:bg-surface-hover/20 transition-colors">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                    <Wallet size={16} className="text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{exp.deskripsi}</p>
                    <p className="text-[10px] text-muted-foreground">{formatDate(exp.tanggal)} • {exp.kategori?.name || "Lainnya"} • {exp.metode}{exp.oleh ? ` • oleh ${exp.oleh}` : ""}</p>
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-red-500 font-mono shrink-0">- {formatRp(exp.jumlah)}</span>
                  <div className="hidden sm:flex gap-1 shrink-0 ml-2">
                    <button
                      onClick={() => openEdit(exp)}
                      className="p-1.5 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors"
                      title="Edit"
                    >
                      <Edit size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(exp)}
                      disabled={deleting === exp.id}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
                      title="Hapus"
                    >
                      {deleting === exp.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-surface-border text-sm text-muted-foreground">
            <span className="text-xs">Halaman {page} dari {pagination.totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!pagination.hasPrev} className="px-3 py-1 rounded border border-surface-border bg-surface hover:bg-surface-hover text-xs disabled:opacity-50">←</button>
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={!pagination.hasNext} className="px-3 py-1 rounded border border-surface-border bg-surface hover:bg-surface-hover text-xs disabled:opacity-50">→</button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-background border border-surface-border rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-surface-border flex justify-between items-center bg-surface-hover/30">
              <h3 className="font-bold flex items-center gap-2">
                {editTarget ? <Edit size={16} className="text-primary" /> : <Plus size={16} className="text-primary" />}
                {editTarget ? "Edit Pengeluaran" : "Catat Pengeluaran Baru"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground text-lg">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              {/* Kategori */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Kategori <span className="text-red-500">*</span></label>
                <select
                  value={form.kategoriId}
                  onChange={e => setForm(f => ({ ...f, kategoriId: e.target.value }))}
                  className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                >
                  <option value="">-- Pilih Kategori --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Deskripsi */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Deskripsi <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.deskripsi}
                  onChange={e => setForm(f => ({ ...f, deskripsi: e.target.value }))}
                  placeholder="Contoh: Beli oli mesin, Bayar listrik..."
                  className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Jumlah */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Jumlah (Rp) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min={1}
                    value={form.jumlah}
                    onChange={e => setForm(f => ({ ...f, jumlah: e.target.value }))}
                    placeholder="0"
                    className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  />
                </div>
                {/* Tanggal */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Tanggal</label>
                  <input
                    type="date"
                    value={form.tanggal}
                    onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))}
                    className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Metode */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Metode Bayar</label>
                  <select
                    value={form.metode}
                    onChange={e => setForm(f => ({ ...f, metode: e.target.value }))}
                    className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {METODE_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                {/* Oleh */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Oleh (Opsional)</label>
                  <input
                    type="text"
                    value={form.oleh}
                    onChange={e => setForm(f => ({ ...f, oleh: e.target.value }))}
                    placeholder="Nama pencatat..."
                    className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !form.deskripsi || !form.jumlah || !form.kategoriId}
                className="w-full mt-2 py-2.5 bg-primary text-white font-bold rounded-xl disabled:opacity-50 flex justify-center items-center gap-2 btn-glossy shadow-glossy-primary hover:shadow-glossy-primary-dark"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <>{editTarget ? "Simpan Perubahan" : "Catat Pengeluaran"}</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
