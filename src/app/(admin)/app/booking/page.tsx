"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  Loader2, Calendar, Phone, MessageCircle, Check, X, User, Clock,
  Filter, Wrench, ExternalLink, Trash2, Search, ChevronLeft, ChevronRight,
  FileText, ArrowRight, CalendarDays, SlidersHorizontal, Sparkles,
  CheckCircle2, XCircle, TrendingUp, AlertCircle, Edit3, Save
} from "lucide-react";
import { toast } from "sonner";

interface Booking {
  id: number;
  nama: string;
  whatsapp: string;
  jenisKendaraan: string;
  merkTipe: string | null;
  platNomor: string | null;
  layanan: string;
  tanggal: string | null;
  jamPreferensi: string | null;
  keluhan: string | null;
  status: string;
  catatan: string | null;
  sumber: string;
  pelangganId: number | null;
  spkId: number | null;
  createdAt: string;
  pelanggan?: { id: number; name: string; phone: string } | null;
  spk?: { id: number; noSpk: string; status: string } | null;
}

interface Stats {
  total: number;
  baru: number;
  dikonfirmasi: number;
  hari_ini: number;
  converted: number;
  conversionRate: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  baru: { label: "Baru", color: "bg-blue-500/15 text-blue-500 border-blue-500/30", icon: Clock },
  dikonfirmasi: { label: "Dikonfirmasi", color: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", icon: Check },
  selesai: { label: "Selesai", color: "bg-neutral-500/15 text-neutral-500 border-neutral-500/30", icon: CheckCircle2 },
  dibatalkan: { label: "Dibatalkan", color: "bg-red-500/15 text-red-500 border-red-500/30", icon: XCircle },
};

export default function BookingPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("semua");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Search & date filter
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Detail drawer
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Catatan edit
  const [editingCatatanId, setEditingCatatanId] = useState<number | null>(null);
  const [editCatatanValue, setEditCatatanValue] = useState("");

