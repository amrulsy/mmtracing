"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Loader2, CheckCircle2, CarFront, Wrench, Clock, MessageCircle } from "lucide-react";
import { portalFetch, portalLogout } from "@/lib/portalFetch";
import { SkeletonCard } from "@/components/portal/PortalSkeleton";
import { PortalError } from "@/components/portal/PortalError";
import type { PortalProfile, Kendaraan } from "@/types/portal";

const LAYANAN_OPTIONS = [
  "Tune Up Ringan",
  "Tune Up Besar",
  "Bore Up / Oversize",
  "Porting Polish",
  "Servis Kopling",
  "Servis Injeksi / Karburator",
  "Custom / Modifikasi",
  "Lainnya",
];

const JAM_OPTIONS = [
  "08:00 - 10:00",
  "10:00 - 12:00",
  "13:00 - 15:00",
  "15:00 - 17:00",
];

export default function BookingPage() {
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [kendaraan, setKendaraan] = useState<Kendaraan[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<{ type: "auth" | "network" | "server"; message: string } | null>(null);
  const [msg, setMsg] = useState({ text: "", type: "" });

  const [form, setForm] = useState({
    kendaraanId: "",
    kendaraanManual: "",
    layanan: "",
    tanggal: "",
    jamPreferensi: "",
    keluhan: "",
  });

  const fetchProfile = async () => {
    setError(null);
    try {
      const res = await portalFetch("/api/v1/customer-auth/me");
      if (res.status === 401 || res.status === 403) { portalLogout(); return; }
      const json = await res.json();
      if (json.success) {
        setProfile(json.data);
        setKendaraan(json.data.kendaraan || []);
      } else {
        setError({ type: "server", message: json.message || "Gagal memuat profil" });
      }
    } catch {
      setError({ type: "network", message: "Koneksi bermasalah." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.layanan || !form.tanggal) return;

    setSubmitting(true);
    setMsg({ text: "", type: "" });

    const selectedKendaraan = kendaraan.find(k => k.id === Number(form.kendaraanId));

    try {
      const res = await fetch("/api/v1/landing/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: profile?.name,
          whatsapp: profile?.phone,
          jenisKendaraan: selectedKendaraan?.name || form.kendaraanManual || "Belum dipilih",
          merkTipe: selectedKendaraan ? `${selectedKendaraan.name} (${selectedKendaraan.plat})` : form.kendaraanManual,
          layanan: form.layanan,
          tanggal: form.tanggal,
          jamPreferensi: form.jamPreferensi,
          keluhan: form.keluhan,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSubmitted(true);
      } else {
        setMsg({ text: json.message || "Gagal mengirim booking", type: "error" });
      }
    } catch {
      setMsg({ text: "Koneksi bermasalah", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // Minimum date = tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  if (loading) {
    return (
      <div className="max-w-sm md:max-w-2xl mx-auto p-4 space-y-4">
        <SkeletonCard height="h-20" />
        <SkeletonCard height="h-64" />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="max-w-sm md:max-w-2xl mx-auto p-4">
        <PortalError error={error} onRetry={fetchProfile} />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-sm md:max-w-2xl mx-auto p-4 min-h-[60vh] flex items-center justify-center animate-in fade-in zoom-in-95 duration-500">
        <div className="glass-panel p-8 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <h2 className="text-xl font-black mb-2">Booking Berhasil! 🎉</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Reservasi Anda telah kami terima. Tim kami akan menghubungi Anda via WhatsApp untuk konfirmasi.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/portal/dashboard" className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all">
              Kembali ke Dashboard
            </Link>
            <a
              href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "62274123456"}?text=${encodeURIComponent(`Halo MMT Racing, saya ${profile?.name} baru saja melakukan booking untuk ${form.layanan} pada ${form.tanggal}.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2.5 bg-[#25D366]/10 text-[#25D366] rounded-xl font-bold text-sm hover:bg-[#25D366]/20 transition-all flex items-center justify-center gap-2"
            >
              <MessageCircle size={16} /> WhatsApp
            </a>
          </div>
        </div>
      </div>
    );
  }

  const inputCls = "w-full bg-surface-hover/50 border border-surface-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all focus:bg-background";
  const labelCls = "text-xs font-semibold text-muted-foreground mb-1.5 block";

  return (
    <div className="max-w-sm md:max-w-2xl mx-auto p-4 space-y-6 pb-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Link href="/portal/dashboard" className="p-2.5 bg-surface-hover/50 border border-surface-border hover:bg-surface-hover rounded-xl transition-colors md:hidden">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
          <Calendar className="text-primary" size={24} /> Buat Booking
        </h1>
      </div>

      {/* Pre-filled Info */}
      <div className="glass-panel p-4 bg-primary/5 border-l-4 border-l-primary">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Data Pelanggan (otomatis)</p>
        <p className="text-sm font-bold">{profile?.name}</p>
        <p className="text-xs text-muted-foreground">WA: {profile?.phone}</p>
      </div>

      {msg.text && (
        <div className={`p-4 rounded-xl text-sm font-medium border ${msg.type === "error" ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"}`}>
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-panel p-6 space-y-5">
        {/* Kendaraan Selection */}
        <div>
          <label className={labelCls}><CarFront size={12} className="inline mr-1" />Kendaraan</label>
          {kendaraan.length > 0 ? (
            <select
              value={form.kendaraanId}
              onChange={e => setForm({ ...form, kendaraanId: e.target.value })}
              className={inputCls + " cursor-pointer"}
            >
              <option value="">— Pilih kendaraan terdaftar —</option>
              {kendaraan.map(k => (
                <option key={k.id} value={k.id}>{k.name} ({k.plat})</option>
              ))}
              <option value="manual">Kendaraan lain (input manual)</option>
            </select>
          ) : null}
          {(kendaraan.length === 0 || form.kendaraanId === "manual") && (
            <input
              type="text"
              value={form.kendaraanManual}
              onChange={e => setForm({ ...form, kendaraanManual: e.target.value })}
              className={inputCls + (kendaraan.length > 0 ? " mt-2" : "")}
              placeholder="Contoh: Honda Beat 2021 Putih"
            />
          )}
        </div>

        {/* Layanan */}
        <div>
          <label className={labelCls}><Wrench size={12} className="inline mr-1" />Layanan yang Diinginkan *</label>
          <select
            required
            value={form.layanan}
            onChange={e => setForm({ ...form, layanan: e.target.value })}
            className={inputCls + " cursor-pointer"}
          >
            <option value="">— Pilih layanan —</option>
            {LAYANAN_OPTIONS.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>

        {/* Tanggal */}
        <div>
          <label className={labelCls}><Calendar size={12} className="inline mr-1" />Tanggal Kedatangan *</label>
          <input
            required
            type="date"
            min={minDate}
            value={form.tanggal}
            onChange={e => setForm({ ...form, tanggal: e.target.value })}
            className={inputCls}
          />
        </div>

        {/* Jam Preferensi */}
        <div>
          <label className={labelCls}><Clock size={12} className="inline mr-1" />Jam Preferensi</label>
          <div className="grid grid-cols-2 gap-2">
            {JAM_OPTIONS.map(j => (
              <button
                type="button"
                key={j}
                onClick={() => setForm({ ...form, jamPreferensi: j })}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  form.jamPreferensi === j
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-background border-surface-border text-foreground hover:bg-surface-hover"
                }`}
              >
                {j}
              </button>
            ))}
          </div>
        </div>

        {/* Keluhan */}
        <div>
          <label className={labelCls}>Keluhan / Catatan (Opsional)</label>
          <textarea
            value={form.keluhan}
            onChange={e => setForm({ ...form, keluhan: e.target.value })}
            className={inputCls + " resize-none h-24"}
            placeholder="Contoh: Mesin brebet di RPM tinggi, suspensi keras..."
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !form.layanan || !form.tanggal}
          className="w-full py-3.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
        >
          {submitting ? <Loader2 className="animate-spin" size={18} /> : <Calendar size={18} />}
          {submitting ? "Mengirim..." : "Kirim Booking"}
        </button>
      </form>
    </div>
  );
}
