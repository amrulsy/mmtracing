"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, Wrench, Calendar as Cal, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

interface Jadwal {
  id: number;
  tanggal: string; // ISO string
  jamMulai: string; // HH:mm
  jamSelesai: string; // HH:mm
  namaBooking: string;
  pekerjaan: string;
  kategori: string;
  warna?: string;
  mekanik?: { name: string; initial: string };
  spk?: { noSpk: string; status: string };
}

export default function JadwalPage() {
  const [view, setView] = useState<"week" | "list">("week");
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [bookings, setBookings] = useState<Jadwal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const hours = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

  // Helper to get start and end of week
  const getWeekRange = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // Adjust if you want Monday as first day
    const start = new Date(d.setDate(diff));
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };

  const { start: weekStart, end: weekEnd } = getWeekRange(currentWeek);

  const fetchJadwal = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getWeekRange(currentWeek);
      const res = await api.get<Jadwal[]>("/jadwal", {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      });
      setBookings(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat jadwal");
    } finally {
      setLoading(false);
    }
  }, [currentWeek]);

  useEffect(() => {
    fetchJadwal();
  }, [fetchJadwal]);

  const navWeek = (dir: "prev" | "next") => {
    const next = new Date(currentWeek);
    next.setDate(next.getDate() + (dir === "next" ? 7 : -7));
    setCurrentWeek(next);
  };

  // Build grid days
  const gridDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const getCategoryTheme = (kat: string) => {
    switch (kat) {
      case "modifikasi": return { color: "bg-primary/20 border-primary/40 text-red-700 dark:text-red-300", bg: "bg-primary" };
      case "bubut": return { color: "bg-purple-500/20 border-purple-500/40 text-purple-700 dark:text-purple-300", bg: "bg-purple-500" };
      case "booking": return { color: "bg-amber-500/20 border-amber-500/40 text-amber-700 dark:text-amber-300", bg: "bg-amber-500" };
      case "fleet": return { color: "bg-cyan-500/20 border-cyan-500/40 text-cyan-700 dark:text-cyan-300", bg: "bg-cyan-500" };
      default: return { color: "bg-blue-500/20 border-blue-500/40 text-blue-700 dark:text-blue-300", bg: "bg-blue-500" };
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Jadwal & Booking</h1>
          <p className="text-muted-foreground text-sm">Kalender penjadwalan mekanik dan booking pelanggan.</p>
        </div>
        <button className="flex items-center justify-center gap-1.5 btn-glossy bg-primary text-primary-foreground px-3 py-2 rounded-xl text-sm font-medium shadow-glossy-primary hover:shadow-glossy-primary-dark">
          <Plus size={16} /> Tambah Booking
        </button>
      </div>

      {/* Week Nav */}
      <div className="flex items-center justify-between glass-panel px-4 lg:px-6 py-3">
        <button onClick={() => navWeek("prev")} className="p-1.5 hover:bg-surface-hover rounded-lg"><ChevronLeft size={20} /></button>
        <div className="text-center">
          <p className="font-bold text-sm lg:text-base">
            {weekStart.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} — {weekEnd.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <button onClick={() => navWeek("next")} className="p-1.5 hover:bg-surface-hover rounded-lg"><ChevronRight size={20} /></button>
      </div>

      {/* View Toggle (mobile) */}
      <div className="flex lg:hidden gap-1 bg-surface-hover rounded-lg border border-surface-border p-0.5">
        <button onClick={() => setView("list")} className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${view === "list" ? "bg-background shadow border border-surface-border" : "text-muted-foreground"}`}>📋 List</button>
        <button onClick={() => setView("week")} className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${view === "week" ? "bg-background shadow border border-surface-border" : "text-muted-foreground"}`}>📅 Grid</button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Servis Rutin", bg: "bg-blue-500" },
          { label: "Modifikasi", bg: "bg-primary" },
          { label: "Jasa Bubut", bg: "bg-purple-500" },
          { label: "Booking", bg: "bg-amber-500" },
          { label: "Fleet", bg: "bg-cyan-500" },
        ].map((l, i) => (
          <span key={i} className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className={`w-2 h-2 rounded-full ${l.bg}`} />{l.label}</span>
        ))}
      </div>

      {loading ? (
        <div className="glass-panel min-h-[400px] flex items-center justify-center">
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="glass-panel p-8 text-center flex flex-col items-center gap-3">
          <p className="text-red-500">{error}</p>
          <button onClick={fetchJadwal} className="text-xs px-3 py-1.5 border border-red-500/30 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20">Coba Lagi</button>
        </div>
      ) : (
        <>
          {/* Mobile List View */}
          {view === "list" && (
            <div className="lg:hidden space-y-4">
              {gridDays.map((date, di) => {
                const dateStr = date.toISOString().split("T")[0];
                const dayBookings = bookings.filter(b => b.tanggal.startsWith(dateStr));
                if (dayBookings.length === 0) return null;
                return (
                  <div key={di}>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">{days[date.getDay()]}, {date.getDate()}</p>
                    <div className="space-y-1.5">
                      {dayBookings.map((b) => {
                        const theme = getCategoryTheme(b.kategori);
                        return (
                          <div key={b.id} className={`p-3 rounded-xl border ${theme.color}`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-bold">{b.namaBooking}</p>
                                <p className="text-xs opacity-75">{b.pekerjaan || "—"}</p>
                              </div>
                              <span className="text-[10px] font-mono opacity-60">{b.jamMulai} - {b.jamSelesai}</span>
                            </div>
                            <p className="text-[10px] opacity-60 mt-1 flex items-center gap-0.5"><Wrench size={10} />{b.mekanik?.name || "Belum Ditugaskan"}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {bookings.length === 0 && <div className="text-center p-8 text-muted-foreground">Tidak ada jadwal</div>}
            </div>
          )}

          {/* Desktop / Mobile Grid View */}
          <div className={view === "week" ? "" : "hidden lg:block"}>
            <div className="glass-panel overflow-hidden">
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-surface-border bg-surface-hover/30">
                    <div className="p-3" />
                    {gridDays.map((d, i) => {
                      const isToday = new Date().toDateString() === d.toDateString();
                      return (
                        <div key={i} className={`p-3 text-center border-l border-surface-border ${isToday ? "bg-primary/5" : ""}`}>
                          <p className={`text-sm font-bold ${isToday ? "text-primary" : ""}`}>{days[d.getDay()]}</p>
                          <p className="text-xs text-muted-foreground">{d.getDate()} {d.toLocaleDateString('id-ID', {month: 'short'})}</p>
                        </div>
                      );
                    })}
                  </div>
                  {hours.map((hour, hi) => {
                    const hourPrefix = hour.split(":")[0];
                    return (
                      <div key={hi} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-surface-border/50 min-h-[60px]">
                        <div className="p-2 text-[10px] text-muted-foreground font-mono text-right pr-3 pt-3">{hour}</div>
                        {gridDays.map((d, di) => {
                          const todayStr = d.toISOString().split("T")[0];
                          const cellBookings = bookings.filter(b => {
                            const bDateStr = b.tanggal.startsWith("T") ? b.tanggal : b.tanggal.split("T")[0];
                            const normalizedJam = b.jamMulai.length < 5 ? b.jamMulai.padStart(5, "0") : b.jamMulai;
                            return bDateStr === todayStr && normalizedJam.startsWith(hourPrefix);
                          });

                          return (
                            <div key={di} className={`border-l border-surface-border/50 relative p-1 space-y-1`}>
                              {cellBookings.map(booking => {
                                const theme = getCategoryTheme(booking.kategori);
                                return (
                                  <div key={booking.id} className={`rounded-lg border p-1.5 cursor-pointer hover:shadow-sm transition-shadow z-10 w-full ${theme.color}`}>
                                    <p className="text-[10px] font-bold truncate">{booking.namaBooking}</p>
                                    <p className="text-[9px] opacity-75 truncate">{booking.pekerjaan}</p>
                                    <p className="text-[9px] opacity-60 truncate flex items-center gap-0.5"><Wrench size={8} />{booking.mekanik?.initial || "?"}</p>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
