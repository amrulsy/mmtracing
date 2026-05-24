"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Calendar, Loader2, Wrench, Package, Users, AlertTriangle, TrendingUp, TrendingDown, DollarSign, PieChart, RefreshCw, ChevronDown, Download, ArrowUp, ArrowDown, Minus, Scissors, Wallet, Receipt, Repeat } from "lucide-react";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/loading-skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart as RePieChart,
  Pie,
  Cell,
} from "recharts";

interface LaporanPendapatan {
  daily: Array<{ date: string; rutin: number; modifikasi: number; bubut: number; total: number }>;
  total: number;
}

interface LaporanLabaRugi {
  periode: { start: string; end: string };
  basis: "cash" | "accrual";
  pendapatan: number;
  hpp: number;
  hppSparepart: number;
  hppJasa: number;
  labaKotor: number;
  pengeluaran: number;
  labaBersih: number;
  marginKotor: number;
  marginBersih: number;
}

interface LaporanKPI {
  basis: "cash" | "accrual";
  periode: { start: string; end: string };
  periodeSebelumnya: { start: string; end: string };
  current: LaporanLabaRugi & { spkSelesai: number; avgTicket: number; mekanikAktif: number };
  previous: LaporanLabaRugi & { spkSelesai: number; avgTicket: number };
  change: { pendapatan: number; labaBersih: number; pengeluaran: number; spkSelesai: number; avgTicket: number };
}

interface PengeluaranBreakdown {
  total: number;
  breakdown: Array<{ kategoriId: number; kategori: string; jumlah: number; count: number; persen: number }>;
}

interface TopItem {
  name: string;
  qty: number;
  revenue: number;
}

interface LaporanTopItems {
  topJasa: TopItem[];
  topSparepart: TopItem[];
}

interface LaporanMekanik {
  id: number;
  name: string;
  initial: string;
  _count: { spk: number };
  totalPendapatan: number;
  spkSelesai: number;
}

interface LaporanPelanggan {
  topSpenders: Array<{ name: string; totalTrx: number; _count: { spk: number } }>;
  totalPelanggan: number;
  pelangganBaru: number;
  repeatRate: number;
  repeatPelanggan: number;
  uniquePelangganWithSpk: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const visibleTotal = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
    return (
      <div className="bg-surface/90 backdrop-blur border border-surface-border p-3 rounded-lg shadow-xl shadow-black/10">
        <p className="font-medium text-sm mb-2">{new Date(label).toLocaleDateString('id-ID', {day: 'numeric', month: 'long'})}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs flex items-center justify-between gap-4 font-mono">
            <span style={{ color: entry.color }}>{entry.name}</span>
            <span className="font-bold">Rp {entry.value.toLocaleString("id-ID")}</span>
          </p>
        ))}
        <div className="pt-2 mt-2 border-t border-surface-border text-xs flex justify-between gap-4 font-mono font-bold">
          <span>Total:</span>
          <span>Rp {visibleTotal.toLocaleString("id-ID")}</span>
        </div>
      </div>
    );
  }
  return null;
};

type RangePreset = "7d" | "30d" | "bulan_ini" | "bulan_lalu" | "tahun_ini" | "custom";

const toISODate = (d: Date) => d.toISOString().split("T")[0];

function resolveRange(preset: RangePreset, customStart: string, customEnd: string): { start: string; end: string; label: string } {
  const now = new Date();
  const y = now.getFullYear(); const m = now.getMonth();
  switch (preset) {
    case "7d": {
      const s = new Date(); s.setDate(s.getDate() - 6);
      return { start: toISODate(s), end: toISODate(now), label: "7 Hari Terakhir" };
    }
    case "30d": {
      const s = new Date(); s.setDate(s.getDate() - 29);
      return { start: toISODate(s), end: toISODate(now), label: "30 Hari Terakhir" };
    }
    case "bulan_lalu": {
      const s = new Date(y, m - 1, 1); const e = new Date(y, m, 0);
      return { start: toISODate(s), end: toISODate(e), label: s.toLocaleDateString("id-ID", { month: "long", year: "numeric" }) };
    }
    case "tahun_ini": {
      return { start: toISODate(new Date(y, 0, 1)), end: toISODate(now), label: `Tahun ${y}` };
    }
    case "custom":
      return { start: customStart, end: customEnd, label: `${customStart} → ${customEnd}` };
    case "bulan_ini":
    default:
      return { start: toISODate(new Date(y, m, 1)), end: toISODate(now), label: now.toLocaleDateString("id-ID", { month: "long", year: "numeric" }) };
  }
}

