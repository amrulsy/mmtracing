"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Wrench, Calendar, ChevronRight, ReceiptText,
  RefreshCw, User, Clock, CheckCircle2, Trophy, ShieldCheck,
  LogOut, AlertCircle
} from "lucide-react";
import { portalFetch, portalLogout } from "@/lib/portalFetch";
import { DashboardSkeleton } from "@/components/portal/PortalSkeleton";
import { PortalError } from "@/components/portal/PortalError";
import type { PortalProfile, PortalSPK, PortalBooking } from "@/types/portal";
import { STATUS_COLORS } from "@/types/portal";

export default function PortalDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [spks, setSpks] = useState<PortalSPK[]>([]);
  const [bookings, setBookings] = useState<PortalBooking[]>([]);
  const [error, setError] = useState<{ type: "auth" | "network" | "server"; message: string } | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);

    try {
      const [profileRes, historyRes] = await Promise.all([
        portalFetch("/api/v1/customer-auth/me"),
        portalFetch("/api/v1/customer-auth/history")
      ]);

      if (profileRes.status === 401 || historyRes.status === 401) {
        portalLogout();
        return;
      }

      const profileData = await profileRes.json();
      const historyData = await historyRes.json();

      if (profileData.success) setProfile(profileData.data);
      else throw new Error("Invalid token");

      if (historyData.success) {
        setSpks(historyData.data.activeWo || historyData.data.spk || []);
        setBookings(historyData.data.bookings || []);
      }
    } catch (err) {
      if (!profile) {
        // Only show error if we have no data yet; otherwise keep stale data
        setError({
          type: "network",
          message: "Koneksi bermasalah. Periksa internet Anda dan coba lagi.",
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLogout = () => {
    portalLogout();
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error && !profile) {
    return <PortalError error={error} onRetry={() => fetchData()} />;
  }

  // KPI calculations
  const spkAktif = spks.filter(s => s.status === "dikerjakan" || s.status === "antri").length;
  const spkSelesai = spks.filter(s => s.status === "selesai").length;
  const spkBelumLunas = spks.filter(s => Number(s.sisaTagihan) > 0).length;

  return (
    <div className="max-w-sm md:max-w-2xl mx-auto p-4 space-y-6 pb-6 animate-in fade-in duration-500">
      {/* Header Profile */}
      <div className="glass-panel p-5 sm:p-6 border-l-4 border-l-primary">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <User size={24} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black mb-0.5">Halo, {profile?.name} 👋</h1>
              <p className="text-xs text-muted-foreground">
                WA: {profile?.phone} • Bergabung {new Date(profile?.createdAt || "").toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button onClick={() => fetchData(true)} disabled={refreshing} className="p-2.5 bg-surface-hover/50 border border-surface-border hover:bg-surface-hover rounded-xl transition-colors text-muted-foreground" title="Refresh">
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            </button>
            <button onClick={handleLogout} className="px-4 py-2.5 border border-surface-border text-foreground hover:bg-surface-hover transition-colors rounded-xl text-xs font-bold flex items-center gap-1.5">
              <LogOut size={14} /> Keluar
            </button>
          </div>
        </div>
      </div>

      {/* Tagihan Overdue Banner */}
      {spkBelumLunas > 0 && (
        <Link href="/portal/pembayaran" className="block p-4 bg-red-500/10 border border-red-500/20 rounded-2xl hover:bg-red-500/15 transition-colors group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-500 flex items-center justify-center shrink-0">
              <AlertCircle size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-red-600 dark:text-red-400">
                {spkBelumLunas} Tagihan Belum Lunas
              </p>
              <p className="text-xs text-red-500/70">
                Segera selesaikan pembayaran Anda
              </p>
            </div>
            <ChevronRight size={16} className="text-red-500 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-panel p-3">
          <div className="flex items-center gap-1.5 mb-1 text-primary">
            <Wrench size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Aktif</span>
          </div>
          <div className="text-xl sm:text-2xl font-black">{spkAktif}</div>
        </div>
        <div className="glass-panel p-3">
          <div className="flex items-center gap-1.5 mb-1 text-emerald-500">
            <CheckCircle2 size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Selesai</span>
          </div>
          <div className="text-xl sm:text-2xl font-black">{spkSelesai}</div>
        </div>
        <div className="glass-panel p-3">
          <div className="flex items-center gap-1.5 mb-1 text-blue-500">
            <ReceiptText size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total WO</span>
          </div>
          <div className="text-xl sm:text-2xl font-black">{spks.length}</div>
        </div>
      </div>

      {/* Quick Action Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Loyalty Points Summary */}
        <Link href="/portal/loyalty" className="glass-panel p-4 flex items-center gap-3 hover:bg-surface-hover/80 transition-colors group active:scale-[0.99] border-l-4 border-l-amber-500">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-colors">
            <Trophy size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">MMT Loyalty</p>
            <p className="text-sm font-black truncate text-amber-600 dark:text-amber-500">Lihat Poin & Reward</p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </Link>
        
        {/* Garansi Aktif Summary */}
        <Link href="/portal/garansi" className="glass-panel p-4 flex items-center gap-3 hover:bg-surface-hover/80 transition-colors group active:scale-[0.99] border-l-4 border-l-emerald-500">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
            <ShieldCheck size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Garansi Aktif</p>
            <p className="text-sm font-black truncate text-emerald-600 dark:text-emerald-500">Cek Status Garansi</p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* SPK Aktif / Riwayat */}
        <div className="space-y-3">
          <h2 className="text-sm font-black flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
            <Wrench size={16} className="text-primary" /> Riwayat Servis
            <span className="text-[10px] bg-surface-hover px-1.5 py-0.5 rounded-full font-normal ml-auto">{spks.length}</span>
          </h2>
          {spks.length === 0 ? (
            <div className="p-8 text-center bg-surface-hover/30 border border-surface-border rounded-2xl">
              <ReceiptText size={56} className="mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-bold mb-1">Belum Ada Riwayat</p>
              <p className="text-sm text-muted-foreground mb-6">Riwayat servis Anda akan muncul di sini</p>
              <Link href="/#booking" className="px-5 py-2.5 bg-red-600 text-white font-bold text-sm rounded-xl hover:bg-red-700 transition-colors inline-flex items-center gap-1.5">
                <Calendar size={16} /> Buat Reservasi Pertama
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {spks.map(spk => {
                const isActive = spk.status === "dikerjakan" || spk.status === "antri";
                const hasSisaTagihan = Number(spk.sisaTagihan) > 0;
                return (
                  <Link
                    key={spk.id}
                    href={`/portal/work-order/${spk.id}`}
                    className={`block p-4 border rounded-xl hover:bg-surface-hover transition-all group relative overflow-hidden active:scale-[0.99] ${isActive ? "bg-primary/5 border-primary/20" : "bg-surface-hover/50 border-surface-border"}`}
                  >
                    {/* Active indicator pulse */}
                    {isActive && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary animate-pulse" />}

                    <div className="flex justify-between items-start mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">{spk.noWo}</p>
                          <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {new Date(spk.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                          {spk.mode && <span className="ml-1.5 opacity-60">• {spk.mode}</span>}
                        </p>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${STATUS_COLORS[spk.status] || STATUS_COLORS.antri}`}>
                        {spk.status}
                      </span>
                    </div>

                    {/* Badge sisa tagihan */}
                    {hasSisaTagihan && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 font-bold border border-red-500/15">
                          Sisa: Rp {Number(spk.sisaTagihan).toLocaleString("id-ID")}
                        </span>
                      </div>
                    )}

                    <div className="mt-1">
                      <div className="flex justify-between text-[9px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">
                        <span>Progress</span>
                        <span>{spk.progress}%</span>
                      </div>
                      <div className="w-full bg-background rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${spk.progress === 100 ? "bg-emerald-500" : "bg-primary"}`}
                          style={{ width: `${spk.progress}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Riwayat Booking */}
        <div className="space-y-3">
          <h2 className="text-sm font-black flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
            <Calendar size={16} className="text-primary" /> Reservasi
            <span className="text-[10px] bg-surface-hover px-1.5 py-0.5 rounded-full font-normal ml-auto">{bookings.length}</span>
          </h2>
          {bookings.length === 0 ? (
            <div className="p-8 text-center bg-surface-hover/30 border border-surface-border rounded-2xl">
              <Calendar size={56} className="mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-bold mb-1">Belum Ada Booking</p>
              <p className="text-sm text-muted-foreground mb-6">Reservasi servis Anda agar tidak antri lama</p>
              <Link href="/#booking" className="px-5 py-2.5 bg-red-600 text-white font-bold text-sm rounded-xl hover:bg-red-700 transition-colors inline-flex items-center gap-1.5">
                <Calendar size={16} /> Buat Booking
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {bookings.map(b => (
                <div key={b.id} className="p-4 bg-surface-hover/50 border border-surface-border rounded-xl">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate">{b.layanan}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{b.jenisKendaraan}{b.merkTipe ? ` — ${b.merkTipe}` : ""}</p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                        <Clock size={10} />
                        <span className="font-mono">
                          {b.tanggal ? new Date(b.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "Tanpa Tanggal"}
                          {b.jamPreferensi ? ` • ${b.jamPreferensi}` : ""}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${STATUS_COLORS[b.status] || STATUS_COLORS.baru}`}>
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
