"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, CarFront, Gauge, Calendar, Palette, Hash, Search, Loader2 } from "lucide-react";
import { portalFetch, portalLogout } from "@/lib/portalFetch";
import { SkeletonCard } from "@/components/portal/PortalSkeleton";
import { PortalError } from "@/components/portal/PortalError";
import type { Kendaraan } from "@/types/portal";

export default function KendaraanPage() {
  const [data, setData] = useState<Kendaraan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<{ type: "auth" | "network" | "server"; message: string } | null>(null);

  const fetchKendaraan = async () => {
    setError(null);
    try {
      const res = await portalFetch("/api/v1/customer-auth/me");
      if (res.status === 401 || res.status === 403) { portalLogout(); return; }
      const json = await res.json();
      if (json.success && json.data.kendaraan) {
        setData(json.data.kendaraan);
      } else if (!json.success) {
        setError({ type: "server", message: json.message || "Gagal memuat data" });
      }
    } catch {
      setError({ type: "network", message: "Koneksi bermasalah. Periksa internet Anda." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchKendaraan(); }, []);

  const filtered = data.filter(k => {
    if (!search) return true;
    const q = search.toLowerCase();
    return k.name.toLowerCase().includes(q) || k.plat.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="max-w-sm md:max-w-2xl mx-auto p-4 space-y-4">
        <SkeletonCard height="h-20" />
        <SkeletonCard height="h-28" />
        <SkeletonCard height="h-28" />
      </div>
    );
  }

  if (error && data.length === 0) {
    return (
      <div className="max-w-sm md:max-w-2xl mx-auto p-4">
        <PortalError error={error} onRetry={fetchKendaraan} />
      </div>
    );
  }

  return (
    <div className="max-w-sm md:max-w-2xl mx-auto p-4 space-y-6 pb-28 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Link href="/portal/dashboard" className="p-2.5 bg-surface-hover/50 border border-surface-border hover:bg-surface-hover rounded-xl transition-colors md:hidden">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
          <CarFront className="text-primary" size={24} /> Kendaraan Saya
        </h1>
        <span className="ml-auto bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold border border-primary/20">
          {data.length} Unit
        </span>
      </div>

      {/* Search */}
      {data.length > 2 && (
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama atau plat kendaraan..."
            className="w-full bg-surface-hover/50 border border-surface-border rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all focus:bg-background"
          />
        </div>
      )}

      <div className="space-y-4">
        {filtered.length === 0 && data.length === 0 ? (
          <div className="text-center py-16 glass-panel">
            <CarFront size={56} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-black mb-1">Belum Ada Kendaraan</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
              Kendaraan Anda akan terdaftar secara otomatis saat membuat SPK di bengkel.
            </p>
            <Link href="/portal/booking" className="px-5 py-2.5 bg-red-600 text-white font-bold text-sm rounded-xl hover:bg-red-700 transition-colors inline-flex items-center gap-1.5">
              Buat Booking Baru
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 glass-panel">
            <Search size={32} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm font-bold text-muted-foreground">Tidak ditemukan untuk &quot;{search}&quot;</p>
          </div>
        ) : (
          filtered.map(k => (
            <div key={k.id} className="glass-panel overflow-hidden border border-surface-border/50 hover:border-surface-border transition-all">
              <div className="p-5 flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <CarFront size={28} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-black truncate">{k.name}</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-mono bg-primary/10 text-primary px-2.5 py-1 rounded-lg border border-primary/20 font-bold">
                      {k.plat}
                    </span>
                    {k.warna && (
                      <span className="inline-flex items-center gap-1 text-[11px] bg-surface-hover px-2.5 py-1 rounded-lg border border-surface-border text-muted-foreground">
                        <Palette size={12} /> {k.warna}
                      </span>
                    )}
                    {k.tahun && (
                      <span className="inline-flex items-center gap-1 text-[11px] bg-surface-hover px-2.5 py-1 rounded-lg border border-surface-border text-muted-foreground">
                        <Calendar size={12} /> {k.tahun}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Detail Row */}
              {(k.odometer || k.noRangka || k.noMesin) && (
                <div className="px-5 pb-4 pt-0 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {k.odometer != null && k.odometer > 0 && (
                    <div className="bg-surface-hover/50 rounded-lg p-3 border border-surface-border/50">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1"><Gauge size={10} /> Odometer</p>
                      <p className="text-sm font-black font-mono">{k.odometer.toLocaleString("id-ID")} km</p>
                    </div>
                  )}
                  {k.noRangka && (
                    <div className="bg-surface-hover/50 rounded-lg p-3 border border-surface-border/50">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1"><Hash size={10} /> No. Rangka</p>
                      <p className="text-xs font-mono truncate" title={k.noRangka}>{k.noRangka}</p>
                    </div>
                  )}
                  {k.noMesin && (
                    <div className="bg-surface-hover/50 rounded-lg p-3 border border-surface-border/50">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1"><Hash size={10} /> No. Mesin</p>
                      <p className="text-xs font-mono truncate" title={k.noMesin}>{k.noMesin}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
