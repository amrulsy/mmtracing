"use client";

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Printer, CheckCircle2, AlertTriangle, Clock, Loader2,
  Wrench, User, Car, FileText, Package, ChevronRight, X, Save,
  Trash2, AlertCircle, Phone, CalendarClock, BadgeCheck, Ban
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { useAuth } from "@/lib/auth";
import type { Spk } from "@/lib/types";
import { Skeleton } from "@/components/ui/loading-skeleton";

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
const fmt = (n: number) => `Rp ${Number(n).toLocaleString("id-ID")}`;

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—";

const fmtDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const statusStyle = (s: string) => {
  switch (s) {
    case "selesai": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "dikerjakan": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "antri": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    case "kendala": return "bg-red-500/10 text-red-500 border-red-500/20";
    case "dibatalkan": return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
    default: return "bg-surface-hover text-muted-foreground";
  }
};

const prioritasStyle = (p: string) => {
  switch (p) {
    case "urgent": return "bg-red-500/15 text-red-600 border-red-500/30";
    case "tinggi": return "bg-amber-500/15 text-amber-600 border-amber-500/30";
    case "normal": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    default: return "bg-surface-hover text-muted-foreground border-surface-border";
  }
};

const stageStatusStyle = (s: string) => {
  if (s === "done") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  if (s === "in_progress") return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  return "bg-surface-hover text-muted-foreground border-surface-border";
};

// Status transitions yang diperbolehkan
const nextStatus: Record<string, { label: string; value: string; color: string }[]> = {
  antri: [
    { label: "Mulai Kerjakan", value: "dikerjakan", color: "bg-blue-500 hover:bg-blue-600 text-white" },
    { label: "Batalkan", value: "dibatalkan", color: "bg-zinc-500 hover:bg-zinc-600 text-white" },
  ],
  dikerjakan: [
    { label: "Tandai Selesai", value: "selesai", color: "bg-emerald-500 hover:bg-emerald-600 text-white" },
    { label: "Laporkan Kendala", value: "kendala", color: "bg-amber-500 hover:bg-amber-600 text-white" },
    { label: "Batalkan", value: "dibatalkan", color: "bg-zinc-500 hover:bg-zinc-600 text-white" },
  ],
  kendala: [
    { label: "Lanjutkan", value: "dikerjakan", color: "bg-blue-500 hover:bg-blue-600 text-white" },
    { label: "Batalkan", value: "dibatalkan", color: "bg-zinc-500 hover:bg-zinc-600 text-white" },
  ],
  selesai: [
    { label: "Kembalikan ke Dikerjakan", value: "dikerjakan", color: "bg-surface border border-surface-border hover:bg-surface-hover text-foreground" },
  ],
  dibatalkan: [],
};

