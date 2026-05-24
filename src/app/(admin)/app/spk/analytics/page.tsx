"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Wrench, Package, Users, Calendar, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { formatRupiah } from "@/lib/utils";

interface ModeStat { count: number; omzet: number; outstanding: number; }
interface TopSparepart { sparepartId: number | null; nama: string; totalQty: number; totalRevenue: number; }
interface MekanikPerf { mekanikId: number | null; nama: string; initial: string; spkSelesai: number; totalRevenue: number; }
interface TrendItem { month: string; total: number; revenue: number; }
interface AnalyticsData {
  omzetPerMode: Record<string, ModeStat>;
  topSparepart: TopSparepart[];
  performa: MekanikPerf[];
  trend: TrendItem[];
}

export default function SpkAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    api.get<AnalyticsData>("/spk/analytics", params)
      .then(r => setData(r.data))
      .catch(err => setError(err instanceof Error ? err.message : "Gagal memuat analitik"))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  const fmtMonth = (m: string) => {
    const d = new Date(m);
    return d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
  };

  const totalOmzet = data ? Object.values(data.omzetPerMode).reduce((s, m) => s + m.omzet, 0) : 0;
  const totalCount = data ? Object.values(data.omzetPerMode).reduce((s, m) => s + m.count, 0) : 0;
  const totalOutstanding = data ? Object.values(data.omzetPerMode).reduce((s, m) => s + m.outstanding, 0) : 0;
  const maxRevenue = data ? Math.max(1, ...data.trend.map(t => t.revenue)) : 1;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/app/spk" className="p-2 hover:bg-surface-hover rounded-xl">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2"><TrendingUp size={20} className="text-primary" /> Analitik SPK</h1>
          <p className="text-xs text-muted-foreground">Breakdown per mode, top sparepart, performa mekanik, dan trend bulanan.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 p-4 bg-surface border border-surface-border rounded-2xl">
        <div className="flex-1 min-w-[140px]">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Calendar size={11} /> Dari Tanggal</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="w-full mt-1 bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Calendar size={11} /> Sampai</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="w-full mt-1 bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        {(dateFrom || dateTo) && (
          <button type="button" onClick={() => { setDateFrom(""); setDateTo(""); }}
            className="px-3 py-2 text-xs border border-surface-border rounded-xl hover:bg-surface-hover">Reset</button>
        )}
      </div>

      {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-600">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-primary" /></div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Total SPK" value={totalCount.toLocaleString("id-ID")} icon={<Wrench size={16} />} />
            <Stat label="Total Omzet" value={formatRupiah(totalOmzet)} icon={<TrendingUp size={16} />} accent="primary" />
            <Stat label="Outstanding" value={formatRupiah(totalOutstanding)} icon={<Package size={16} />} accent="amber" />
            <Stat label="Avg/SPK Selesai" value={formatRupiah(totalCount > 0 ? Math.round(totalOmzet / Math.max(1, totalCount)) : 0)} icon={<Users size={16} />} />
          </div>

          <Section title="Breakdown per Mode" icon={<Wrench size={16} />}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(["rutin", "modifikasi", "bubut"] as const).map(mode => {
                const m = data.omzetPerMode[mode] || { count: 0, omzet: 0, outstanding: 0 };
                const color = mode === "rutin" ? "blue" : mode === "modifikasi" ? "purple" : "orange";
                return (
                  <div key={mode} className={`p-4 bg-${color}-500/5 border border-${color}-500/20 rounded-2xl space-y-2`}>
                    <p className={`text-xs font-bold uppercase tracking-wider text-${color}-700 dark:text-${color}-400`}>{mode}</p>
                    <p className="text-2xl font-bold">{m.count}</p>
                    <p className="text-xs text-muted-foreground">SPK total</p>
                    <div className="border-t border-surface-border pt-2 space-y-0.5">
                      <p className="text-[10px] uppercase text-muted-foreground">Omzet (selesai)</p>
                      <p className="text-sm font-semibold text-primary">{formatRupiah(m.omzet)}</p>
                      {m.outstanding > 0 && (
                        <>
                          <p className="text-[10px] uppercase text-muted-foreground mt-1">Outstanding</p>
                          <p className="text-sm font-semibold text-amber-600">{formatRupiah(m.outstanding)}</p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title="Trend Bulanan (12 bulan terakhir)" icon={<TrendingUp size={16} />}>
            {data.trend.length === 0 ? (
              <p className="text-sm text-muted-foreground italic text-center py-6">Belum ada data trend</p>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-1 items-end h-40">
                  {data.trend.map(t => (
                    <div key={t.month} className="flex flex-col items-center justify-end gap-1 h-full" title={`${fmtMonth(t.month)}: ${t.total} SPK · ${formatRupiah(t.revenue)}`}>
                      <div className="w-full bg-primary/80 rounded-t transition-all hover:bg-primary"
                        style={{ height: `${Math.max(2, (t.revenue / maxRevenue) * 100)}%` }} />
                      <span className="text-[9px] text-muted-foreground">{fmtMonth(t.month)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>

          <Section title="Top 10 Sparepart Terpakai" icon={<Package size={16} />}>
            {data.topSparepart.length === 0 ? (
              <p className="text-sm text-muted-foreground italic text-center py-6">Belum ada data sparepart</p>
            ) : (
              <div className="divide-y divide-surface-border">
                {data.topSparepart.map((sp, i) => (
                  <div key={sp.sparepartId ?? i} className="flex items-center gap-3 py-2.5">
                    <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{sp.nama}</p>
                      <p className="text-[11px] text-muted-foreground">{sp.totalQty} unit terpakai</p>
                    </div>
                    <p className="text-sm font-bold text-primary shrink-0">{formatRupiah(sp.totalRevenue)}</p>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Performa Mekanik" icon={<Users size={16} />}>
            {data.performa.length === 0 ? (
              <p className="text-sm text-muted-foreground italic text-center py-6">Belum ada SPK selesai oleh mekanik</p>
            ) : (
              <div className="divide-y divide-surface-border">
                {data.performa.map((m, i) => (
                  <div key={m.mekanikId ?? i} className="flex items-center gap-3 py-2.5">
                    <span className="w-9 h-9 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{m.initial || "??"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.nama}</p>
                      <p className="text-[11px] text-muted-foreground">{m.spkSelesai} SPK selesai</p>
                    </div>
                    <p className="text-sm font-bold text-primary shrink-0">{formatRupiah(m.totalRevenue)}</p>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </>
      ) : null}
    </div>
  );
}

function Stat({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent?: "primary" | "amber" }) {
  const accentClass = accent === "primary" ? "text-primary" : accent === "amber" ? "text-amber-600" : "";
  return (
    <div className="p-3 bg-surface border border-surface-border rounded-2xl">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <p className={`text-lg font-bold mt-1 ${accentClass}`}>{value}</p>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-surface border border-surface-border rounded-2xl p-4">
      <h2 className="text-sm font-semibold flex items-center gap-2 mb-3 text-primary uppercase tracking-wider">{icon} {title}</h2>
      {children}
    </section>
  );
}