  // Converting
  const [convertingId, setConvertingId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const params: Record<string, string> = { status: filter, page: String(page), limit: "15" };
      if (search.trim()) params.search = search.trim();
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const [bRes, sRes] = await Promise.all([
        api.get<any>("/booking", params),
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
  }, [filter, page, search, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const updateStatus = async (id: number, newStatus: string) => {
    try {
      await api.put(`/booking/${id}`, { status: newStatus });
      toast.success("Status booking diperbarui");
      fetchData();
      if (selectedBooking?.id === id) {
        setSelectedBooking(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch {
      toast.error("Gagal mengupdate status");
    }
  };

  const saveCatatan = async (id: number) => {
    try {
      await api.put(`/booking/${id}`, { catatan: editCatatanValue });
      toast.success("Catatan disimpan");
      setEditingCatatanId(null);
      fetchData();
    } catch {
      toast.error("Gagal menyimpan catatan");
    }
  };

  const convertToSpk = async (id: number) => {
    setConvertingId(id);
    try {
      const res = await api.post<{ spkId: number; noSpk: string }>(`/booking/${id}/convert-to-spk`);
      toast.success(`Booking dikonversi ke ${res.data.noSpk}`);
      fetchData();
      setSelectedBooking(null);
      router.push(`/app/spk/${res.data.spkId}`);
    } catch (err: any) {
      toast.error(err?.message || "Gagal mengkonversi booking");
    } finally {
      setConvertingId(null);
    }
  };

  const deleteBooking = async (id: number) => {
    if (!confirm("Hapus booking ini?")) return;
    try {
      await api.delete(`/booking/${id}`);
      toast.success("Booking dihapus");
      fetchData();
      if (selectedBooking?.id === id) setSelectedBooking(null);
    } catch {
      toast.error("Gagal menghapus booking");
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const formatDateShort = (d: string) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" size={24} /></div>;

  return (
    <>
      <div className="space-y-4 lg:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Booking Online</h1>
            <p className="text-muted-foreground text-sm">Kelola reservasi dari landing page dan konversi ke SPK.</p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: "Total Booking", value: stats.total, icon: Calendar, color: "text-foreground" },
              { label: "Baru", value: stats.baru, icon: Clock, color: "text-blue-500", pulse: stats.baru > 0 },
              { label: "Dikonfirmasi", value: stats.dikonfirmasi, icon: Check, color: "text-emerald-500" },
              { label: "Hari Ini", value: stats.hari_ini, icon: CalendarDays, color: "text-primary" },
              { label: "Konversi → SPK", value: `${stats.conversionRate}%`, icon: TrendingUp, color: "text-purple-500" },
            ].map((s, i) => (
              <div key={i} className="glass-panel p-4 relative overflow-hidden">
                {s.pulse && <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full animate-ping" />}
                {s.pulse && <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full" />}
                <div className="flex items-center justify-between mb-2">
                  <s.icon size={18} className="text-muted-foreground" />
                </div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Search & Filters */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Cari nama, WhatsApp, layanan, plat..."
                className="w-full pl-9 pr-3 py-2 bg-surface border border-surface-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 border rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 ${showFilters ? "border-primary text-primary bg-primary/5" : "border-surface-border text-muted-foreground hover:text-foreground hover:bg-surface-hover"}`}
            >
              <SlidersHorizontal size={14} />
              <span className="hidden sm:inline">Filter</span>
            </button>
          </div>

          {/* Date range filters */}
          {showFilters && (
            <div className="flex flex-wrap gap-3 p-3 glass-panel animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground">Dari Tanggal</label>
                <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                  className="bg-surface border border-surface-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground">Sampai Tanggal</label>
                <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
                  className="bg-surface border border-surface-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              {(dateFrom || dateTo) && (
                <button onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }}
                  className="self-end px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                  Reset
                </button>
              )}
            </div>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {["semua", "baru", "dikonfirmasi", "selesai", "dibatalkan"].map(f => (
            <button key={f} onClick={() => { setFilter(f); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors capitalize relative ${filter === f ? "bg-primary text-white" : "bg-surface-hover text-muted-foreground hover:text-foreground"}`}>
              {f === "semua" ? "Semua" : STATUS_CONFIG[f]?.label || f}
              {f === "baru" && stats && stats.baru > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[9px] rounded-full bg-white/20 font-bold">{stats.baru}</span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        {bookings.length === 0 ? (
          <div className="glass-panel p-12 text-center">
            <Calendar size={40} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              {search ? `Tidak ada hasil untuk "${search}"` : "Belum ada booking."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {bookings.map(b => {
              const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.baru;
              return (
                <div key={b.id} className="glass-panel p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedBooking(b)}>
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
                        {b.spk && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-500 border border-purple-500/30 font-medium">
                            SPK: {b.spk.noSpk}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><Phone size={12} /> {b.whatsapp}</span>
                        <span className="flex items-center gap-1"><Wrench size={12} /> {b.layanan}</span>
                        <span>{b.jenisKendaraan}{b.merkTipe ? ` · ${b.merkTipe}` : ""}</span>
                        {b.platNomor && <span className="font-mono font-bold">{b.platNomor}</span>}
                      </div>
                      {b.keluhan && <p className="text-xs text-muted-foreground bg-surface-hover px-2 py-1 rounded-lg mt-1 line-clamp-1">{b.keluhan}</p>}
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <Clock size={10} /> Dibuat: {formatDate(b.createdAt)}
                        {b.tanggal && <> · Booking: {formatDateShort(b.tanggal)}</>}
                        {b.jamPreferensi && <> · Jam: {b.jamPreferensi}</>}
                      </div>
                    </div>
                    {/* Quick Actions */}
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <a href={`https://wa.me/${b.whatsapp.replace(/^0/, "62")}`} target="_blank" title="Hubungi WhatsApp" className="p-2 rounded-lg hover:bg-emerald-500/10 text-emerald-500 transition-colors"><MessageCircle size={16} /></a>
                      {b.status === "baru" && (
                        <button onClick={() => updateStatus(b.id, "dikonfirmasi")} title="Konfirmasi" className="p-2 rounded-lg hover:bg-emerald-500/10 text-emerald-600 transition-colors"><Check size={16} /></button>
                      )}
                      {!b.spkId && (b.status === "baru" || b.status === "dikonfirmasi") && (
                        <button onClick={() => convertToSpk(b.id)} disabled={convertingId === b.id} title="Konversi ke SPK"
                          className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors disabled:opacity-50">
                          {convertingId === b.id ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                        </button>
                      )}
                      {(b.status === "baru" || b.status === "dikonfirmasi") && (
                        <button onClick={() => updateStatus(b.id, "dibatalkan")} title="Batalkan" className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"><X size={16} /></button>
                      )}
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
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm border border-surface-border rounded-lg disabled:opacity-30 hover:bg-surface-hover flex items-center gap-1"><ChevronLeft size={14} /> Prev</button>
            <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-sm border border-surface-border rounded-lg disabled:opacity-30 hover:bg-surface-hover flex items-center gap-1">Next <ChevronRight size={14} /></button>
          </div>
        )}
      </div>

      {/* ===== Detail Drawer ===== */}
      {selectedBooking && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedBooking(null)} />
          <div className="fixed right-0 top-0 bottom-0 z-[65] w-full sm:w-[480px] bg-background border-l border-surface-border shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-5 border-b border-surface-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  {selectedBooking.nama.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold">{selectedBooking.nama}</h3>
                  <p className="text-xs text-muted-foreground">Booking #{selectedBooking.id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="p-2 rounded-xl hover:bg-surface-hover text-muted-foreground"><X size={18} /></button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Status Badge */}
              <div className="flex items-center gap-2 flex-wrap">
                {(() => {
                  const cfg = STATUS_CONFIG[selectedBooking.status] || STATUS_CONFIG.baru;
                  return <span className={`text-xs px-3 py-1 rounded-full font-medium border ${cfg.color}`}>{cfg.label}</span>;
                })()}
                {selectedBooking.spk && (
                  <button onClick={() => router.push(`/app/spk/${selectedBooking.spk!.id}`)}
                    className="text-xs px-3 py-1 rounded-full bg-purple-500/15 text-purple-500 border border-purple-500/30 font-medium hover:bg-purple-500/25 transition-colors flex items-center gap-1">
                    <FileText size={12} /> {selectedBooking.spk.noSpk}
                  </button>
                )}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-hover text-muted-foreground capitalize">{selectedBooking.sumber || "landing"}</span>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "WhatsApp", value: selectedBooking.whatsapp, icon: Phone },
                  { label: "Layanan", value: selectedBooking.layanan, icon: Wrench },
                  { label: "Kendaraan", value: `${selectedBooking.jenisKendaraan}${selectedBooking.merkTipe ? ' · ' + selectedBooking.merkTipe : ''}`, icon: Wrench },
                  { label: "Plat Nomor", value: selectedBooking.platNomor || "—", icon: FileText },
                  { label: "Tanggal Booking", value: selectedBooking.tanggal ? formatDateShort(selectedBooking.tanggal) : "Secepatnya", icon: Calendar },
                  { label: "Jam Preferensi", value: selectedBooking.jamPreferensi || "Fleksibel", icon: Clock },
                  { label: "Dibuat", value: formatDate(selectedBooking.createdAt), icon: CalendarDays },
                  { label: "Matched Pelanggan", value: selectedBooking.pelanggan ? selectedBooking.pelanggan.name : "Belum", icon: User },
                ].map((item, i) => (
                  <div key={i} className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1"><item.icon size={10} /> {item.label}</p>
                    <p className="text-sm font-medium">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Keluhan */}
              {selectedBooking.keluhan && (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-muted-foreground font-medium">Keluhan / Catatan Customer</p>
                  <p className="text-sm bg-surface-hover p-3 rounded-xl">{selectedBooking.keluhan}</p>
                </div>
              )}

              {/* Admin Catatan */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground font-medium">Catatan Admin</p>
                  {editingCatatanId !== selectedBooking.id && (
                    <button onClick={() => { setEditingCatatanId(selectedBooking.id); setEditCatatanValue(selectedBooking.catatan || ""); }}
                      className="text-[10px] text-primary hover:underline flex items-center gap-0.5"><Edit3 size={10} /> Edit</button>
                  )}
                </div>
                {editingCatatanId === selectedBooking.id ? (
                  <div className="space-y-2">
                    <textarea value={editCatatanValue} onChange={e => setEditCatatanValue(e.target.value)} rows={3}
                      className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Tambahkan catatan..." autoFocus />
                    <div className="flex gap-2">
                      <button onClick={() => saveCatatan(selectedBooking.id)}
                        className="px-3 py-1.5 text-xs bg-primary text-white rounded-lg font-medium flex items-center gap-1"><Save size={12} /> Simpan</button>
                      <button onClick={() => setEditingCatatanId(null)}
                        className="px-3 py-1.5 text-xs border border-surface-border rounded-lg text-muted-foreground hover:text-foreground">Batal</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm bg-surface-hover p-3 rounded-xl">{selectedBooking.catatan || <span className="text-muted-foreground italic">Belum ada catatan</span>}</p>
                )}
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-5 border-t border-surface-border space-y-2">
              {/* Convert to SPK - primary action */}
              {!selectedBooking.spkId && (selectedBooking.status === "baru" || selectedBooking.status === "dikonfirmasi") && (
                <button onClick={() => convertToSpk(selectedBooking.id)} disabled={convertingId === selectedBooking.id}
                  className="w-full btn-glossy bg-primary text-white py-2.5 rounded-xl font-bold text-sm shadow-glossy-primary hover:shadow-glossy-primary-dark flex items-center justify-center gap-2 disabled:opacity-60">
                  {convertingId === selectedBooking.id
                    ? <><Loader2 size={16} className="animate-spin" /> Mengkonversi...</>
                    : <><Sparkles size={16} /> Konversi ke SPK</>}
                </button>
              )}

              <div className="flex gap-2">
                <a href={`https://wa.me/${selectedBooking.whatsapp.replace(/^0/, "62")}`} target="_blank"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">
                  <MessageCircle size={14} /> WhatsApp
                </a>
                {selectedBooking.status === "baru" && (
                  <button onClick={() => { updateStatus(selectedBooking.id, "dikonfirmasi"); setSelectedBooking(prev => prev ? { ...prev, status: "dikonfirmasi" } : null); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium border border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 transition-colors">
                    <Check size={14} /> Konfirmasi
                  </button>
                )}
                {selectedBooking.status === "dikonfirmasi" && (
                  <button onClick={() => { updateStatus(selectedBooking.id, "selesai"); setSelectedBooking(prev => prev ? { ...prev, status: "selesai" } : null); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium border border-blue-500/30 text-blue-500 hover:bg-blue-500/10 transition-colors">
                    <CheckCircle2 size={14} /> Selesai
                  </button>
                )}
                <button onClick={() => deleteBooking(selectedBooking.id)}
                  className="p-2 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors" title="Hapus">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
