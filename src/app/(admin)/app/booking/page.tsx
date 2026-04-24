"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Loader2, Calendar, Phone, MessageCircle, Check, X, User, Clock, Filter, Wrench, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Booking {
  id: number;
  nama: string;
  whatsapp: string;
  jenisKendaraan: string;
  merkTipe: string | null;
  layanan: string;
  tanggal: string | null;
  keluhan: string | null;
  status: string;
  catatan: string | null;
  createdAt: string;
}

interface Stats {
  total: number;
  baru: number;
  dikonfirmasi: number;
  hari_ini: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  baru: { label: "Baru", color: "bg-blue-500/15 text-blue-500 border-blue-500/30", icon: Clock },
  dikonfirmasi: { label: "Dikonfirmasi", color: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", icon: Check },
  selesai: { label: "Selesai", color: "bg-neutral-500/15 text-neutral-500 border-neutral-500/30", icon: Check },
  dibatalkan: { label: "Dibatalkan", color: "bg-red-500/15 text-red-500 border-red-500/30", icon: X },
};

export default function BookingPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("semua");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = async () => {
    try {
      const [bRes, sRes] = await Promise.all([
        api.get<any>("/booking", { status: filter, page: String(page), limit: "15" }),
        api.get<Stats>("/booking/stats"),
      ]);
      setBookings(bRes.data.data);
      setTotalPages(bRes.data.pagination.totalPages);
      setStats(sRes.data);
    } catch {
      toast.error("Gagal memuat data booking");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filter, page]);

  const updateStatus = async (id: number, newStatus: string) => {
    try {
      await api.put(`/booking/${id}`, { status: newStatus });
      toast.success("Status booking diperbarui");
      fetchData();
    } catch {
      toast.error("Gagal mengupdate status");
    }
  };

  const deleteBooking = async (id: number) => {
    if (!confirm("Hapus booking ini?")) return;
    try {
      await api.delete(`/booking/${id}`);
      toast.success("Booking dihapus");
      fetchData();
    } catch {
      toast.error("Gagal menghapus booking");
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" size={24} /></div>;

  return (
    <div className="space-y-4 lg:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Booking Online</h1>
        <p className="text-muted-foreground text-sm">Kelola reservasi dari landing page.</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total Booking", value: stats.total, icon: Calendar, color: "text-foreground" },
            { label: "Baru (Belum Dikonfirmasi)", value: stats.baru, icon: Clock, color: "text-blue-500" },
            { label: "Dikonfirmasi", value: stats.dikonfirmasi, icon: Check, color: "text-emerald-500" },
            { label: "Hari Ini", value: stats.hari_ini, icon: Calendar, color: "text-primary" },
          ].map((s, i) => (
            <div key={i} className="glass-panel p-4">
              <div className="flex items-center justify-between mb-2">
                <s.icon size={18} className="text-muted-foreground" />
              </div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {["semua", "baru", "dikonfirmasi", "selesai", "dibatalkan"].map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors capitalize ${filter === f ? "bg-primary text-white" : "bg-surface-hover text-muted-foreground hover:text-foreground"}`}>
            {f === "semua" ? "Semua" : STATUS_CONFIG[f]?.label || f}
          </button>
        ))}
      </div>

      {/* List */}
      {bookings.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <Calendar size={40} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Belum ada booking.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bookings.map(b => {
            const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.baru;
            return (
              <div key={b.id} className="glass-panel p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                    {b.nama.charAt(0).toUpperCase()}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm">{b.nama}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-[10px] text-muted-foreground">#{b.id}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Phone size={12} /> {b.whatsapp}</span>
                      <span className="flex items-center gap-1"><Wrench size={12} /> {b.layanan}</span>
                      <span>{b.jenisKendaraan}{b.merkTipe ? ` · ${b.merkTipe}` : ""}</span>
                    </div>
                    {b.keluhan && <p className="text-xs text-muted-foreground bg-surface-hover px-2 py-1 rounded-lg mt-1">{b.keluhan}</p>}
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <Clock size={10} /> Dibuat: {formatDate(b.createdAt)}
                      {b.tanggal && <> · Booking: {new Date(b.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</>}
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <a href={`https://wa.me/${b.whatsapp.replace(/^0/, "62")}`} target="_blank" title="Hubungi WhatsApp" className="p-2 rounded-lg hover:bg-emerald-500/10 text-emerald-500 transition-colors"><MessageCircle size={16} /></a>
                    {b.status === "baru" && (
                      <button onClick={() => updateStatus(b.id, "dikonfirmasi")} title="Konfirmasi" className="p-2 rounded-lg hover:bg-emerald-500/10 text-emerald-600 transition-colors"><Check size={16} /></button>
                    )}
                    {b.status === "dikonfirmasi" && (
                      <button onClick={() => updateStatus(b.id, "selesai")} title="Selesai" className="p-2 rounded-lg hover:bg-blue-500/10 text-blue-500 transition-colors"><Check size={16} /></button>
                    )}
                    {(b.status === "baru" || b.status === "dikonfirmasi") && (
                      <button onClick={() => updateStatus(b.id, "dibatalkan")} title="Batalkan" className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"><X size={16} /></button>
                    )}
                    <button onClick={() => deleteBooking(b.id)} title="Hapus" className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm border border-surface-border rounded-lg disabled:opacity-30 hover:bg-surface-hover">Prev</button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-sm border border-surface-border rounded-lg disabled:opacity-30 hover:bg-surface-hover">Next</button>
        </div>
      )}
    </div>
  );
}