// ──────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────
export default function SpkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.roleName === "Admin";

  const [spk, setSpk] = useState<Spk | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Update status modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string>("");
  const [catatan, setCatatan] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Progress slider
  const [progress, setProgress] = useState(0);
  const [updatingProgress, setUpdatingProgress] = useState(false);

  const fetchSpk = useCallback(async () => {
    try {
      setError("");
      const res = await api.get<Spk>(`/spk/${id}`);
      setSpk(res.data);
      setProgress(res.data.progress ?? 0);
      setCatatan(res.data.catatan ?? "");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data SPK");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchSpk(); }, [fetchSpk]);

  const openStatusModal = (target: string) => {
    setPendingStatus(target);
    setCatatan("");
    setShowStatusModal(true);
  };

  const handleUpdateStatus = async () => {
    if (!pendingStatus) return;
    setUpdatingStatus(true);
    try {
      const body: Record<string, unknown> = { status: pendingStatus };
      if (catatan.trim()) body.catatan = catatan;
      const res = await api.put<Spk>(`/spk/${id}/status`, body);
      setSpk(res.data);
      setProgress(res.data.progress ?? 0);
      setShowStatusModal(false);
      toast.success("Status Diperbarui", `SPK berhasil diubah ke "${pendingStatus}"`);
    } catch (err: unknown) {
      toast.error("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleUpdateProgress = async () => {
    setUpdatingProgress(true);
    try {
      const res = await api.put<Spk>(`/spk/${id}/progress`, { progress });
      setSpk(res.data);
      toast.success("Progress Diperbarui");
    } catch (err: unknown) {
      toast.error("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setUpdatingProgress(false);
    }
  };

  const handleDelete = () => {
    toast.confirm(`Yakin ingin menghapus SPK ${spk?.noSpk}?`, async () => {
      try {
        await api.delete(`/spk/${id}`);
        toast.success("SPK dihapus");
        router.push("/app/spk");
      } catch (err: unknown) {
        toast.error("Gagal Menghapus", err instanceof Error ? err.message : "Terjadi kesalahan");
      }
    });
  };

  // ── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
        <div className="flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="space-y-2 flex-1"><Skeleton className="h-7 w-48" /><Skeleton className="h-4 w-32" /></div>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────
  if (error || !spk) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 animate-in fade-in duration-500">
        <AlertTriangle size={32} className="text-red-500" />
        <p className="text-muted-foreground text-sm">{error || "SPK tidak ditemukan"}</p>
        <div className="flex gap-3">
          <button onClick={fetchSpk} className="text-primary text-sm font-medium hover:underline">Coba lagi</button>
          <Link href="/app/spk" className="text-muted-foreground text-sm hover:underline">Kembali ke daftar</Link>
        </div>
      </div>
    );
  }

  const transitions = nextStatus[spk.status] ?? [];
  const totalBiayaItems = (spk.items || []).reduce((s, i) => s + i.subtotal, 0);
  const totalBiayaStages = (spk.stages || []).reduce((s, s2) => s + Number(s2.estimasiBiaya), 0);
  // Fallback harus memperhitungkan diskon
  const sisaBayar = spk.pembayaran?.[0]?.sisaBayar ?? Math.max(0, Number(spk.totalHarga) - Number(spk.diskon ?? 0) - Number(spk.totalBayar));
  const displayProgress = spk.status === "selesai" ? 100 : (spk.progress ?? 0);

  return (
    <div className="space-y-4 lg:space-y-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start gap-3">
        <Link href="/app/spk" className="p-2 hover:bg-surface-hover rounded-xl border border-surface-border glass transition-colors shrink-0">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight font-mono">{spk.noSpk}</h1>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${statusStyle(spk.status)}`}>{spk.status}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${prioritasStyle(spk.prioritas)}`}>{spk.prioritas}</span>
            <span className="px-2 py-0.5 rounded-full bg-surface-hover border border-surface-border text-[10px] text-muted-foreground capitalize">{spk.mode}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Dibuat {fmtDateTime(spk.createdAt)} oleh {spk.createdBy?.name || "—"}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href={`/app/spk/${id}/cetak`} className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-surface-border rounded-xl hover:bg-surface-hover transition-colors">
            <Printer size={15} /> Cetak
          </Link>
          {isAdmin && spk.status !== "selesai" && spk.status !== "dibatalkan" && (
            <button onClick={handleDelete} className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-red-500/30 text-red-500 rounded-xl hover:bg-red-500/10 transition-colors">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* ── Kendala Banner ── */}
      {spk.status === "kendala" && spk.catatan && (
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-700 dark:text-amber-400 text-sm animate-in fade-in">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div><p className="font-semibold">Laporan Kendala</p><p className="text-xs mt-0.5">{spk.catatan}</p></div>
        </div>
      )}

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-panel p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Harga</p>
          <p className="text-lg font-bold text-primary mt-1">{fmt(Number(spk.totalHarga))}</p>
          {Number(spk.diskon) > 0 && <p className="text-[10px] text-emerald-500">Diskon: {fmt(Number(spk.diskon))}</p>}
        </div>
        <div className="glass-panel p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sudah Dibayar</p>
          <p className="text-lg font-bold text-emerald-500 mt-1">{fmt(Number(spk.totalBayar))}</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sisa Tagihan</p>
          <p className={`text-lg font-bold mt-1 ${Number(sisaBayar) > 0 ? "text-red-500" : "text-emerald-500"}`}>{fmt(Number(sisaBayar))}</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Progress</p>
          <p className="text-lg font-bold mt-1">{displayProgress}%</p>
          <div className="h-1.5 bg-surface-border rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${displayProgress}%` }} />
          </div>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">

        {/* Left: Pelanggan, Kendaraan, Mekanik, Dates */}
        <div className="space-y-4">
          
          {/* Pelanggan */}
          <div className="glass-panel p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pelanggan</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                {spk.pelanggan?.name?.charAt(0) || "?"}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{spk.pelanggan?.name || "—"}</p>
                {spk.pelanggan?.phone && (
                  <a href={`tel:${spk.pelanggan.phone}`} className="text-xs text-muted-foreground flex items-center gap-1 hover:text-primary">
                    <Phone size={10} />{spk.pelanggan.phone}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Kendaraan */}
          {spk.kendaraan && (
            <div className="glass-panel p-4 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Car size={12} />Kendaraan</h3>
              <p className="font-semibold text-sm">{spk.kendaraan.name}</p>
              <span className="text-xs font-mono bg-surface-hover border border-surface-border px-2 py-0.5 rounded">{spk.kendaraan.plat}</span>
              {spk.kendaraan.tahun && <p className="text-xs text-muted-foreground">Tahun {spk.kendaraan.tahun}{spk.kendaraan.warna ? ` • ${spk.kendaraan.warna}` : ""}</p>}
            </div>
          )}

          {/* Mekanik */}
          <div className="glass-panel p-4 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Wrench size={12} />Mekanik</h3>
            {spk.mekanik ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {spk.mekanik.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm">{spk.mekanik.name}</p>
                  {spk.mekanik.spesialisasi && <p className="text-xs text-muted-foreground">{spk.mekanik.spesialisasi}</p>}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ditugaskan</p>
            )}
          </div>

          {/* Tanggal */}
          <div className="glass-panel p-4 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><CalendarClock size={12} />Jadwal</h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Dibuat</span><span className="font-medium">{fmtDate(spk.createdAt)}</span></div>
              {spk.startedAt && <div className="flex justify-between"><span className="text-muted-foreground">Mulai Dikerjakan</span><span className="font-medium">{fmtDate(spk.startedAt)}</span></div>}
              {spk.estimasiSelesai && <div className="flex justify-between"><span className="text-muted-foreground">Est. Selesai</span><span className="font-medium text-amber-600">{fmtDate(spk.estimasiSelesai)}</span></div>}
              {spk.completedAt && <div className="flex justify-between"><span className="text-muted-foreground">Selesai</span><span className="font-medium text-emerald-600">{fmtDate(spk.completedAt)}</span></div>}
            </div>
          </div>

          {/* Pembayaran */}
          {spk.pembayaran && spk.pembayaran.length > 0 && (
            <div className="glass-panel p-4 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pembayaran</h3>
              {spk.pembayaran.map(p => (
                <div key={p.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-muted-foreground">{p.noInvoice}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${p.status === "lunas" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : p.status === "parsial" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}`}>{p.status}</span>
                  </div>
                  <div className="text-xs space-y-0.5">
                    <div className="flex justify-between"><span className="text-muted-foreground">Tagihan</span><span>{fmt(p.totalTagihan)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Dibayar</span><span className="text-emerald-600">{fmt(p.totalBayar)}</span></div>
                    <div className="flex justify-between font-bold"><span>Sisa</span><span className={Number(p.sisaBayar) > 0 ? "text-red-500" : "text-emerald-600"}>{fmt(Number(p.sisaBayar))}</span></div>
                  </div>
                  <Link href={`/app/pembayaran/${p.id}`} className="flex items-center gap-1 text-xs text-primary font-medium hover:underline mt-1">
                    Kelola Pembayaran <ChevronRight size={12} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Detail Pekerjaan + Actions */}
        <div className="lg:col-span-2 space-y-4">

          {/* Keluhan / Deskripsi */}
          {(spk.keluhan || spk.judulProyek || spk.spesifikasi) && (
            <div className="glass-panel p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><FileText size={12} />Deskripsi Pekerjaan</h3>
              {spk.judulProyek && <div><p className="text-[10px] text-muted-foreground">Judul Proyek</p><p className="font-semibold text-sm">{spk.judulProyek}</p></div>}
              {spk.keluhan && <div><p className="text-[10px] text-muted-foreground">Keluhan / Deskripsi</p><p className="text-sm">{spk.keluhan}</p></div>}
              {spk.spesifikasi && <div><p className="text-[10px] text-muted-foreground">Spesifikasi</p><p className="text-sm text-muted-foreground">{spk.spesifikasi}</p></div>}
            </div>
          )}

          {/* Items (Rutin) */}
          {spk.items && spk.items.length > 0 && (
            <div className="glass-panel overflow-hidden">
              <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Package size={12} />Item Pekerjaan</h3>
                <span className="text-xs font-bold text-primary">{fmt(totalBiayaItems)}</span>
              </div>
              <div className="divide-y divide-surface-border">
                {spk.items.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${item.status === "done" ? "bg-emerald-500/10 text-emerald-600" : "bg-surface-hover text-muted-foreground"}`}>
                      {item.status === "done" ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.nama}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{item.type}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold">{fmt(item.subtotal)}</p>
                      <p className="text-[10px] text-muted-foreground">{fmt(item.hargaSatuan)} × {item.qty}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stages (Modifikasi / Bubut) */}
          {spk.stages && spk.stages.length > 0 && (
            <div className="glass-panel overflow-hidden">
              <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tahapan Pekerjaan</h3>
                <span className="text-xs font-bold text-primary">{fmt(totalBiayaStages)}</span>
              </div>
              <div className="divide-y divide-surface-border">
                {spk.stages.map((stage, i) => (
                  <div key={stage.id} className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-[11px] font-bold shrink-0 ${stageStatusStyle(stage.status)}`}>
                      {stage.status === "done" ? <CheckCircle2 size={14} /> : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{stage.nama}</p>
                      <p className="text-[10px] text-muted-foreground">{stage.durasiHari} hari estimasi</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold">{fmt(stage.estimasiBiaya)}</p>
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${stageStatusStyle(stage.status)}`}>
                        {stage.status === "done" ? "Selesai" : stage.status === "in_progress" ? "Berjalan" : "Menunggu"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress Update */}
          {(spk.status === "dikerjakan" || spk.status === "kendala") && (
            <div className="glass-panel p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Update Progress Manual</h3>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0} max={100} step={5}
                  value={progress}
                  onChange={e => setProgress(Number(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <span className="text-sm font-bold w-12 text-right">{progress}%</span>
                <button
                  onClick={handleUpdateProgress}
                  disabled={updatingProgress || progress === spk.progress}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {updatingProgress ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Simpan
                </button>
              </div>
            </div>
          )}

          {/* Garansi */}
          {spk.garansi && spk.garansi.length > 0 && (
            <div className="glass-panel p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><BadgeCheck size={12} />Garansi</h3>
              <div className="space-y-2">
                {spk.garansi.map(g => (
                  <div key={g.id} className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${g.status === "aktif" ? "bg-emerald-500/5 border-emerald-500/20" : g.status === "hampir" ? "bg-amber-500/5 border-amber-500/20" : "bg-surface-hover border-surface-border"}`}>
                    <div>
                      <p className="font-medium">{g.itemName}</p>
                      <p className="text-muted-foreground">{fmtDate(g.startDate)} — {fmtDate(g.endDate)}</p>
                    </div>
                    <span className={`font-bold uppercase px-2 py-0.5 rounded-full border ${g.status === "aktif" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : g.status === "hampir" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-surface-hover text-muted-foreground border-surface-border"}`}>
                      {g.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {transitions.length > 0 && (
            <div className="glass-panel p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ubah Status SPK</h3>
              <div className="flex flex-wrap gap-2">
                {transitions.map(t => (
                  <button
                    key={t.value}
                    onClick={() => openStatusModal(t.value)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${t.color}`}
                  >
                    {t.value === "selesai" && <CheckCircle2 size={15} />}
                    {t.value === "kendala" && <AlertTriangle size={15} />}
                    {t.value === "dikerjakan" && <Wrench size={15} />}
                    {t.value === "dibatalkan" && <Ban size={15} />}
                    {t.label}
                  </button>
                ))}
                {spk.pembayaran?.[0]?.id && (
                  <Link href={`/app/pembayaran/${spk.pembayaran[0].id}`} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-surface-border hover:bg-surface-hover transition-all bg-surface">
                    Bayar / Kasir
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Status Update Modal ── */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-surface border border-surface-border shadow-2xl rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-surface-border flex justify-between items-center">
              <h3 className="font-bold">Konfirmasi Ubah Status</h3>
              <button onClick={() => setShowStatusModal(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                Ubah status SPK <span className="font-semibold text-foreground">{spk.noSpk}</span> dari{" "}
                <span className={`font-bold px-2 py-0.5 rounded-full text-xs border ${statusStyle(spk.status)}`}>{spk.status}</span>{" "}
                ke{" "}
                <span className={`font-bold px-2 py-0.5 rounded-full text-xs border ${statusStyle(pendingStatus)}`}>{pendingStatus}</span>
              </p>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Catatan {pendingStatus === "kendala" ? <span className="text-red-500">*</span> : "(opsional)"}
                </label>
                <textarea
                  value={catatan}
                  onChange={e => setCatatan(e.target.value)}
                  rows={3}
                  placeholder={pendingStatus === "kendala" ? "Jelaskan kendala yang terjadi..." : "Tambahkan catatan jika perlu..."}
                  className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowStatusModal(false)} className="px-4 py-2 text-sm font-medium border border-surface-border rounded-xl hover:bg-surface-hover">Batal</button>
                <button
                  onClick={handleUpdateStatus}
                  disabled={updatingStatus || (pendingStatus === "kendala" && !catatan.trim())}
                  className="px-5 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center gap-2"
                >
                  {updatingStatus && <Loader2 size={14} className="animate-spin" />}
                  Konfirmasi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
