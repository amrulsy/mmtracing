"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Star, Clock, CheckCircle, Wrench, Calendar, Phone, Loader2, AlertTriangle, User } from "lucide-react";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/loading-skeleton";

interface SpkItem {
  id: number;
  noSpk: string;
  status: string;
  createdAt: string;
  pelanggan?: { name: string };
  kendaraan?: { name: string; noPolisi: string };
  totalHarga?: number;
}

interface JadwalItem {
  id: number;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  keterangan?: string;
}

interface MekanikDetail {
  id: number;
  name: string;
  phone?: string;
  spesialisasi?: string;
  initial?: string;
  color?: string;
  status: string;
  spk: SpkItem[];
  jadwal: JadwalItem[];
  _count?: { spk: number };
}

const COLORS = ["bg-emerald-500", "bg-blue-500", "bg-purple-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-indigo-500"];

export default function MekanikDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [mekanik, setMekanik] = useState<MekanikDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<MekanikDetail>(`/mekanik/${id}`)
      .then(res => setMekanik(res.data))
      .catch(err => setError(err.message || "Gagal memuat data mekanik"))
      .finally(() => setLoading(false));
  }, [id]);

  const formatRp = (num: number) => `Rp ${Number(num).toLocaleString("id-ID")}`;
  const formatDate = (d: string) => new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

  const getStatusBadge = (status: string) => {
    if (status === "offline") return { label: "⚪ Off / Cuti", style: "bg-surface-hover text-muted-foreground border-surface-border" };
    if (status === "busy") return { label: "🔵 Sedang Kerja", style: "bg-blue-500/10 text-blue-600 border-blue-500/20" };
    return { label: "✅ Available", style: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
  };

  const getSpkStatusStyle = (status: string) => {
    switch (status) {
      case "selesai": return "text-emerald-500";
      case "dikerjakan": return "text-blue-500";
      case "antri": return "text-amber-500";
      default: return "text-muted-foreground";
    }
  };

  if (loading) return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-2xl" />
          <div className="space-y-2"><Skeleton className="h-7 w-40" /><Skeleton className="h-4 w-28" /></div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );

  if (error || !mekanik) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <AlertTriangle size={32} className="text-red-500" />
      <p className="text-muted-foreground text-sm">{error || "Mekanik tidak ditemukan"}</p>
      <div className="flex gap-2">
        <button onClick={() => { setError(null); setLoading(true); api.get<MekanikDetail>(`/mekanik/${id}`).then(r => setMekanik(r.data)).catch(e => setError(e.message)).finally(() => setLoading(false)); }} className="text-primary text-sm font-medium hover:underline">Coba lagi</button>
        <span className="text-muted-foreground">·</span>
        <Link href="/mekanik" className="text-muted-foreground text-sm hover:underline">Kembali ke daftar</Link>
      </div>
    </div>
  );

  const initials = mekanik.initial || mekanik.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const color = mekanik.color || COLORS[mekanik.id % COLORS.length];
  const statusBadge = getStatusBadge(mekanik.status);

  const activeSpk = mekanik.spk.filter(s => s.status === "dikerjakan" || s.status === "antri");
  const historySpk = mekanik.spk.filter(s => s.status === "selesai").slice(0, 5);
  const totalFinished = mekanik.spk.filter(s => s.status === "selesai").length;

  // Upcoming jadwal (future or today)
  const today = new Date().toISOString().split("T")[0];
  const upcomingJadwal = mekanik.jadwal.filter(j => j.tanggal >= today).slice(0, 6);
  const weekDays = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/mekanik" className="p-2 hover:bg-surface-hover rounded-xl border border-surface-border glass transition-colors shrink-0">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={`w-16 h-16 rounded-2xl ${color} text-white flex items-center justify-center text-xl font-bold shadow-lg shrink-0`}>
            {initials}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight truncate">{mekanik.name}</h1>
            <p className="text-muted-foreground text-sm flex items-center gap-1">
              <Wrench size={14} /> {mekanik.spesialisasi || "Umum"}
            </p>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${statusBadge.style}`}>
              {statusBadge.label}
            </span>
          </div>
        </div>
        {mekanik.phone && (
          <a href={`tel:${mekanik.phone}`} className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-surface-border hover:bg-surface-hover transition-colors text-sm font-medium">
            <Phone size={14} /> {mekanik.phone}
          </a>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 text-center">
          <p className="text-xs text-muted-foreground">Total SPK Selesai</p>
          <p className="text-2xl font-bold mt-1 text-emerald-500">{totalFinished}</p>
        </div>
        <div className="glass-panel p-4 text-center">
          <p className="text-xs text-muted-foreground">SPK Aktif</p>
          <p className="text-2xl font-bold mt-1 text-blue-500">{activeSpk.length}</p>
        </div>
        <div className="glass-panel p-4 text-center">
          <p className="text-xs text-muted-foreground">Total SPK (All)</p>
          <p className="text-2xl font-bold mt-1">{mekanik.spk.length}</p>
        </div>
        <div className="glass-panel p-4 text-center">
          <p className="text-xs text-muted-foreground">Telepon</p>
          <p className="text-lg font-bold mt-1 flex items-center justify-center gap-1">
            <Phone size={14} className="text-muted-foreground" />
            <span className="text-sm">{mekanik.phone || "—"}</span>
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* SPK Aktif */}
        <div className="glass-panel p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">SPK Sedang Ditangani</h3>
          <div className="space-y-3">
            {activeSpk.length === 0 ? (
              <div className="p-4 border-2 border-dashed border-surface-border rounded-xl text-center">
                <p className="text-sm text-muted-foreground">Tidak ada SPK aktif — Siap terima SPK baru</p>
              </div>
            ) : activeSpk.map(s => (
              <Link key={s.id} href={`/spk/${s.id}`} className="block p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-background border border-surface-border">{s.noSpk}</span>
                  <span className={`text-[10px] font-bold uppercase ${getSpkStatusStyle(s.status)}`}>{s.status}</span>
                </div>
                <p className="font-semibold text-sm">{s.kendaraan?.name || "—"} — {s.kendaraan?.noPolisi}</p>
                <p className="text-xs text-muted-foreground">{s.pelanggan?.name || "—"} • {formatDate(s.createdAt)}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Jadwal */}
        <div className="glass-panel p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
            <Calendar size={16} /> Jadwal Mendatang
          </h3>
          <div className="space-y-2">
            {upcomingJadwal.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Belum ada jadwal tersimpan</p>
            ) : upcomingJadwal.map(j => {
              const d = new Date(j.tanggal);
              const isToday = j.tanggal.startsWith(today);
              return (
                <div key={j.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${isToday ? "bg-primary/10 border border-primary/20" : "hover:bg-surface-hover/30"}`}>
                  <span className={`w-8 font-bold text-xs shrink-0 ${isToday ? "text-primary" : "text-muted-foreground"}`}>{weekDays[d.getDay()]}</span>
                  <div className="flex-1 rounded-md bg-emerald-500/15 px-2 py-1">
                    <p className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                      {j.jamMulai} – {j.jamSelesai}
                      {j.keterangan && <span className="ml-1 opacity-70">· {j.keterangan}</span>}
                    </p>
                  </div>
                  {isToday && <span className="text-[10px] font-bold text-primary shrink-0">Hari ini</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Riwayat Pekerjaan */}
      <div className="glass-panel p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Riwayat Pekerjaan Terakhir</h3>
        <div className="space-y-2">
          {historySpk.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Belum ada riwayat pekerjaan selesai</p>
          ) : historySpk.map(h => (
            <Link key={h.id} href={`/spk/${h.id}`} className="flex items-center gap-4 p-3 rounded-xl border border-surface-border hover:bg-surface-hover/30 transition-colors">
              <CheckCircle size={16} className="text-emerald-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{h.kendaraan?.name || "—"} — {h.kendaraan?.noPolisi || ""}</p>
                <p className="text-[10px] text-muted-foreground">{h.noSpk} • {h.pelanggan?.name || "—"} • {formatDate(h.createdAt)}</p>
              </div>
              {h.totalHarga != null && (
                <span className="text-xs font-bold font-mono text-emerald-500 shrink-0">{formatRp(h.totalHarga)}</span>
              )}
              <Clock size={12} className="text-muted-foreground shrink-0" />
            </Link>
          ))}
          {mekanik.spk.filter(s => s.status === "selesai").length > 5 && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              +{mekanik.spk.filter(s => s.status === "selesai").length - 5} riwayat lainnya
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
