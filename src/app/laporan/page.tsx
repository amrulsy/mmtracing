"use client";

import { useState, useEffect } from "react";
import { Calendar, Loader2, Wrench, Package, Users, AlertTriangle } from "lucide-react";
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
  Legend
} from "recharts";

interface LaporanPendapatan {
  daily: Array<{ date: string; rutin: number; modifikasi: number; total: number }>;
  total: number;
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
}

interface LaporanPelanggan {
  topSpenders: Array<{ name: string; totalTrx: number; _count: { spk: number } }>;
  totalPelanggan: number;
  pelangganBaru: number;
}

export default function LaporanPage() {
  const [pendapatan, setPendapatan] = useState<LaporanPendapatan | null>(null);
  const [topItems, setTopItems] = useState<LaporanTopItems | null>(null);
  const [mekanik, setMekanik] = useState<LaporanMekanik[]>([]);
  const [pelanggan, setPelanggan] = useState<LaporanPelanggan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<LaporanPendapatan>("/laporan/pendapatan"),
      api.get<LaporanTopItems>("/laporan/top-items"),
      api.get<LaporanMekanik[]>("/laporan/mekanik"),
      api.get<LaporanPelanggan>("/laporan/pelanggan")
    ]).then(([pd, ti, mk, pl]) => {
      setPendapatan(pd.data);
      setTopItems(ti.data);
      setMekanik(mk.data || []);
      setPelanggan(pl.data);
    }).catch(err => {
      console.error(err);
      setError("Gagal memuat data laporan. Cek koneksi server.");
    }).finally(() => setLoading(false));
  }, []);

  const formatRp = (num: number) => {
    if (num >= 1_000_000_000) return `Rp ${(num/1_000_000_000).toFixed(1)}B`;
    if (num >= 1_000_000) return `Rp ${(num/1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `Rp ${(num/1_000).toFixed(0)}K`;
    return `Rp ${num.toLocaleString("id-ID")}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
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
            <span>Rp {payload[0].payload.total.toLocaleString("id-ID")}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Laporan &amp; Analitik</h1>
          <p className="text-muted-foreground">Analisis performa finansial dan operasional bengkel.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 btn-glossy bg-surface text-foreground border border-surface-border px-4 py-2 rounded-xl font-medium shadow-sm hover:bg-surface-hover">
            <Calendar size={20} />
            <span>Bulan Ini ({new Date().toLocaleDateString('id-ID', {month: 'long', year: 'numeric'})})</span>
          </button>
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
          {/* Row 1: Chart + Top Items */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Trend Pendapatan */}
            <div className="glass-panel p-6 lg:col-span-2 flex flex-col">
              <div className="flex items-center justify-between xl:mb-6">
                <div>
                  <h2 className="text-lg font-bold">Trend Pendapatan Harian</h2>
                  <p className="text-xs text-muted-foreground mt-1">Perbandingan Servis Rutin vs Modifikasi</p>
                </div>
                {pendapatan && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total (Bulan Ini)</p>
                    <p className="text-lg font-bold text-emerald-500 font-mono">Rp {pendapatan.total.toLocaleString("id-ID")}</p>
                  </div>
                )}
              </div>

              <div className="flex-1 min-h-[300px] w-full mt-4">
                {loading ? (
                  <div className="w-full h-full flex items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
                ) : !pendapatan || pendapatan.daily.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">Data belum tersedia</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pendapatan.daily.slice(-14)} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
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
                      <p className="text-xs text-muted-foreground truncate">{m._count.spk} SPK Selesai</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-emerald-500 font-mono">{formatRp(m.totalPendapatan)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Spender */}
            <div className="glass-panel p-6 lg:col-span-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Top Spender (All Time) 💰</h3>
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
                    <span className="text-sm font-bold font-mono text-primary text-right">{formatRp(c.totalTrx)}</span>
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
