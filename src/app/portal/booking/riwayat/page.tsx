"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarClock, Loader2, XCircle } from "lucide-react";
import { portalFetch } from "@/lib/portalFetch";
import type { PortalBooking } from "@/types/portal";

const STATUS: Record<string, string> = { baru: "Menunggu konfirmasi", dikonfirmasi: "Dikonfirmasi", ditolak: "Ditolak", dibatalkan: "Dibatalkan", selesai: "Selesai" };

export default function BookingHistoryPage() {
  const [bookings, setBookings] = useState<PortalBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const res = await portalFetch("/api/v1/customer-auth/bookings");
    const json = await res.json();
    if (json.success) setBookings(json.data || []);
    else setMessage(json.message || "Booking tidak dapat dimuat.");
    setLoading(false);
  }, []);
  useEffect(() => { load(); const timer = setInterval(load, 30000); return () => clearInterval(timer); }, [load]);

  const update = async (id: number, action: "cancel" | "reschedule") => {
    const options: RequestInit = { method: "POST" };
    if (action === "reschedule") { options.headers = { "Content-Type": "application/json" }; options.body = JSON.stringify({ tanggal: date, jamPreferensi: time }); }
    const res = await portalFetch(`/api/v1/customer-auth/bookings/${id}/${action}`, options);
    const json = await res.json();
    if (!json.success) { setMessage(json.message || "Perubahan booking gagal."); return; }
    setMessage(json.message); setEditing(null); await load();
  };
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);

  return <div className="max-w-sm md:max-w-2xl mx-auto p-4 space-y-5 pb-6">
    <div className="flex items-center gap-3"><Link href="/portal/dashboard" className="p-2.5 rounded-xl border border-surface-border"><ArrowLeft size={18} /></Link><h1 className="text-xl font-black flex items-center gap-2"><CalendarClock className="text-primary" /> Booking Saya</h1></div>
    {message && <p role="status" className="rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary">{message}</p>}
    {loading ? <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-primary" /></div> : bookings.length === 0 ? <div className="glass-panel p-10 text-center text-sm text-muted-foreground">Belum ada booking.</div> : <div className="space-y-3">{bookings.map((booking) => {
      const canChange = ["baru", "dikonfirmasi"].includes(booking.status);
      return <article key={booking.id} className="glass-panel p-4 space-y-3">
        <div className="flex justify-between gap-3"><div><p className="font-black">{booking.layanan}</p><p className="text-xs text-muted-foreground">{booking.merkTipe || booking.jenisKendaraan}</p></div><span className="text-[10px] font-bold uppercase rounded-full bg-surface-hover px-2 py-1 h-fit">{STATUS[booking.status] || booking.status}</span></div>
        <p className="text-sm">{booking.tanggal ? new Date(booking.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "Tanggal menunggu konfirmasi"}{booking.jamPreferensi ? ` · ${booking.jamPreferensi}` : ""}</p>
        {booking.alasanPenolakan && <p className="text-xs text-red-500">Alasan penolakan: {booking.alasanPenolakan}</p>}
        {booking.catatan && <p className="text-xs text-muted-foreground">Catatan bengkel: {booking.catatan}</p>}
        {canChange && <div className="flex gap-2"><button onClick={() => { setEditing(editing === booking.id ? null : booking.id); setDate(booking.tanggal?.slice(0, 10) || ""); setTime(booking.jamPreferensi || ""); }} className="px-3 py-2 rounded-xl border border-surface-border text-xs font-bold">Jadwal ulang</button><button onClick={() => update(booking.id, "cancel")} className="px-3 py-2 rounded-xl text-xs font-bold text-red-500 border border-red-500/20 flex gap-1 items-center"><XCircle size={14} /> Batalkan</button></div>}
        {editing === booking.id && <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-border"><input type="date" min={tomorrow.toISOString().slice(0, 10)} value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl border border-surface-border bg-background p-2 text-sm" /><input placeholder="Contoh: 09:00" value={time} onChange={(e) => setTime(e.target.value)} className="rounded-xl border border-surface-border bg-background p-2 text-sm" /><button disabled={!date || !time} onClick={() => update(booking.id, "reschedule")} className="col-span-2 rounded-xl bg-primary py-2 text-sm font-bold text-white disabled:opacity-50">Simpan jadwal baru</button></div>}
      </article>;
    })}</div>}
  </div>;
}
