"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard, Wrench, CheckCircle2, TrendingUp, AlertTriangle,
  Plus, CreditCard, CalendarPlus, Search, Clock, FileText,
  ChevronRight, ArrowUpRight, ArrowDownRight, Package,
  Users, Zap, Bell
} from "lucide-react";
import { api } from "@/lib/api";
import type { DashboardData } from "@/lib/types";
import { CardSkeleton, ListSkeleton, Skeleton } from "@/components/ui/loading-skeleton";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<DashboardData>("/dashboard")
      .then((res) => setData(res.data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Gagal memuat data"))
      .finally(() => setLoading(false));
  }, []);

  // Format currency
  const formatRp = (n: number) => {
    if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}K`;
    return `Rp ${n.toLocaleString("id-ID")}`;
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  };

  const formatTime = (d: string) => {
    return new Date(d).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  };

  const dist = data?.distribution || { rutin: 0, modifikasi: 0, bubut: 0 };
  const totalActive = (dist.rutin || 0) + (dist.modifikasi || 0) + (dist.bubut || 0);
  
  const workDistribution = [
    { label: "Servis Rutin", pct: totalActive > 0 ? Math.round((dist.rutin / totalActive) * 100) : 0, color: "bg-blue-500" },
    { label: "Modifikasi", pct: totalActive > 0 ? Math.round((dist.modifikasi / totalActive) * 100) : 0, color: "bg-red-500" },
    { label: "Jasa Bubut", pct: totalActive > 0 ? Math.round((dist.bubut / totalActive) * 100) : 0, color: "bg-violet-500" },
  ];

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 animate-in fade-in duration-500">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <AlertTriangle size={32} className="text-red-500" />
        </div>
        <p className="text-muted-foreground text-sm">{error}</p>
        <button onClick={() => window.location.reload()} className="text-primary text-sm font-medium hover:underline">
          Coba lagi
        </button>
      </div>
    );
  }

  // Show loading state
  if (loading || !data) {
    return (
      <div className="space-y-4 lg:space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-28 hidden sm:block" />
        </div>
        <CardSkeleton count={5} />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="glass-panel p-6 lg:col-span-2"><Skeleton className="h-48 w-full" /></div>
          <div className="glass-panel p-6"><Skeleton className="h-48 w-full" /></div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="glass-panel p-6 lg:col-span-2"><ListSkeleton count={5} /></div>
          <div className="space-y-4">
            <div className="glass-panel p-6"><ListSkeleton count={4} /></div>
          </div>
        </div>
      </div>
    );
  }

  const { kpi, mekanikAktif, recentSpk, recentActivity } = data;

  const statusStyle = (s: string) => {
    switch (s.toLowerCase()) {
      case "selesai": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "dikerjakan": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "antri": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "kendala": return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "bg-surface-hover text-muted-foreground";
    }
  };

  const activityDot = (action: string) => {
    const a = action.toLowerCase();
    if (a.includes("selesai") || a.includes("create")) return "bg-emerald-500";
    if (a.includes("bayar") || a.includes("update")) return "bg-blue-500";
    if (a.includes("kendala")) return "bg-amber-500";
    return "bg-primary";
  };

  const parseActivityDetail = (detailString?: string | null) => {
    if (!detailString) return "";
    try {
      const parsed = JSON.parse(detailString);
      const elements = Object.entries(parsed).map(([key, value]) => `${key}: ${value}`);
      return `— ${elements.join(', ')}`;
    } catch {
      return `— ${detailString}`;
    }
  };

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-4 lg:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out overflow-hidden">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Ringkasan operasional bengkel — {today}</p>
        </div>
        <Link href="/app/spk/create" className="hidden sm:flex items-center gap-1.5 btn-glossy bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium shadow-glossy-primary hover:shadow-glossy-primary-dark">
          <Plus size={16} /> SPK Baru
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Antrian SPK", value: String(kpi.spkAntri), icon: LayoutDashboard, iconColor: "text-blue-500", iconBg: "bg-blue-500/10" },
          { label: "Dikerjakan", value: String(kpi.spkDikerjakan), sub: `${mekanikAktif.filter(m => m.status !== 'off').length} mekanik aktif`, icon: Wrench, iconColor: "text-amber-500", iconBg: "bg-amber-500/10" },
          { label: "Selesai Hari Ini", value: String(kpi.spkSelesaiHariIni), icon: CheckCircle2, iconColor: "text-emerald-500", iconBg: "bg-emerald-500/10" },
          { label: "Pendapatan", value: formatRp(kpi.pendapatanHariIni), sub: `Bulan: ${formatRp(kpi.pendapatanBulan)}`, icon: TrendingUp, iconColor: "text-primary", iconBg: "bg-primary/10" },
          { label: "Kendala", value: String(kpi.spkKendala), sub: kpi.spkKendala > 0 ? "Perlu perhatian" : "Aman", icon: AlertTriangle, iconColor: "text-red-500", iconBg: "bg-red-500/10", alert: kpi.spkKendala > 0 },
        ].map((kpiCard, i) => (
          <div key={i} className={`glass-panel p-3 lg:p-4 relative overflow-hidden group ${kpiCard.alert ? "border-red-500/30 bg-red-500/[0.03]" : ""} ${i === 4 ? "col-span-2 lg:col-span-1" : ""}`}>
            <div className="flex items-start justify-between">
              <p className="text-[10px] lg:text-xs font-medium text-muted-foreground">{kpiCard.label}</p>
              <div className={`w-7 h-7 lg:w-8 lg:h-8 rounded-lg ${kpiCard.iconBg} ${kpiCard.iconColor} flex items-center justify-center`}>
                <kpiCard.icon size={16} />
              </div>
            </div>
            <p className={`text-xl lg:text-2xl font-bold mt-1 ${kpiCard.alert ? "text-red-500" : ""}`}>{kpiCard.value}</p>
            {kpiCard.sub && <p className="text-[10px] text-muted-foreground mt-1">{kpiCard.sub}</p>}
          </div>
        ))}
      </div>

      {/* Quick Actions (Mobile) */}
      <div className="lg:hidden">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { icon: Plus, label: "SPK Baru", href: "/app/spk/create", primary: true },
            { icon: CreditCard, label: "Pembayaran", href: "/app/pembayaran" },
            { icon: CalendarPlus, label: "Booking", href: "/app/jadwal" },
            { icon: Search, label: "Cari", href: "/app/kendaraan" },
            { icon: Package, label: "Stok", href: "/app/master/sparepart" },
          ].map((a, i) => (
            <Link key={i} href={a.href} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-all active:scale-95 ${a.primary ? "bg-primary text-white shadow-glossy-primary" : "bg-surface border border-surface-border text-muted-foreground hover:text-foreground"}`}>
              <a.icon size={14} /> {a.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Alerts Banner */}
      <div className="space-y-2">
        {kpi.stokHabis > 0 && (
          <Link href="/app/master/sparepart" className="flex items-center gap-3 p-3 rounded-xl border border-red-600/50 bg-red-600/10 text-red-600 dark:text-red-400 transition-colors hover:opacity-80">
            <AlertTriangle size={16} className="shrink-0" />
            <p className="text-xs flex-1 font-bold">{kpi.stokHabis} item stok habis total — harus segera restock!</p>
            <ChevronRight size={14} className="shrink-0 opacity-50" />
          </Link>
        )}
        {kpi.stokMenipis > 0 && (
          <Link href="/app/master/sparepart" className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 transition-colors hover:opacity-80">
            <AlertTriangle size={16} className="shrink-0" />
            <p className="text-xs flex-1">{kpi.stokMenipis} item stok menipis — hampir habis</p>
            <ChevronRight size={14} className="shrink-0 opacity-50" />
          </Link>
        )}
        {kpi.spkKendala > 0 && (
          <Link href="/app/spk" className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400 transition-colors hover:opacity-80">
            <Clock size={16} className="shrink-0" />
            <p className="text-xs flex-1">{kpi.spkKendala} SPK mengalami kendala — perlu tindakan</p>
            <ChevronRight size={14} className="shrink-0 opacity-50" />
          </Link>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid gap-4 lg:gap-6 lg:grid-cols-3">
        {/* Financial Summary */}
        <div className="glass-panel p-3 sm:p-4 lg:p-6 lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="font-bold text-sm lg:text-base">📊 Ringkasan Keuangan</h2>
            <Link href="/app/laporan" className="text-[10px] text-primary font-medium hover:underline flex items-center gap-1 shrink-0">Detail <ChevronRight size={12} /></Link>
          </div>
          <div className="grid grid-cols-2 divide-x divide-surface-border">
            <div className="flex flex-col items-center justify-center p-2 sm:p-4">
              <ArrowUpRight size={20} className="mb-1.5 sm:mb-2 text-emerald-500" />
              <p className="text-base sm:text-lg font-bold text-emerald-600 text-center">{formatRp(kpi.pendapatanBulan)}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 text-center">Pendapatan</p>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-2 sm:mt-3 text-center">Hari ini: <strong className="text-emerald-500">{formatRp(kpi.pendapatanHariIni)}</strong></p>
            </div>
            <div className="flex flex-col items-center justify-center p-2 sm:p-4">
              <ArrowDownRight size={20} className="mb-1.5 sm:mb-2 text-red-500" />
              <p className="text-base sm:text-lg font-bold text-red-500 text-center">{formatRp(kpi.pengeluaranBulan)}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 text-center">Pengeluaran</p>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-2 sm:mt-3 text-center">Hari ini: <strong className="text-red-500">{formatRp(kpi.pengeluaranHariIni)}</strong></p>
            </div>
          </div>
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-surface-border text-center">
            <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Laba Kotor Bulan Ini</p>
            <p className={`text-lg sm:text-xl font-bold ${kpi.pendapatanBulan - kpi.pengeluaranBulan >= 0 ? "text-primary" : "text-red-500"}`}>
              {formatRp(kpi.pendapatanBulan - kpi.pengeluaranBulan)}
            </p>
          </div>
        </div>

        {/* Work Distribution */}
        <div className="glass-panel p-3 sm:p-4 lg:p-6">
          <h2 className="font-bold text-sm lg:text-base mb-3 sm:mb-4">🔄 Distribusi Pekerjaan</h2>
          {/* Donut chart */}
          <div className="flex items-center justify-center my-3 sm:my-4">
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 lg:w-36 lg:h-36">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {workDistribution.reduce((acc, item, i) => {
                  const offset = acc.offset;
                  const circumference = 2 * Math.PI * 40;
                  const dash = (item.pct / 100) * circumference;
                  const colors = ["#3b82f6", "#ef4444", "#8b5cf6"];
                  acc.elements.push(
                    <circle key={i} cx="50" cy="50" r="40" fill="none" stroke={colors[i]} strokeWidth="12" strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-offset} className="transition-all duration-700" />
                  );
                  acc.offset = offset + dash;
                  return acc;
                }, { offset: 0, elements: [] as React.ReactNode[] }).elements}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-lg font-bold">{kpi.spkAntri + kpi.spkDikerjakan}</p>
                <p className="text-[9px] text-muted-foreground">SPK Aktif</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {workDistribution.map((w, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-sm ${w.color}`} />
                <span className="text-xs flex-1">{w.label}</span>
                <span className="text-xs font-bold">{w.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid gap-4 lg:gap-6 lg:grid-cols-3">
        {/* SPK Terbaru */}
        <div className="glass-panel p-3 sm:p-4 lg:p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm lg:text-base">📋 SPK Terbaru</h2>
            <Link href="/app/spk" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">Lihat Semua <ChevronRight size={12} /></Link>
          </div>
          <div className="space-y-2">
            {recentSpk.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Belum ada data SPK</p>
            ) : (
              recentSpk.map((spk) => (
                <Link key={spk.id} href={`/app/spk/${spk.id}`} className="flex items-center gap-3 p-3 rounded-xl border border-surface-border hover:bg-surface-hover/30 transition-colors active:scale-[0.99] block">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FileText size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground">{spk.noSpk}</span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${statusStyle(spk.status)}`}>{spk.status}</span>
                    </div>
                    <p className="text-sm font-medium truncate">
                      {spk.kendaraan ? `${spk.kendaraan.name}` : "—"} / {spk.pelanggan?.name || "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {spk.mode} • {spk.mekanik?.name || "Belum ditugaskan"}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-1">
                    <p className="text-[10px] sm:text-xs font-bold font-mono">{formatRp(Number(spk.totalHarga ?? 0))}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Mekanik Online */}
          <div className="glass-panel p-3 sm:p-4 lg:p-6">
            <h2 className="font-bold text-sm mb-3 flex items-center gap-2"><Users size={16} className="text-primary" /> Mekanik Aktif</h2>
            <div className="space-y-2">
              {mekanikAktif.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Tidak ada mekanik aktif</p>
              ) : (
                mekanikAktif.map((m) => {
                  const isWorking = m.spk && m.spk.length > 0;
                  const initials = m.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-hover/30 transition-colors">
                      <div className="relative">
                        <div className={`w-9 h-9 rounded-full ${isWorking ? "bg-emerald-500" : "bg-slate-400"} text-white text-[10px] font-bold flex items-center justify-center`}>{initials}</div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${isWorking ? "bg-emerald-500" : "bg-slate-400"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">{m.name}</p>
                        <p className="text-[10px] text-muted-foreground">{isWorking ? m.spk![0].noSpk : "Menunggu tugas"}</p>
                      </div>
                      {isWorking && <Zap size={12} className="text-amber-500" />}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="glass-panel p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-sm flex items-center gap-2"><Bell size={16} className="text-primary" /> Aktivitas</h2>
              <Link href="/app/log-aktivitas" className="text-[10px] text-primary font-medium">Semua →</Link>
            </div>
            <div className="space-y-3">
              {recentActivity.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Belum ada aktivitas</p>
              ) : (
                recentActivity.slice(0, 5).map((a, i) => (
                  <div key={a.id} className="flex gap-3">
                    <div className="flex flex-col items-center mt-1">
                      <div className={`w-2 h-2 rounded-full ${activityDot(a.action)} shrink-0`} />
                      {i < Math.min(recentActivity.length - 1, 4) && <div className="w-px flex-1 bg-surface-border mt-1" />}
                    </div>
                    <div className="pb-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium truncate">{a.action} {a.module}</p>
                        <span className="text-[9px] text-muted-foreground shrink-0">{formatTime(a.createdAt)}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground break-words mt-0.5">{a.user?.name || "Sistem"} {parseActivityDetail(a.detail)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Desktop */}
      <div className="hidden lg:grid grid-cols-5 gap-3">
        {[
          { icon: Plus, label: "Buat SPK Baru", href: "/app/spk/create", primary: true },
          { icon: CreditCard, label: "Terima Pembayaran", href: "/app/pembayaran" },
          { icon: CalendarPlus, label: "Tambah Booking", href: "/app/jadwal" },
          { icon: Search, label: "Cari Pelanggan", href: "/app/kendaraan" },
          { icon: Package, label: "Cek Stok Part", href: "/app/master/sparepart" },
        ].map((a, i) => (
          <Link key={i} href={a.href} className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all hover:shadow-sm active:scale-[0.98] ${a.primary ? "bg-primary text-white shadow-glossy-primary hover:shadow-glossy-primary-dark" : "bg-surface border border-surface-border text-muted-foreground hover:text-foreground hover:bg-surface-hover"}`}>
            <a.icon size={18} /> {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
