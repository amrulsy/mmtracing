"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { UserPlus, Wrench, Phone, AlertTriangle, X, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { Mekanik } from "@/lib/types";
import { Skeleton } from "@/components/ui/loading-skeleton";
import { toast } from "@/lib/toast";

interface MekanikWithCount extends Mekanik {
  _count?: { spk: number };
  initial?: string;
  color?: string;
}

export default function MekanikPage() {
  const [mekaniks, setMekaniks] = useState<MekanikWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", spesialisasi: "", initial: "" });

  const fetchData = useCallback(() => {
    api.get<MekanikWithCount[]>("/mekanik")
      .then((res) => setMekaniks(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const colors = ["bg-emerald-500", "bg-blue-500", "bg-purple-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-indigo-500"];

  const getStatusInfo = (m: MekanikWithCount) => {
    const activeSpk = m.spk?.length || 0;
    if (m.status === "offline") return { label: "⚪ Off", style: "bg-surface-hover text-muted-foreground border-surface-border" };
    if (activeSpk > 0) return { label: `🔵 Busy (${activeSpk} SPK)`, style: "bg-blue-500/10 text-blue-600 border-blue-500/20" };
    return { label: "✅ Available", style: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
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

  const available = mekaniks.filter(m => m.status !== "offline" && (!m.spk || m.spk.length === 0)).length;
  const busy = mekaniks.filter(m => m.spk && m.spk.length > 0).length;
  const off = mekaniks.filter(m => m.status === "offline").length;

  const handleTambah = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Validasi", "Nama mekanik wajib diisi");
    setSubmitting(true);
    try {
      await api.post("/mekanik", {
        name: form.name.trim(),
        phone: form.phone || undefined,
        spesialisasi: form.spesialisasi || undefined,
        initial: form.initial || form.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase(),
      });
      toast.success("Ditambahkan", `Mekanik ${form.name} berhasil ditambahkan`);
      setShowModal(false);
      setForm({ name: "", phone: "", spesialisasi: "", initial: "" });
      fetchData();
    } catch (err: unknown) {
      toast.error("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Tim Mekanik</h1>
          <p className="text-muted-foreground">Kelola data mekanik, spesialisasi, dan jadwal ketersediaan.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 btn-glossy bg-primary text-primary-foreground px-4 py-2 rounded-xl font-medium shadow-glossy-primary hover:shadow-glossy-primary-dark"
        >
          <UserPlus size={20} /> Tambah Mekanik
        </button>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-panel p-4 text-center"><Skeleton className="h-8 w-8 mx-auto mb-1" /><Skeleton className="h-3 w-16 mx-auto" /></div>
          ))
        ) : (
          <>
            <div className="glass-panel p-4 text-center border-l-4 border-l-emerald-500">
              <p className="text-2xl font-bold text-emerald-500">{available}</p>
              <p className="text-xs text-muted-foreground">Available</p>
            </div>
            <div className="glass-panel p-4 text-center border-l-4 border-l-blue-500">
              <p className="text-2xl font-bold text-blue-500">{busy}</p>
              <p className="text-xs text-muted-foreground">Sedang Kerja</p>
            </div>
            <div className="glass-panel p-4 text-center border-l-4 border-l-slate-400">
              <p className="text-2xl font-bold text-muted-foreground">{off}</p>
              <p className="text-xs text-muted-foreground">Off / Cuti</p>
            </div>
          </>
        )}
      </div>

      {/* Mechanic Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-panel p-5 space-y-4">
              <div className="flex items-start gap-4">
                <Skeleton className="w-14 h-14 rounded-2xl" />
                <div className="space-y-2 flex-1"><Skeleton className="h-5 w-32" /><Skeleton className="h-3 w-24" /><Skeleton className="h-4 w-20" /></div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-surface-border">
                <Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" />
              </div>
            </div>
          ))
        ) : (
          mekaniks.map((m, i) => {
            const initials = m.initial || m.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
            const color = m.color || colors[i % colors.length];
            const statusInfo = getStatusInfo(m);
            return (
              <Link key={m.id} href={`/mekanik/${m.id}`} className="glass-panel p-5 hover:-translate-y-1 hover:shadow-glossy transition-all cursor-pointer group">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-14 h-14 rounded-2xl ${color} text-white flex items-center justify-center text-lg font-bold shadow-lg`}>
                    {initials}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{m.name}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Wrench size={12} />{m.spesialisasi || "Umum"}</p>
                    <div className="mt-1">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${statusInfo.style}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-surface-border">
                  <div className="text-center">
                    <p className="text-lg font-bold">{m._count?.spk || 0}</p>
                    <p className="text-[10px] text-muted-foreground">Total SPK</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold flex items-center justify-center gap-0.5"><Phone size={14} className="text-muted-foreground" />{m.phone || "—"}</p>
                    <p className="text-[10px] text-muted-foreground">Telepon</p>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Tambah Mekanik Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-background border border-surface-border rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-surface-border flex justify-between items-center bg-surface-hover/30">
              <h3 className="font-bold flex items-center gap-2"><UserPlus size={16} className="text-primary" /> Tambah Mekanik Baru</h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <form onSubmit={handleTambah} className="p-5 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Nama Lengkap <span className="text-red-500">*</span></label>
                <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Contoh: Budi Santoso" className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">No. Telepon</label>
                  <input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="08xxx" className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Inisial (maks 5 huruf)</label>
                  <input type="text" maxLength={5} value={form.initial} onChange={e => setForm(f => ({ ...f, initial: e.target.value.toUpperCase() }))} placeholder="Auto dari nama" className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Spesialisasi</label>
                <input type="text" value={form.spesialisasi} onChange={e => setForm(f => ({ ...f, spesialisasi: e.target.value }))} placeholder="Contoh: Motor Matic, Modifikasi, Bubut" className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <button type="submit" disabled={submitting || !form.name.trim()} className="w-full mt-2 py-2.5 bg-primary text-white font-bold rounded-xl disabled:opacity-50 flex justify-center items-center gap-2 btn-glossy shadow-glossy-primary">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <><UserPlus size={16} /> Tambah Mekanik</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
