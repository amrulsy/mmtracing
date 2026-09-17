"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Save, UserCircle, AlertCircle, CheckCircle2, ArrowLeft, CarFront } from "lucide-react";
import { portalFetch, portalLogout } from "@/lib/portalFetch";
import { PortalError } from "@/components/portal/PortalError";
import Link from "next/link";
import Image from "next/image";
import type { PortalProfile, Kendaraan } from "@/types/portal";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [kendaraan, setKendaraan] = useState<Kendaraan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<{ type: "auth" | "network" | "server"; message: string } | null>(null);
  
  const [formData, setFormData] = useState({ name: "", email: "", address: "" });
  const [msg, setMsg] = useState({ text: "", type: "" });

  const fetchProfile = async () => {
    setError(null);
    try {
      const res = await portalFetch("/api/v1/customer-auth/me");
      if (res.status === 401 || res.status === 403) { portalLogout(); return; }
      const data = await res.json();
      if (data.success) {
        setProfile(data.data);
        setFormData({
          name: data.data.name || "",
          email: data.data.email || "",
          address: data.data.address || "",
        });
        // Fetch kendaraan — from profile detail endpoint if available
        if (data.data.kendaraan) {
          setKendaraan(data.data.kendaraan);
        }
      } else {
        setError({ type: "server", message: data.message || "Gagal memuat profil" });
      }
    } catch {
      setError({ type: "network", message: "Koneksi bermasalah. Periksa internet Anda." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    setSaving(true);
    setMsg({ text: "", type: "" });
    try {
      const res = await portalFetch("/api/v1/customer-auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setProfile(data.data);
        setMsg({ text: "Profil berhasil diperbarui", type: "success" });
        setTimeout(() => setMsg({ text: "", type: "" }), 3000);
      } else {
        setMsg({ text: data.message || "Gagal menyimpan", type: "error" });
      }
    } catch {
      setMsg({ text: "Koneksi bermasalah", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMsg({ text: "", type: "" });
    
    const fd = new FormData();
    fd.append("image", file);

    try {
      const res = await portalFetch("/api/v1/customer-auth/avatar", {
        method: "POST",
        body: fd, // Do not set Content-Type, browser will set it with boundary
      });
      const data = await res.json();
      if (data.success) {
        setProfile(prev => prev ? { ...prev, avatar: data.data.url } : null);
        setMsg({ text: "Foto berhasil diubah", type: "success" });
        setTimeout(() => setMsg({ text: "", type: "" }), 3000);
      } else {
        setMsg({ text: data.message || "Gagal upload foto", type: "error" });
      }
    } catch {
      setMsg({ text: "Koneksi bermasalah", type: "error" });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-primary" size={32} />
        <p className="text-xs text-muted-foreground animate-pulse">Memuat profil...</p>
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

  if (!profile) return null;

  return (
    <div className="max-w-sm md:max-w-2xl mx-auto p-4 space-y-6 pb-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Link href="/portal/dashboard" className="p-2.5 bg-surface-hover/50 border border-surface-border hover:bg-surface-hover rounded-xl transition-colors md:hidden">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl sm:text-2xl font-black">Profil Saya</h1>
      </div>

      <div className="glass-panel p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
          <div className="relative group">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-surface-hover border-4 border-background shadow-lg overflow-hidden flex items-center justify-center shrink-0">
              {profile.avatar ? (
                <Image src={profile.avatar} alt={profile.name} fill className="object-cover" unoptimized />
              ) : (
                <UserCircle size={48} className="text-muted-foreground/30" />
              )}
              {uploading && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
                  <Loader2 className="animate-spin text-primary" size={24} />
                </div>
              )}
            </div>
            <label className="absolute -bottom-3 -right-3 w-10 h-10 bg-primary text-white rounded-xl shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform active:scale-95">
              <Camera size={18} />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
            </label>
          </div>
          <div className="text-center sm:text-left flex-1 min-w-0">
            <h2 className="text-2xl font-black leading-tight truncate">{profile.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">WA: {profile.phone}</p>
            <div className="flex items-center justify-center sm:justify-start gap-3 mt-3">
              <span className="px-3 py-1 bg-surface-hover rounded-lg text-xs font-bold border border-surface-border">
                {profile.totalTrx} Transaksi
              </span>
              <span className="px-3 py-1 bg-surface-hover rounded-lg text-xs text-muted-foreground border border-surface-border">
                Sejak {new Date(profile.createdAt).getFullYear()}
              </span>
            </div>
          </div>
        </div>

        {msg.text && (
          <div className={`p-4 rounded-xl text-sm font-medium mb-6 flex items-start gap-2.5 border ${msg.type === "error" ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"}`}>
            {msg.type === "error" ? <AlertCircle size={18} className="shrink-0 mt-0.5" /> : <CheckCircle2 size={18} className="shrink-0 mt-0.5" />}
            <span>{msg.text}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Nama Lengkap</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-surface-hover/50 border border-surface-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all focus:bg-background"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Email <span className="opacity-50">(Opsional)</span></label>
            <input
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-surface-hover/50 border border-surface-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all focus:bg-background"
              placeholder="nama@email.com"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Alamat <span className="opacity-50">(Opsional)</span></label>
            <textarea
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className="w-full bg-surface-hover/50 border border-surface-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all focus:bg-background resize-none h-24"
              placeholder="Alamat lengkap"
            />
          </div>

          <div className="pt-4 border-t border-surface-border flex justify-end gap-3">
            <button
              type="button"
              onClick={() => portalLogout()}
              className="px-6 py-3 rounded-xl border border-surface-border text-foreground hover:bg-surface-hover transition-colors text-sm font-bold"
            >
              Keluar
            </button>
            <button
              type="submit"
              disabled={saving || !formData.name}
              className="px-6 py-3 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>

      {/* Kendaraan Saya Section */}
      <div className="glass-panel p-6 sm:p-8">
        <h2 className="text-lg font-black mb-4 flex items-center gap-2">
          <CarFront size={20} className="text-primary" /> Kendaraan Saya
        </h2>
        {kendaraan.length === 0 ? (
          <div className="text-center py-8">
            <CarFront size={40} className="mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm font-bold text-muted-foreground mb-1">Belum Ada Kendaraan Terdaftar</p>
            <p className="text-xs text-muted-foreground">Kendaraan Anda akan muncul setelah memBuat Work Order</p>
          </div>
        ) : (
          <div className="space-y-3">
            {kendaraan.map(k => (
              <div key={k.id} className="p-4 bg-surface-hover/50 border border-surface-border rounded-xl flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <CarFront size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{k.name}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                    <span className="text-xs font-mono bg-surface-hover px-2 py-0.5 rounded border border-surface-border text-muted-foreground">{k.plat}</span>
                    {k.warna && <span className="text-[10px] text-muted-foreground">{k.warna}</span>}
                    {k.tahun && <span className="text-[10px] text-muted-foreground">Thn {k.tahun}</span>}
                    {k.odometer != null && k.odometer > 0 && <span className="text-[10px] text-muted-foreground">{k.odometer.toLocaleString("id-ID")} km</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
