"use client";

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Printer, CheckCircle2, AlertTriangle, Clock, Loader2,
  Wrench, User, Car, FileText, Package, ChevronRight, X, Save,
  Trash2, AlertCircle, Phone, CalendarClock, BadgeCheck, Ban, Receipt,
  Edit, Copy, MessageCircle, Plus, UserCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { useAuth } from "@/lib/auth";
import type { Spk, Mekanik, Sparepart, Jasa } from "@/lib/types";
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

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ keluhan: "", judulProyek: "", spesifikasi: "", prioritas: "normal", catatan: "", estimasiSelesai: "" });
  const [editSaving, setEditSaving] = useState(false);

  // Assign mekanik
  const [showAssign, setShowAssign] = useState(false);
  const [mekanikList, setMekanikList] = useState<Mekanik[]>([]);
  const [assignMekanikId, setAssignMekanikId] = useState<string>("");
  const [assignSaving, setAssignSaving] = useState(false);

  // Add item modal
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ type: "jasa" as "jasa" | "sparepart", sparepartId: "", jasaId: "", nama: "", qty: 1, hargaSatuan: 0 });
  const [sparepartList, setSparepartList] = useState<Sparepart[]>([]);
  const [jasaList, setJasaList] = useState<Jasa[]>([]);
  const [addItemSaving, setAddItemSaving] = useState(false);

  // Add stage modal
  const [showAddStage, setShowAddStage] = useState(false);
  const [newStage, setNewStage] = useState({ nama: "", estimasiBiaya: 0, durasiHari: 1 });
  const [addStageSaving, setAddStageSaving] = useState(false);

  // WA modal
  const [sendingWA, setSendingWA] = useState<string>("");

  // Checklist progress modal
  const [showChecklist, setShowChecklist] = useState(false);
  const [togglingId, setTogglingId] = useState<string>(""); // "item-1" | "stage-2"

  const handleToggleItem = async (itemId: number, current: string) => {
    const next = current === "done" ? "pending" : "done";
    setTogglingId(`item-${itemId}`);
    try {
      const res = await api.patch<Spk>(`/spk/${id}/items/${itemId}`, { status: next });
      setSpk(res.data);
      setProgress(res.data.progress ?? 0);
    } catch (err: unknown) {
      toast.error("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setTogglingId("");
    }
  };

  const handleToggleStage = async (stageId: number, current: string) => {
    // pending -> in_progress -> done -> pending
    const next = current === "pending" ? "in_progress" : current === "in_progress" ? "done" : "pending";
    setTogglingId(`stage-${stageId}`);
    try {
      const res = await api.patch<Spk>(`/spk/${id}/stages/${stageId}`, { status: next });
      setSpk(res.data);
      setProgress(res.data.progress ?? 0);
    } catch (err: unknown) {
      toast.error("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setTogglingId("");
    }
  };

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

  // Esc close modals
  useEffect(() => {
    const any = showStatusModal || showEdit || showAssign || showAddItem || showAddStage || showChecklist;
    if (!any) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showStatusModal) setShowStatusModal(false);
      else if (showChecklist) setShowChecklist(false);
      else if (showEdit) setShowEdit(false);
      else if (showAssign) setShowAssign(false);
      else if (showAddItem) setShowAddItem(false);
      else if (showAddStage) setShowAddStage(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showStatusModal, showEdit, showAssign, showAddItem, showAddStage, showChecklist]);

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

      // Auto-redirect ke pembayaran kalau status menjadi selesai dan masih ada sisa tagihan
      if (pendingStatus === "selesai") {
        const updated = res.data;
        const sisa = updated.pembayaran?.[0]?.sisaBayar ?? Math.max(0, Number(updated.totalHarga) - Number(updated.diskon ?? 0) - Number(updated.totalBayar));
        const payId = updated.pembayaran?.[0]?.id;
        if (Number(sisa) > 0 && payId) {
          toast.info?.("Lanjut ke Pembayaran", `Sisa tagihan ${fmt(Number(sisa))} — mengarahkan ke kasir...`);
          setTimeout(() => router.push(`/app/pembayaran/${payId}`), 800);
        }
      }
    } catch (err: unknown) {
      toast.error("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const openEdit = () => {
    if (!spk) return;
    setEditForm({
      keluhan: spk.keluhan || "",
      judulProyek: spk.judulProyek || "",
      spesifikasi: spk.spesifikasi || "",
      prioritas: spk.prioritas,
      catatan: spk.catatan || "",
      estimasiSelesai: spk.estimasiSelesai ? spk.estimasiSelesai.slice(0, 10) : "",
    });
    setShowEdit(true);
  };

  const handleEdit = async () => {
    if (!spk) return;
    setEditSaving(true);
    try {
      const res = await api.put<Spk>(`/spk/${id}`, {
        keluhan: editForm.keluhan,
        judulProyek: editForm.judulProyek,
        spesifikasi: editForm.spesifikasi,
        prioritas: editForm.prioritas,
        catatan: editForm.catatan,
        estimasiSelesai: editForm.estimasiSelesai ? new Date(editForm.estimasiSelesai).toISOString() : null,
      });
      setSpk(res.data);
      toast.success("Berhasil", "SPK diperbarui");
      setShowEdit(false);
    } catch (err: unknown) {
      toast.error("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setEditSaving(false);
    }
  };

  const openAssign = async () => {
    setAssignMekanikId(spk?.mekanikId?.toString() || "");
    if (mekanikList.length === 0) {
      try {
        const res = await api.getPaginated<Mekanik>("/mekanik", { limit: 100 });
        setMekanikList(res.data);
      } catch { /* silent */ }
    }
    setShowAssign(true);
  };

  const handleAssign = async () => {
    setAssignSaving(true);
    try {
      const res = await api.put<Spk>(`/spk/${id}/mekanik`, {
        mekanikId: assignMekanikId ? Number(assignMekanikId) : null,
      });
      setSpk(res.data);
      toast.success("Berhasil", assignMekanikId ? "Mekanik ditugaskan" : "Mekanik di-unassign");
      setShowAssign(false);
    } catch (err: unknown) {
      toast.error("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setAssignSaving(false);
    }
  };

  const openAddItem = async () => {
    setNewItem({ type: "jasa", sparepartId: "", jasaId: "", nama: "", qty: 1, hargaSatuan: 0 });
    // Lazy load lists
    if (sparepartList.length === 0) {
      try {
        const res = await api.getPaginated<Sparepart>("/sparepart", { limit: 200 });
        setSparepartList(res.data);
      } catch { /* silent */ }
    }
    if (jasaList.length === 0) {
      try {
        const res = await api.getPaginated<Jasa>("/jasa", { limit: 200 });
        setJasaList(res.data);
      } catch { /* silent */ }
    }
    setShowAddItem(true);
  };

  const handleAddItem = async () => {
    if (!newItem.nama.trim() || newItem.hargaSatuan < 0 || newItem.qty < 1) {
      return toast.error("Wajib Diisi", "Nama, qty, dan harga wajib diisi dengan benar.");
    }
    setAddItemSaving(true);
    try {
      const payload: Record<string, unknown> = {
        type: newItem.type,
        nama: newItem.nama.trim(),
        qty: newItem.qty,
        hargaSatuan: newItem.hargaSatuan,
      };
      if (newItem.type === "sparepart" && newItem.sparepartId) payload.sparepartId = Number(newItem.sparepartId);
      if (newItem.type === "jasa" && newItem.jasaId) payload.jasaId = Number(newItem.jasaId);
      await api.post(`/spk/${id}/items`, payload);
      await fetchSpk();
      toast.success("Berhasil", "Item ditambahkan");
      setShowAddItem(false);
    } catch (err: unknown) {
      toast.error("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setAddItemSaving(false);
    }
  };

  const handleRemoveItem = async (itemId: number, itemName: string) => {
    toast.confirm(`Hapus item "${itemName}"?`, async () => {
      try {
        await api.delete(`/spk/${id}/items/${itemId}`);
        await fetchSpk();
        toast.success("Dihapus");
      } catch (err: unknown) {
        toast.error("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan");
      }
    });
  };

  const handleAddStage = async () => {
    if (!newStage.nama.trim()) return toast.error("Wajib Diisi", "Nama tahap wajib diisi.");
    setAddStageSaving(true);
    try {
      await api.post(`/spk/${id}/stages`, newStage);
      await fetchSpk();
      toast.success("Berhasil", "Tahap ditambahkan");
      setShowAddStage(false);
      setNewStage({ nama: "", estimasiBiaya: 0, durasiHari: 1 });
    } catch (err: unknown) {
      toast.error("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setAddStageSaving(false);
    }
  };

  const handleClone = () => {
    if (!spk) return;
    // Simpan template clone ke localStorage; form create akan membacanya
    const template = {
      pelangganId: spk.pelangganId,
      kendaraanId: spk.kendaraanId,
      mekanikId: spk.mekanikId,
      mode: spk.mode,
      prioritas: spk.prioritas,
      keluhan: spk.keluhan,
      judulProyek: spk.judulProyek,
      spesifikasi: spk.spesifikasi,
      items: (spk.items || []).map(i => ({ type: i.type, sparepartId: i.sparepartId, jasaId: i.jasaId, nama: i.nama, qty: i.qty, hargaSatuan: Number(i.hargaSatuan) })),
      stages: (spk.stages || []).map(s => ({ nama: s.nama, estimasiBiaya: Number(s.estimasiBiaya), durasiHari: s.durasiHari })),
    };
    try { localStorage.setItem("mm_spk_clone", JSON.stringify(template)); } catch { /* ignore */ }
    router.push(`/app/spk/create?mode=${spk.mode}&clone=1`);
  };

  const handleSendWA = async (kind: "created" | "selesai" | "progress") => {
    setSendingWA(kind);
    try {
      await api.post(`/spk/${id}/whatsapp`, { kind });
      toast.success("WhatsApp Terkirim", `Notifikasi "${kind}" dikirim ke pelanggan.`);
    } catch (err: unknown) {
      toast.error("Gagal Kirim", err instanceof Error ? err.message : "Pastikan gateway WhatsApp aktif");
    } finally {
      setSendingWA("");
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
          <Link
            href={`/app/spk/${id}/cetak`}
            onClick={() => localStorage.setItem('mm_print_format', 'thermal-80')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-2 border-amber-500/30 text-amber-600 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors"
          >
            <Receipt size={14} /> Struk
          </Link>
          <Link
            href={`/app/spk/${id}/cetak`}
            onClick={() => localStorage.setItem('mm_print_format', 'a4')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold border border-surface-border rounded-xl hover:bg-surface-hover transition-colors"
          >
            <Printer size={14} /> A4
          </Link>
          {spk.status !== "selesai" && spk.status !== "dibatalkan" && (
            <button
              onClick={openEdit}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold border border-surface-border rounded-xl hover:bg-surface-hover transition-colors"
              aria-label="Edit SPK"
            >
              <Edit size={14} /> Edit
            </button>
          )}
          <button
            onClick={handleClone}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold border border-surface-border rounded-xl hover:bg-surface-hover transition-colors"
            aria-label="Clone SPK"
            title="Buat SPK baru berdasarkan data SPK ini"
          >
            <Copy size={14} /> Clone
          </button>
          {spk.pelanggan?.phone && (
            <div className="relative group">
              <button
                disabled={!!sendingWA}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold border border-emerald-500/30 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                aria-label="Kirim WhatsApp"
              >
                {sendingWA ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
                WA
              </button>
              <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-surface-border rounded-xl shadow-2xl p-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                <button onClick={() => handleSendWA("created")} className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-surface-hover">SPK Dibuat (invoice)</button>
                <button onClick={() => handleSendWA("progress")} className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-surface-hover">Update Progress</button>
                <button onClick={() => handleSendWA("selesai")} className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-surface-hover">Siap Ambil (Selesai)</button>
              </div>
            </div>
          )}
          {isAdmin && spk.status !== "selesai" && spk.status !== "dibatalkan" && (
            <button onClick={handleDelete} className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-red-500/30 text-red-500 rounded-xl hover:bg-red-500/10 transition-colors" aria-label="Hapus SPK">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* ── Bayar CTA prominent (B8) ── */}
      {Number(sisaBayar) > 0 && spk.pembayaran?.[0]?.id && (spk.status === "selesai" || spk.status === "dikerjakan") && (
        <Link
          href={`/app/pembayaran/${spk.pembayaran[0].id}`}
          className="glass-panel p-4 flex items-center justify-between gap-4 border-2 border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
              <Receipt size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Sisa Tagihan</p>
              <p className="text-xl font-bold text-amber-900 dark:text-amber-300">{fmt(Number(sisaBayar))}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-amber-500 text-white shadow-glossy-primary">
            Bayar Sekarang <ChevronRight size={16} />
          </div>
        </Link>
      )}

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
          
          {/* Pelanggan (E2: deep link) */}
          <Link
            href={`/app/kendaraan?id=${spk.pelangganId}`}
            className="glass-panel p-4 space-y-3 block hover:bg-surface-hover/40 transition-colors"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Pelanggan</span>
              <ChevronRight size={14} className="opacity-60" />
            </h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                {spk.pelanggan?.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={spk.pelanggan.photoUrl} alt={spk.pelanggan.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{spk.pelanggan?.name?.charAt(0) || "?"}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{spk.pelanggan?.name || "—"}</p>
                {spk.pelanggan?.phone && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone size={10} />{spk.pelanggan.phone}
                  </span>
                )}
              </div>
            </div>
          </Link>

          {/* Kendaraan */}
          {spk.kendaraan && (
            <div className="glass-panel p-4 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Car size={12} />Kendaraan</h3>
              <p className="font-semibold text-sm">{spk.kendaraan.name}</p>
              <span className="text-xs font-mono bg-surface-hover border border-surface-border px-2 py-0.5 rounded">{spk.kendaraan.plat}</span>
              {spk.kendaraan.tahun && <p className="text-xs text-muted-foreground">Tahun {spk.kendaraan.tahun}{spk.kendaraan.warna ? ` • ${spk.kendaraan.warna}` : ""}</p>}
            </div>
          )}

          {/* Mekanik (A2: assign inline) */}
          <div className="glass-panel p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Wrench size={12} />Mekanik</h3>
              {spk.status !== "selesai" && spk.status !== "dibatalkan" && (
                <button
                  onClick={openAssign}
                  className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <UserCheck size={10} /> {spk.mekanik ? "Ganti" : "Assign"}
                </button>
              )}
            </div>
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
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertCircle size={14} />
                <span className="text-xs">Belum ditugaskan. Wajib diassign sebelum dikerjakan.</span>
              </div>
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

          {/* Items (A4: add/remove inline) */}
          {(spk.items && spk.items.length > 0) || (spk.mode === "rutin" && spk.status !== "selesai" && spk.status !== "dibatalkan") ? (
            <div className="glass-panel overflow-hidden">
              <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Package size={12} />Item Pekerjaan</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary">{fmt(totalBiayaItems)}</span>
                  {spk.status !== "selesai" && spk.status !== "dibatalkan" && (
                    <button
                      onClick={openAddItem}
                      className="text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded-lg flex items-center gap-1"
                      aria-label="Tambah item"
                    >
                      <Plus size={11} /> Tambah
                    </button>
                  )}
                </div>
              </div>
              {(spk.items || []).length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">Belum ada item.</div>
              ) : (
                <div className="divide-y divide-surface-border">
                  {(spk.items || []).map(item => (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => spk.status !== "selesai" && spk.status !== "dibatalkan" && handleToggleItem(item.id, item.status ?? "pending")}
                        disabled={spk.status === "selesai" || spk.status === "dibatalkan" || togglingId === `item-${item.id}`}
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${item.status === "done" ? "bg-emerald-500 text-white" : "bg-surface-hover text-muted-foreground border border-surface-border hover:border-emerald-500"} disabled:opacity-60 disabled:cursor-not-allowed`}
                        aria-label={item.status === "done" ? "Batalkan tanda selesai" : "Tandai selesai"}
                        title={item.status === "done" ? "Tandai belum selesai" : "Tandai selesai"}
                      >
                        {togglingId === `item-${item.id}` ? <Loader2 size={12} className="animate-spin" /> : item.status === "done" ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.nama}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{item.type}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold">{fmt(item.subtotal)}</p>
                        <p className="text-[10px] text-muted-foreground">{fmt(item.hargaSatuan)} × {item.qty}</p>
                      </div>
                      {spk.status !== "selesai" && spk.status !== "dibatalkan" && (
                        <button
                          onClick={() => handleRemoveItem(item.id, item.nama)}
                          className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          aria-label={`Hapus ${item.nama}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* Stages (A4: add inline) */}
          {(spk.stages && spk.stages.length > 0) || ((spk.mode === "modifikasi" || spk.mode === "bubut") && spk.status !== "selesai" && spk.status !== "dibatalkan") ? (
            <div className="glass-panel overflow-hidden">
              <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tahapan Pekerjaan</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary">{fmt(totalBiayaStages)}</span>
                  {spk.status !== "selesai" && spk.status !== "dibatalkan" && (
                    <button
                      onClick={() => setShowAddStage(true)}
                      className="text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded-lg flex items-center gap-1"
                      aria-label="Tambah tahap"
                    >
                      <Plus size={11} /> Tambah
                    </button>
                  )}
                </div>
              </div>
              {(spk.stages || []).length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">Belum ada tahapan.</div>
              ) : (
                <div className="divide-y divide-surface-border">
                  {(spk.stages || []).map((stage, i) => (
                    <div key={stage.id} className="flex items-center gap-3 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => spk.status !== "selesai" && spk.status !== "dibatalkan" && handleToggleStage(stage.id, stage.status)}
                        disabled={spk.status === "selesai" || spk.status === "dibatalkan" || togglingId === `stage-${stage.id}`}
                        className={`w-7 h-7 rounded-full border flex items-center justify-center text-[11px] font-bold shrink-0 transition-all ${stageStatusStyle(stage.status)} disabled:cursor-not-allowed`}
                        aria-label={`Ubah status tahap ${stage.nama}`}
                        title="Klik untuk siklus status: pending → in_progress → done"
                      >
                        {togglingId === `stage-${stage.id}` ? <Loader2 size={12} className="animate-spin" /> : stage.status === "done" ? <CheckCircle2 size={14} /> : i + 1}
                      </button>
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
              )}
            </div>
          ) : null}

          {/* Progress Update */}
          {(spk.status === "dikerjakan" || spk.status === "kendala") && (
            <div className="glass-panel p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Update Progress</h3>
                {((spk.items?.length ?? 0) > 0 || (spk.stages?.length ?? 0) > 0) && (
                  <button
                    onClick={() => setShowChecklist(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-primary/10 text-primary border border-primary/30 rounded-lg hover:bg-primary/20 transition-colors"
                  >
                    <CheckCircle2 size={13} /> Checklist Pekerjaan
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0} max={100} step={5}
                  value={progress}
                  onChange={e => setProgress(Number(e.target.value))}
                  className="flex-1 accent-primary"
                  aria-label="Progress manual"
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
              <p className="text-[10px] text-muted-foreground">Tip: progres dihitung otomatis dari checklist. Slider hanya digunakan jika tidak ada item/tahap.</p>
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
          {transitions.length > 0 && (() => {
            const needsDp = ["modifikasi", "bubut"].includes(spk.mode) && Number(spk.minimumDp) > 0;
            const dpKurang = needsDp ? Math.max(0, Number(spk.minimumDp) - Number(spk.totalBayar)) : 0;
            const dpLocked = needsDp && dpKurang > 0;
            const payId = spk.pembayaran?.[0]?.id;
            return (
            <div className="glass-panel p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ubah Status SPK</h3>
              {/* C1: warning kalau antri + belum ada mekanik */}
              {spk.status === "antri" && !spk.mekanikId && (
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs">
                  <AlertCircle size={13} className="shrink-0 mt-0.5" />
                  <span>Tombol <strong>Mulai Kerjakan</strong> tidak tersedia. Assign mekanik terlebih dahulu.</span>
                </div>
              )}
              {/* DP guard untuk modifikasi & bubut */}
              {spk.status === "antri" && dpLocked && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/40 text-xs">
                  <AlertCircle size={14} className="shrink-0 mt-0.5 text-orange-600" />
                  <div className="flex-1">
                    <p className="font-bold text-orange-700 dark:text-orange-400">DP Belum Terpenuhi</p>
                    <p className="text-muted-foreground mt-0.5">
                      SPK <span className="capitalize font-semibold">{spk.mode}</span> wajib bayar DP min. <span className="font-bold">{fmt(Number(spk.minimumDp))}</span> sebelum mulai dikerjakan.
                    </p>
                    <p className="text-muted-foreground mt-0.5">
                      Sudah dibayar: <span className="font-mono font-bold text-emerald-600">{fmt(Number(spk.totalBayar))}</span> • Kurang: <span className="font-mono font-bold text-red-500">{fmt(dpKurang)}</span>
                    </p>
                  </div>
                  {payId && (
                    <Link
                      href={`/app/pembayaran/${payId}`}
                      className="shrink-0 px-3 py-2 text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-lg flex items-center gap-1.5 self-start"
                    >
                      <Receipt size={12} /> Bayar DP
                    </Link>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {transitions.map(t => {
                  const blockedStart = t.value === "dikerjakan" && spk.status === "antri" && (!spk.mekanikId || dpLocked);
                  return (
                    <button
                      key={t.value}
                      onClick={() => openStatusModal(t.value)}
                      disabled={blockedStart}
                      title={blockedStart ? (!spk.mekanikId ? "Assign mekanik dulu" : `DP kurang ${fmt(dpKurang)}`) : undefined}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none ${t.color}`}
                    >
                      {t.value === "selesai" && <CheckCircle2 size={15} />}
                      {t.value === "kendala" && <AlertTriangle size={15} />}
                      {t.value === "dikerjakan" && <Wrench size={15} />}
                      {t.value === "dibatalkan" && <Ban size={15} />}
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
            );
          })()}
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
              {/* Konfirmasi penyelesaian: ringkasan checklist & sisa tagihan */}
              {pendingStatus === "selesai" && (() => {
                const items = spk.items || [];
                const stages = spk.stages || [];
                const pendingItems = items.filter(i => i.status !== "done");
                const pendingStages = stages.filter(s => s.status !== "done");
                const totalUnits = items.length + stages.length;
                const doneUnits = items.filter(i => i.status === "done").length + stages.filter(s => s.status === "done").length;
                return (
                  <div className="space-y-3 rounded-xl border border-surface-border bg-surface-hover/30 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ringkasan Pengerjaan</p>
                      <span className={`text-xs font-bold ${doneUnits === totalUnits ? "text-emerald-600" : "text-amber-600"}`}>
                        {doneUnits}/{totalUnits} selesai
                      </span>
                    </div>
                    {(pendingItems.length > 0 || pendingStages.length > 0) ? (
                      <div className="space-y-1.5">
                        <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                          <AlertTriangle size={12} /> {pendingItems.length + pendingStages.length} pekerjaan belum dicentang selesai:
                        </p>
                        <ul className="text-xs text-muted-foreground space-y-0.5 max-h-24 overflow-y-auto">
                          {pendingItems.map(i => <li key={`pi-${i.id}`}>• {i.nama} <span className="text-[10px] uppercase">({i.type})</span></li>)}
                          {pendingStages.map(s => <li key={`ps-${s.id}`}>• {s.nama} <span className="text-[10px] uppercase">({s.status})</span></li>)}
                        </ul>
                        <button
                          type="button"
                          onClick={() => { setShowStatusModal(false); setShowChecklist(true); }}
                          className="text-xs text-primary font-bold hover:underline"
                        >
                          Buka Checklist →
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 size={12} /> Semua pekerjaan sudah dicentang selesai.
                      </p>
                    )}
                    {/* Ringkasan tagihan */}
                    <div className="border-t border-surface-border pt-2 space-y-0.5 text-xs">
                      <div className="flex justify-between"><span className="text-muted-foreground">Total Tagihan</span><span className="font-mono">{fmt(Number(spk.totalHarga) - Number(spk.diskon ?? 0))}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Sudah Dibayar</span><span className="font-mono text-emerald-600">{fmt(Number(spk.totalBayar))}</span></div>
                      <div className="flex justify-between font-bold"><span>Sisa</span><span className={`font-mono ${Number(sisaBayar) > 0 ? "text-red-500" : "text-emerald-600"}`}>{fmt(Number(sisaBayar))}</span></div>
                      {Number(sisaBayar) > 0 && (
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 italic">Setelah konfirmasi, Anda akan diarahkan ke kasir untuk pelunasan.</p>
                      )}
                    </div>
                  </div>
                );
              })()}
              {/* B11: Warning saat revert dari selesai */}
              {spk.status === "selesai" && pendingStatus === "dikerjakan" && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Peringatan Tindakan Berisiko</p>
                    <p className="mt-0.5">
                      Mengembalikan SPK dari <strong>selesai</strong> akan mempengaruhi garansi & perolehan poin loyalty pelanggan.
                      Operasi ini dibatalkan jika invoice sudah <strong>lunas</strong>.
                    </p>
                  </div>
                </div>
              )}
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

      {/* ── Edit SPK Modal (A3) ── */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-surface border border-surface-border shadow-2xl rounded-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-surface-border flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2"><Edit size={16} /> Edit SPK</h3>
              <button onClick={() => setShowEdit(false)} aria-label="Tutup" className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleEdit(); }} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid md:grid-cols-2 gap-3">
                {spk.mode !== "rutin" && (
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">Judul Proyek</label>
                    <input type="text" value={editForm.judulProyek} onChange={e => setEditForm({ ...editForm, judulProyek: e.target.value })}
                      className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                )}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Keluhan / Deskripsi</label>
                  <textarea value={editForm.keluhan} onChange={e => setEditForm({ ...editForm, keluhan: e.target.value })} rows={3}
                    className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                {spk.mode === "modifikasi" && (
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">Spesifikasi</label>
                    <textarea value={editForm.spesifikasi} onChange={e => setEditForm({ ...editForm, spesifikasi: e.target.value })} rows={2}
                      className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Prioritas</label>
                  <select value={editForm.prioritas} onChange={e => setEditForm({ ...editForm, prioritas: e.target.value })}
                    className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="rendah">Rendah</option>
                    <option value="normal">Normal</option>
                    <option value="tinggi">Tinggi</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Estimasi Selesai</label>
                  <input type="date" value={editForm.estimasiSelesai} onChange={e => setEditForm({ ...editForm, estimasiSelesai: e.target.value })}
                    className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Catatan Internal</label>
                  <textarea value={editForm.catatan} onChange={e => setEditForm({ ...editForm, catatan: e.target.value })} rows={2}
                    className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-surface-border">
                <button type="button" onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm font-medium border border-surface-border rounded-xl hover:bg-surface-hover">Batal</button>
                <button type="submit" disabled={editSaving} className="px-5 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 flex items-center gap-2 disabled:opacity-60">
                  {editSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Assign Mekanik Modal (A2) ── */}
      {showAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-surface border border-surface-border shadow-2xl rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-surface-border flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2"><UserCheck size={16} /> Assign Mekanik</h3>
              <button onClick={() => setShowAssign(false)} aria-label="Tutup" className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-muted-foreground">Pilih mekanik yang akan bertanggung jawab atas SPK ini.</p>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Mekanik</label>
                <select value={assignMekanikId} onChange={e => setAssignMekanikId(e.target.value)}
                  className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="">— Unassign (tidak ada mekanik) —</option>
                  {mekanikList.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}{m.status === "busy" ? " (sedang sibuk)" : ""}{m.spesialisasi ? ` • ${m.spesialisasi}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-surface-border">
                <button type="button" onClick={() => setShowAssign(false)} className="px-4 py-2 text-sm font-medium border border-surface-border rounded-xl hover:bg-surface-hover">Batal</button>
                <button type="button" onClick={handleAssign} disabled={assignSaving} className="px-5 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 flex items-center gap-2 disabled:opacity-60">
                  {assignSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Item Modal (A4) ── */}
      {showAddItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-surface border border-surface-border shadow-2xl rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-surface-border flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2"><Plus size={16} /> Tambah Item</h3>
              <button onClick={() => setShowAddItem(false)} aria-label="Tutup" className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleAddItem(); }} className="p-5 space-y-4">
              <div className="flex gap-1 bg-surface-hover rounded-lg border border-surface-border p-0.5">
                {(["jasa", "sparepart"] as const).map(t => (
                  <button key={t} type="button" onClick={() => setNewItem({ ...newItem, type: t, sparepartId: "", jasaId: "", nama: "", hargaSatuan: 0 })}
                    className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${newItem.type === t ? "bg-background shadow text-foreground border border-surface-border" : "text-muted-foreground"}`}>
                    {t === "jasa" ? "🔧 Jasa" : "📦 Sparepart"}
                  </button>
                ))}
              </div>

              {newItem.type === "sparepart" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Pilih Sparepart</label>
                  <select
                    value={newItem.sparepartId}
                    onChange={e => {
                      const sp = sparepartList.find(x => x.id === Number(e.target.value));
                      setNewItem({
                        ...newItem,
                        sparepartId: e.target.value,
                        nama: sp?.name || newItem.nama,
                        hargaSatuan: sp?.hargaJual ? Number(sp.hargaJual) : newItem.hargaSatuan,
                      });
                    }}
                    className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">— Pilih dari master —</option>
                    {sparepartList.map(sp => (
                      <option key={sp.id} value={sp.id} disabled={(sp.stok ?? 0) < 1}>
                        {sp.name} (stok: {sp.stok ?? 0})
                      </option>
                    ))}
                  </select>
                  {newItem.sparepartId && (() => {
                    const sp = sparepartList.find(x => x.id === Number(newItem.sparepartId));
                    if (sp && newItem.qty > (sp.stok ?? 0)) {
                      return <p className="text-xs text-red-600 flex items-center gap-1 mt-1"><AlertCircle size={11} /> Qty melebihi stok tersedia ({sp.stok ?? 0})</p>;
                    }
                    return null;
                  })()}
                </div>
              )}

              {newItem.type === "jasa" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Pilih Jasa (opsional)</label>
                  <select
                    value={newItem.jasaId}
                    onChange={e => {
                      const j = jasaList.find(x => x.id === Number(e.target.value));
                      setNewItem({
                        ...newItem,
                        jasaId: e.target.value,
                        nama: j?.name || newItem.nama,
                        hargaSatuan: j?.harga ? Number(j.harga) : newItem.hargaSatuan,
                      });
                    }}
                    className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">— Custom / pilih dari master —</option>
                    {jasaList.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nama Item <span className="text-red-500">*</span></label>
                <input type="text" value={newItem.nama} onChange={e => setNewItem({ ...newItem, nama: e.target.value })} required
                  className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Qty</label>
                  <input type="number" min="1" value={newItem.qty} onChange={e => setNewItem({ ...newItem, qty: Math.max(1, Number(e.target.value)) })}
                    className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Harga Satuan</label>
                  <input type="number" min="0" value={newItem.hargaSatuan} onChange={e => setNewItem({ ...newItem, hargaSatuan: Math.max(0, Number(e.target.value)) })}
                    className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">Subtotal: <span className="font-bold text-primary">{fmt(newItem.qty * newItem.hargaSatuan)}</span></p>

              <div className="flex justify-end gap-3 pt-2 border-t border-surface-border">
                <button type="button" onClick={() => setShowAddItem(false)} className="px-4 py-2 text-sm font-medium border border-surface-border rounded-xl hover:bg-surface-hover">Batal</button>
                <button type="submit" disabled={addItemSaving} className="px-5 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 flex items-center gap-2 disabled:opacity-60">
                  {addItemSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Tambah
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Checklist Pekerjaan Modal ── */}
      {showChecklist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-surface border border-surface-border shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-surface-border flex justify-between items-center">
              <div>
                <h3 className="font-bold flex items-center gap-2"><CheckCircle2 size={16} /> Checklist Pekerjaan</h3>
                <p className="text-[11px] text-muted-foreground">Centang pekerjaan yang sudah selesai. Progres SPK terhitung otomatis.</p>
              </div>
              <button onClick={() => setShowChecklist(false)} aria-label="Tutup" className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Progres</span><span className="font-bold">{spk.progress}%</span></div>
                <div className="h-2 bg-surface-border rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${spk.progress}%` }} />
                </div>
              </div>

              {/* Items */}
              {spk.items && spk.items.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Package size={11} /> Item ({spk.items.filter(i => i.status === "done").length}/{spk.items.length})</p>
                  {spk.items.map(item => (
                    <label key={item.id} className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${item.status === "done" ? "bg-emerald-500/5 border-emerald-500/20" : "bg-surface-hover/40 border-surface-border hover:bg-surface-hover"}`}>
                      <button
                        type="button"
                        onClick={() => handleToggleItem(item.id, item.status ?? "pending")}
                        disabled={togglingId === `item-${item.id}` || spk.status === "selesai" || spk.status === "dibatalkan"}
                        className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all ${item.status === "done" ? "bg-emerald-500 text-white" : "bg-surface border-2 border-surface-border hover:border-emerald-500"} disabled:opacity-50`}
                        aria-label={item.status === "done" ? "Batal centang" : "Centang selesai"}
                      >
                        {togglingId === `item-${item.id}` ? <Loader2 size={11} className="animate-spin" /> : item.status === "done" && <CheckCircle2 size={13} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${item.status === "done" ? "line-through text-muted-foreground" : ""}`}>{item.nama}</p>
                        <p className="text-[10px] text-muted-foreground">{item.type} • {fmt(item.hargaSatuan)} × {item.qty} = <span className="font-bold">{fmt(item.subtotal)}</span></p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {/* Stages */}
              {spk.stages && spk.stages.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tahapan ({spk.stages.filter(s => s.status === "done").length}/{spk.stages.length})</p>
                  {spk.stages.map(stage => (
                    <div key={stage.id} className={`flex items-start gap-3 p-2.5 rounded-xl border transition-colors ${stage.status === "done" ? "bg-emerald-500/5 border-emerald-500/20" : stage.status === "in_progress" ? "bg-blue-500/5 border-blue-500/20" : "bg-surface-hover/40 border-surface-border"}`}>
                      <button
                        type="button"
                        onClick={() => handleToggleStage(stage.id, stage.status)}
                        disabled={togglingId === `stage-${stage.id}` || spk.status === "selesai" || spk.status === "dibatalkan"}
                        className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all ${stage.status === "done" ? "bg-emerald-500 text-white" : stage.status === "in_progress" ? "bg-blue-500 text-white" : "bg-surface border-2 border-surface-border hover:border-emerald-500"} disabled:opacity-50`}
                        aria-label="Ubah status tahap"
                        title="pending → in_progress → done"
                      >
                        {togglingId === `stage-${stage.id}` ? <Loader2 size={11} className="animate-spin" /> : stage.status === "done" ? <CheckCircle2 size={13} /> : stage.status === "in_progress" ? <Clock size={11} /> : null}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${stage.status === "done" ? "line-through text-muted-foreground" : ""}`}>{stage.nama}</p>
                        <p className="text-[10px] text-muted-foreground">
                          <span className="capitalize">{stage.status === "in_progress" ? "Berjalan" : stage.status === "done" ? "Selesai" : "Menunggu"}</span>
                          {" • "}{stage.durasiHari} hari • {fmt(stage.estimasiBiaya)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(!spk.items || spk.items.length === 0) && (!spk.stages || spk.stages.length === 0) && (
                <p className="text-sm text-center text-muted-foreground py-6">Tidak ada item / tahapan yang dapat dichecklist.</p>
              )}
            </div>
            <div className="p-4 border-t border-surface-border bg-surface-hover/30 flex justify-end gap-3">
              <button type="button" onClick={() => setShowChecklist(false)} className="px-4 py-2 text-sm font-medium border border-surface-border rounded-xl hover:bg-surface-hover">Tutup</button>
              {spk.status === "dikerjakan" && (() => {
                const totalUnits = (spk.items?.length ?? 0) + (spk.stages?.length ?? 0);
                const doneUnits = (spk.items?.filter(i => i.status === "done").length ?? 0) + (spk.stages?.filter(s => s.status === "done").length ?? 0);
                const allDone = totalUnits > 0 && doneUnits === totalUnits;
                return (
                  <button
                    type="button"
                    onClick={() => { setShowChecklist(false); openStatusModal("selesai"); }}
                    className={`px-5 py-2 text-sm font-bold rounded-xl flex items-center gap-2 transition-all ${allDone ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-glossy-primary" : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/30"}`}
                  >
                    <CheckCircle2 size={14} /> {allDone ? "Selesaikan SPK" : "Selesaikan (paksa)"}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── Add Stage Modal (A4) ── */}
      {showAddStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-surface border border-surface-border shadow-2xl rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-surface-border flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2"><Plus size={16} /> Tambah Tahap</h3>
              <button onClick={() => setShowAddStage(false)} aria-label="Tutup" className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleAddStage(); }} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nama Tahap <span className="text-red-500">*</span></label>
                <input type="text" value={newStage.nama} onChange={e => setNewStage({ ...newStage, nama: e.target.value })} required placeholder="mis. Pengecatan, Bubut Crankshaft"
                  className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Estimasi Biaya</label>
                  <input type="number" min="0" value={newStage.estimasiBiaya} onChange={e => setNewStage({ ...newStage, estimasiBiaya: Math.max(0, Number(e.target.value)) })}
                    className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Durasi (hari)</label>
                  <input type="number" min="1" value={newStage.durasiHari} onChange={e => setNewStage({ ...newStage, durasiHari: Math.max(1, Number(e.target.value)) })}
                    className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-surface-border">
                <button type="button" onClick={() => setShowAddStage(false)} className="px-4 py-2 text-sm font-medium border border-surface-border rounded-xl hover:bg-surface-hover">Batal</button>
                <button type="submit" disabled={addStageSaving} className="px-5 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 flex items-center gap-2 disabled:opacity-60">
                  {addStageSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Tambah
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