const PIE_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#a855f7", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"];

function DeltaBadge({ pct, invert = false }: { pct: number; invert?: boolean }) {
  if (!isFinite(pct) || Math.abs(pct) < 0.1) {
    return <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-muted-foreground"><Minus size={10} /> 0%</span>;
  }
  const isPositive = pct > 0;
  // invert=true berarti naik = merah (contoh: pengeluaran)
  const isGood = invert ? !isPositive : isPositive;
  const color = isGood ? "text-emerald-600" : "text-red-500";
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${color}`}>
      {isPositive ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

export default function LaporanPage() {
  const [pendapatan, setPendapatan] = useState<LaporanPendapatan | null>(null);
  const [labaRugi, setLabaRugi] = useState<LaporanLabaRugi | null>(null);
  const [kpi, setKpi] = useState<LaporanKPI | null>(null);
  const [breakdown, setBreakdown] = useState<PengeluaranBreakdown | null>(null);
  const [topItems, setTopItems] = useState<LaporanTopItems | null>(null);
  const [mekanik, setMekanik] = useState<LaporanMekanik[]>([]);
  const [pelanggan, setPelanggan] = useState<LaporanPelanggan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Period + basis filter
  const [preset, setPreset] = useState<RangePreset>("bulan_ini");
  const [customStart, setCustomStart] = useState(() => toISODate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [customEnd, setCustomEnd] = useState(() => toISODate(new Date()));
  const [showPicker, setShowPicker] = useState(false);
  const [basis, setBasis] = useState<"cash" | "accrual">("cash");
  const range = resolveRange(preset, customStart, customEnd);

  const fetchAll = async () => {
    setLoading(true); setError(null);
    const params = { startDate: range.start, endDate: range.end, basis };
    try {
      const [pd, lr, ki, bd, ti, mk, pl] = await Promise.all([
        api.get<LaporanPendapatan>("/laporan/pendapatan", params),
        api.get<LaporanLabaRugi>("/laporan/laba-rugi", params),
        api.get<LaporanKPI>("/laporan/kpi", params),
        api.get<PengeluaranBreakdown>("/laporan/pengeluaran-breakdown", params),
        api.get<LaporanTopItems>("/laporan/top-items", params),
        api.get<LaporanMekanik[]>("/laporan/mekanik", params),
        api.get<LaporanPelanggan>("/laporan/pelanggan", params),
      ]);
      setPendapatan(pd.data);
      setLabaRugi(lr.data);
      setKpi(ki.data);
      setBreakdown(bd.data);
      setTopItems(ti.data);
      setMekanik(mk.data || []);
      setPelanggan(pl.data);
    } catch {
      setError("Gagal memuat data laporan. Cek koneksi server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [range.start, range.end, basis]);

  // Auto-aggregate harian → mingguan jika periode > 35 hari (readability)
  const chartData = (() => {
    if (!pendapatan) return [];
    const days = pendapatan.daily;
    if (days.length <= 35) return days;
    // Aggregate per week (ISO Monday-based)
    const weeks = new Map<string, { date: string; rutin: number; modifikasi: number; bubut: number; total: number }>();
    days.forEach(d => {
      const dt = new Date(d.date);
      const day = dt.getDay(); // 0=Sun
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const monday = new Date(dt); monday.setDate(dt.getDate() + mondayOffset);
      const key = toISODate(monday);
      const agg = weeks.get(key) || { date: key, rutin: 0, modifikasi: 0, bubut: 0, total: 0 };
      agg.rutin += d.rutin; agg.modifikasi += d.modifikasi; agg.bubut += d.bubut; agg.total += d.total;
      weeks.set(key, agg);
    });
    return Array.from(weeks.values()).sort((a, b) => a.date.localeCompare(b.date));
  })();
  const chartIsWeekly = pendapatan ? pendapatan.daily.length > 35 : false;

  const formatRp = (num: number) => {
    if (Math.abs(num) >= 1_000_000_000) return `Rp ${(num/1_000_000_000).toFixed(1)}B`;
    if (Math.abs(num) >= 1_000_000) return `Rp ${(num/1_000_000).toFixed(1)}M`;
    if (Math.abs(num) >= 1_000) return `Rp ${(num/1_000).toFixed(0)}K`;
    return `Rp ${num.toLocaleString("id-ID")}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Laporan &amp; Analitik</h1>
          <p className="text-muted-foreground text-sm">Analisis P&L, performa finansial dan operasional bengkel.</p>
        </div>
        <div className="flex flex-wrap gap-2 relative">
          {/* Basis toggle */}
          <div className="flex rounded-xl border border-surface-border overflow-hidden shadow-sm" title="Cash: pendapatan diakui saat uang diterima. Accrual: diakui saat SPK selesai.">
            {(["cash", "accrual"] as const).map(b => (
              <button
                key={b}
                onClick={() => setBasis(b)}
                className={`px-3 py-2 text-xs font-bold capitalize transition-colors ${basis === b ? "bg-primary text-primary-foreground" : "bg-surface hover:bg-surface-hover text-muted-foreground"}`}
              >{b === "cash" ? "Kas" : "Akrual"}</button>
            ))}
          </div>
          <button
            onClick={() => setShowPicker(p => !p)}
            className="flex items-center gap-2 btn-glossy bg-surface text-foreground border border-surface-border px-4 py-2 rounded-xl font-medium shadow-sm hover:bg-surface-hover"
          >
            <Calendar size={18} />
            <span className="truncate max-w-[200px]">{range.label}</span>
            <ChevronDown size={14} className={`transition-transform ${showPicker ? "rotate-180" : ""}`} />
          </button>
          <button
            onClick={fetchAll}
            disabled={loading}
            title="Refresh data"
            className="flex items-center justify-center btn-glossy bg-surface text-foreground border border-surface-border px-3 py-2 rounded-xl shadow-sm hover:bg-surface-hover disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <Link
            href={`/app/laporan/export?start=${range.start}&end=${range.end}`}
            title="Export laporan"
            className="flex items-center gap-1.5 btn-glossy bg-primary text-primary-foreground border border-primary px-3 py-2 rounded-xl text-xs font-bold shadow-glossy-primary hover:bg-primary/90"
          >
            <Download size={14} /> Export
          </Link>
          {showPicker && (
            <div className="absolute top-full right-0 mt-2 z-30 bg-surface border border-surface-border rounded-2xl shadow-xl p-3 w-72 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-2 gap-2 mb-3">
                {([
                  ["7d", "7 Hari"],
                  ["30d", "30 Hari"],
                  ["bulan_ini", "Bulan Ini"],
                  ["bulan_lalu", "Bulan Lalu"],
                  ["tahun_ini", "Tahun Ini"],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => { setPreset(key); setShowPicker(false); }}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${preset === key ? "bg-primary text-primary-foreground border-primary" : "border-surface-border hover:bg-surface-hover"}`}
                  >{label}</button>
                ))}
              </div>
              <div className="border-t border-surface-border pt-3 space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Custom</p>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-surface-hover border border-surface-border rounded-lg px-2 py-1.5 text-xs" />
                  <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-surface-hover border border-surface-border rounded-lg px-2 py-1.5 text-xs" />
                </div>
                <button
                  onClick={() => { if (customStart && customEnd && customStart <= customEnd) { setPreset("custom"); setShowPicker(false); } }}
                  className="w-full px-3 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >Terapkan Custom</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error State */}
      {error ? (
        <div className="glass-panel p-10 flex flex-col items-center justify-center text-center text-red-500 min-h-[300px]">
          <AlertTriangle size={36} className="mb-3 opacity-70" />
          <p className="font-semibold text-lg">{error}</p>
          <button
            onClick={() => { setError(null); setLoading(true); window.location.reload(); }}
            className="mt-4 px-4 py-2 border border-red-500/20 bg-red-500/10 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      ) : (
        <>
          {/* Row 0: Financial Summary P&L */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 mb-4">
            <div className="glass-panel p-4 flex flex-col justify-between gap-2 bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Omzet</span>
                <div className="w-7 h-7 rounded-md bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <TrendingUp size={14} />
                </div>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold font-mono">
                  {loading ? <Skeleton className="h-8 w-24" /> : formatRp(labaRugi?.pendapatan || 0)}
                </p>
                {kpi && <div className="mt-1 flex items-center gap-1"><DeltaBadge pct={kpi.change.pendapatan} /> <span className="text-[10px] text-muted-foreground">vs periode lalu</span></div>}
              </div>
            </div>

            <div
              className="glass-panel p-4 flex flex-col justify-between gap-2 border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent"
              title={labaRugi ? `Sparepart: ${formatRp(labaRugi.hppSparepart)} • Jasa: ${formatRp(labaRugi.hppJasa)}` : ""}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">HPP (Modal)</span>
                <div className="w-7 h-7 rounded-md bg-orange-500/20 flex items-center justify-center text-orange-500">
                  <Package size={14} />
                </div>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold font-mono">
                  {loading ? <Skeleton className="h-8 w-24" /> : formatRp(labaRugi?.hpp || 0)}
                </p>
                {labaRugi && <p className="text-[10px] text-muted-foreground mt-1">Part {formatRp(labaRugi.hppSparepart)} · Jasa {formatRp(labaRugi.hppJasa)}</p>}
              </div>
            </div>

            <div className="glass-panel p-4 flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Laba Kotor</span>
                <div className="w-7 h-7 rounded-md bg-primary/20 flex items-center justify-center text-primary">
                  <PieChart size={14} />
                </div>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold font-mono">
                  {loading ? <Skeleton className="h-8 w-24" /> : formatRp(labaRugi?.labaKotor || 0)}
                </p>
                {labaRugi && <p className="text-[10px] text-muted-foreground mt-1">Margin: <b className={labaRugi.marginKotor >= 0 ? "text-emerald-600" : "text-red-500"}>{labaRugi.marginKotor.toFixed(1)}%</b></p>}
              </div>
            </div>

            <div className="glass-panel p-4 flex flex-col justify-between gap-2 border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pengeluaran</span>
                <div className="w-7 h-7 rounded-md bg-red-500/20 flex items-center justify-center text-red-500">
                  <TrendingDown size={14} />
                </div>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold font-mono">
                  {loading ? <Skeleton className="h-8 w-24" /> : formatRp(labaRugi?.pengeluaran || 0)}
                </p>
                {kpi && <div className="mt-1 flex items-center gap-1"><DeltaBadge pct={kpi.change.pengeluaran} invert /> <span className="text-[10px] text-muted-foreground">vs lalu</span></div>}
              </div>
            </div>

            <div className="glass-panel col-span-2 sm:col-span-4 lg:col-span-1 p-4 flex flex-col justify-between gap-2 border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 ring-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">Laba Bersih</span>
                <div className="w-7 h-7 rounded-md bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <DollarSign size={14} />
                </div>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black font-mono text-indigo-300 drop-shadow-sm">
                  {loading ? <Skeleton className="h-8 w-full" /> : formatRp(labaRugi?.labaBersih || 0)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {kpi && <DeltaBadge pct={kpi.change.labaBersih} />}
                  {labaRugi && <span className="text-[10px] text-indigo-400/80">Margin {labaRugi.marginBersih.toFixed(1)}%</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Row 0b: Operational KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <div className="glass-panel p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">SPK Selesai</span>
                <Receipt size={14} className="text-blue-500" />
              </div>
              <p className="text-xl font-bold font-mono">{loading ? <Skeleton className="h-6 w-12" /> : (kpi?.current.spkSelesai ?? 0)}</p>
              {kpi && <DeltaBadge pct={kpi.change.spkSelesai} />}
            </div>
            <div className="glass-panel p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avg Ticket</span>
                <Scissors size={14} className="text-purple-500" />
              </div>
              <p className="text-xl font-bold font-mono">{loading ? <Skeleton className="h-6 w-20" /> : formatRp(kpi?.current.avgTicket ?? 0)}</p>
              {kpi && <DeltaBadge pct={kpi.change.avgTicket} />}
            </div>
            <div className="glass-panel p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Repeat Rate</span>
                <Repeat size={14} className="text-emerald-500" />
              </div>
              <p className="text-xl font-bold font-mono">{loading ? <Skeleton className="h-6 w-16" /> : `${(pelanggan?.repeatRate ?? 0).toFixed(0)}%`}</p>
              {pelanggan && <p className="text-[10px] text-muted-foreground">{pelanggan.repeatPelanggan}/{pelanggan.uniquePelangganWithSpk} pelanggan</p>}
            </div>
            <div className="glass-panel p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mekanik Aktif</span>
                <Wrench size={14} className="text-amber-500" />
              </div>
              <p className="text-xl font-bold font-mono">{loading ? <Skeleton className="h-6 w-10" /> : (kpi?.current.mekanikAktif ?? 0)}</p>
              <p className="text-[10px] text-muted-foreground">available + busy</p>
            </div>
          </div>
          {/* Row 1: Chart + Top Items */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Trend Pendapatan */}
            <div className="glass-panel p-4 lg:p-6 lg:col-span-2 flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 xl:mb-6">
                <div>
                  <h2 className="text-lg font-bold">Trend Pendapatan {chartIsWeekly ? "Mingguan" : "Harian"}</h2>
                  <p className="text-xs text-muted-foreground mt-1">Rutin vs Bubut vs Modifikasi{chartIsWeekly ? " • diagregasi per minggu agar lebih terbaca" : ""}</p>
                </div>
                {pendapatan && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total ({range.label})</p>
                    <p className="text-lg font-bold text-emerald-500 font-mono">Rp {pendapatan.total.toLocaleString("id-ID")}</p>
                  </div>
                )}
              </div>

              <div className="flex-1 min-h-[220px] lg:min-h-[300px] w-full mt-4">
                {loading ? (
                  <div className="w-full h-full flex items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
                ) : chartData.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">Data belum tersedia</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                      <XAxis
                        dataKey="date"
                        stroke="#888888"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => {
                          const d = new Date(val);
                          return `${d.getDate()}/${d.getMonth()+1}`;
                        }}
                      />
                      <YAxis
                        stroke="#888888"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `Rp${(val >= 1000000 ? (val / 1000000) + 'M' : val / 1000 + 'K')}`}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Bar dataKey="rutin" name="Servis Rutin" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                      <Bar dataKey="bubut" name="Bubut" stackId="a" fill="#f59e0b" />
                      <Bar dataKey="modifikasi" name="Modifikasi" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Top Items Side Panel */}
            <div className="space-y-6 flex flex-col justify-between">
              {/* Top Jasa */}
              <div className="glass-panel p-6 flex-1 flex flex-col">
                <h3 className="font-bold flex items-center gap-2 mb-4">
                  <Wrench size={18} className="text-blue-500" /> Top Jasa Laris
                </h3>
                {loading ? (
                  <div className="space-y-3"><Skeleton className="h-8" /><Skeleton className="h-8" /></div>
                ) : !topItems || topItems.topJasa.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Belum ada data</p>
                ) : (
                  <div className="space-y-3 flex-1">
                    {topItems.topJasa.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-5 h-5 rounded-md bg-surface-hover flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-muted-foreground">{idx + 1}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate">{item.name}</p>
                            <p className="text-[10px] text-muted-foreground">{item.qty}x · {formatRp(item.revenue || 0)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top Sparepart */}
              <div className="glass-panel p-6 flex-1 flex flex-col">
                <h3 className="font-bold flex items-center gap-2 mb-4">
                  <Package size={18} className="text-amber-500" /> Top Sparepart
                </h3>
                {loading ? (
                  <div className="space-y-3"><Skeleton className="h-8" /><Skeleton className="h-8" /></div>
                ) : !topItems || topItems.topSparepart.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Belum ada data</p>
                ) : (
                  <div className="space-y-3 flex-1">
                    {topItems.topSparepart.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-5 h-5 rounded-md bg-surface-hover flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-muted-foreground">{idx + 1}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate">{item.name}</p>
                            <p className="text-[10px] text-muted-foreground">{item.qty} pcs · {formatRp(item.revenue || 0)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Row 1.5: Pengeluaran Breakdown */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="glass-panel p-4 lg:p-6 lg:col-span-2 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2"><Wallet size={18} className="text-red-500" /> Breakdown Pengeluaran</h2>
                  <p className="text-xs text-muted-foreground mt-1">Distribusi pengeluaran per kategori di periode terpilih.</p>
                </div>
                {breakdown && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-lg font-bold text-red-500 font-mono">Rp {breakdown.total.toLocaleString("id-ID")}</p>
                  </div>
                )}
              </div>
              {loading ? (
                <div className="space-y-2"><Skeleton className="h-8" /><Skeleton className="h-8" /><Skeleton className="h-8" /></div>
              ) : !breakdown || breakdown.breakdown.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">Tidak ada pengeluaran di periode ini.</div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4 items-center">
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={breakdown.breakdown}
                          dataKey="jumlah"
                          nameKey="kategori"
                          innerRadius={50}
                          outerRadius={85}
                          paddingAngle={2}
                        >
                          {breakdown.breakdown.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val: any) => `Rp ${Number(val).toLocaleString("id-ID")}`} contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, fontSize: 12 }} />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2">
                    {breakdown.breakdown.map((b, i) => (
                      <div key={b.kategoriId} className="flex items-center gap-3 text-xs">
                        <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{b.kategori}</p>
                          <p className="text-[10px] text-muted-foreground">{b.count} transaksi</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-mono font-bold">{formatRp(b.jumlah)}</p>
                          <p className="text-[10px] text-muted-foreground">{b.persen.toFixed(1)}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Mini: Basis info */}
            <div className="glass-panel p-4 lg:p-6 flex flex-col gap-3 bg-gradient-to-br from-indigo-500/5 to-transparent">
              <h3 className="text-sm font-bold flex items-center gap-2 text-indigo-400"><PieChart size={14} /> Basis Laporan</h3>
              <div className="space-y-2 text-xs">
                <p className="text-muted-foreground">Mode aktif: <b className={basis === "cash" ? "text-emerald-500" : "text-blue-500"}>{basis === "cash" ? "Kas (Cash)" : "Akrual"}</b></p>
                {basis === "cash" ? (
                  <p className="text-muted-foreground leading-relaxed">Pendapatan diakui saat <b>uang masuk</b> (pembayaran). Cocok untuk monitoring arus kas harian.</p>
                ) : (
                  <p className="text-muted-foreground leading-relaxed">Pendapatan diakui saat <b>SPK selesai</b> (tagihan jatuh). Cocok untuk evaluasi kinerja operasional.</p>
                )}
                <div className="border-t border-surface-border pt-2 mt-2 space-y-1">
                  <p className="text-[11px] text-muted-foreground">HPP Jasa akan meningkat bila tiap jasa memiliki <b>harga modal</b> (mis. komisi mekanik). Kosongkan untuk menjadikan seluruh jasa murni margin.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Top Mekanik + Top Spender */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Top Mekanik */}
            <div className="glass-panel p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Top Mekanik</h2>
                <Users className="text-primary" size={20} />
              </div>
              <p className="text-xs text-muted-foreground mb-4">Berdasarkan pendapatan yang dihasilkan (SPK selesai).</p>

              <div className="space-y-4 flex-1">
                {loading ? (
                  <div className="space-y-3"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
                ) : mekanik.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8">Belum ada penyelesaian SPK</div>
                ) : mekanik.slice(0, 3).map((m, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-surface-border bg-surface-hover/30 hover:bg-surface-hover transition-colors">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex justify-center items-center font-bold text-sm shrink-0">
                      {m.initial || m.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.spkSelesai} SPK Selesai</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-emerald-500 font-mono">{formatRp(Number(m.totalPendapatan))}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Spender */}
            <div className="glass-panel p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Top Spender (All Time) 💰</h3>
                {pelanggan && (
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="px-2 py-1 rounded-full bg-surface-hover border border-surface-border text-muted-foreground">Total: <b className="text-foreground">{pelanggan.totalPelanggan}</b></span>
                    <span className="px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600">Baru di periode: <b>{pelanggan.pelangganBaru}</b></span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loading ? (
                  <div className="space-y-3"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
                ) : pelanggan?.topSpenders.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground">Data belum tersedia</div>
                ) : pelanggan?.topSpenders.slice(0, 6).map((c, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-hover/30 border border-surface-border transition-colors">
                    <span className="text-lg w-6 text-center">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">{c._count.spk} kunjungan</p>
                    </div>
                    <span className="text-sm font-bold font-mono text-primary text-right">{formatRp(Number(c.totalTrx))}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
