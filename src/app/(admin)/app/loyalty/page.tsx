"use client";

import { useState, useEffect } from "react";
import { Star, Gift, TrendingUp, Crown, Users, Loader2, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/loading-skeleton";

interface LoyaltyTier {
  id: number;
  name: string;
  minPoints: number;
  multiplier: number;
  benefitDesc?: string;
  _count: { pelanggan: number };
}

interface LoyaltyOverview {
  tiers: LoyaltyTier[];
  totalMembers: number;
  totalPointsBeredar: number;
  redeemedThisMonth: number;
}

interface Reward {
  id: number;
  name: string;
  pointsCost: number;
  stock: number;
}

export default function LoyaltyPage() {
  const [overview, setOverview] = useState<LoyaltyOverview | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<LoyaltyOverview>("/loyalty"),
      api.get<Reward[]>("/loyalty/rewards")
    ])
    .then(([oRes, rRes]) => {
      setOverview(oRes.data);
      setRewards(rRes.data || []);
    })
    .catch(err => {
      console.error(err);
      setError("Gagal memuat data loyalty. Cek koneksi server.");
    })
    .finally(() => setLoading(false));
  }, []);

  const formatNumber = (num: number) => new Intl.NumberFormat("id-ID").format(num);

  // Tiers are ordered by minPoints ASC (lowest first), so we derive icons
  // by total tier count: the LAST tier is most prestigious (💎 or 🥇)
  const getTierTheme = (idx: number, total: number) => {
    const reverseIdx = total - 1 - idx; // 0 = most prestigious
    switch(reverseIdx) {
      case 0: return { icon: "💎", color: "border-cyan-500/30 bg-cyan-500/5", textColor: "text-cyan-500" };
      case 1: return { icon: "🥇", color: "border-amber-500/30 bg-amber-500/5", textColor: "text-amber-500" };
      case 2: return { icon: "🥈", color: "border-slate-400/30 bg-slate-400/5", textColor: "text-slate-500" };
      case 3: return { icon: "🥉", color: "border-amber-700/30 bg-amber-700/5", textColor: "text-amber-700" };
      default: return { icon: "⭐", color: "border-surface-border bg-surface", textColor: "text-primary" };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Loyalty Program</h1>
        <p className="text-muted-foreground">Kelola membership, poin, dan reward pelanggan setia.</p>
      </div>

      {error && (
        <div className="glass-panel p-6 flex items-center gap-4 border border-red-500/20 bg-red-500/5 text-red-500">
          <AlertTriangle size={20} className="shrink-0" />
          <p className="text-sm flex-1">{error}</p>
          <button onClick={() => { setError(null); window.location.reload(); }} className="text-xs px-3 py-1.5 border border-red-500/30 rounded-lg hover:bg-red-500/10">Coba Lagi</button>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 text-center flex flex-col justify-center min-h-[110px]">
          <Users size={20} className="mx-auto mb-2" />
          {loading ? <Loader2 className="animate-spin mx-auto text-muted-foreground" /> : <p className="text-2xl font-bold">{formatNumber(overview?.totalMembers || 0)}</p>}
          <p className="text-[10px] text-muted-foreground">Total Member</p>
        </div>
        <div className="glass-panel p-4 text-center flex flex-col justify-center min-h-[110px]">
          <Star size={20} className="mx-auto mb-2 text-amber-500" />
          {loading ? <Loader2 className="animate-spin mx-auto text-muted-foreground" /> : <p className="text-2xl font-bold text-amber-500">{formatNumber(overview?.totalPointsBeredar || 0)}</p>}
          <p className="text-[10px] text-muted-foreground">Poin Beredar</p>
        </div>
        <div className="glass-panel p-4 text-center flex flex-col justify-center min-h-[110px]">
          <Gift size={20} className="mx-auto mb-2 text-primary" />
          {loading ? <Loader2 className="animate-spin mx-auto text-muted-foreground" /> : <p className="text-2xl font-bold text-primary">{formatNumber(overview?.redeemedThisMonth || 0)}</p>}
          <p className="text-[10px] text-muted-foreground">Poin Ditukar (Bulan Ini)</p>
        </div>
        <div className="glass-panel p-4 text-center flex flex-col justify-center min-h-[110px]">
          <TrendingUp size={20} className="mx-auto mb-2 text-emerald-500" />
          <p className="text-2xl font-bold text-emerald-500">—</p>
          <p className="text-[10px] text-muted-foreground">Retention Rate (Segera Hadir)</p>
        </div>
      </div>

      {/* Tier Configuration */}
      <div className="glass-panel p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2"><Crown size={16} /> Tier Membership</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {loading ? (
            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-40 w-full rounded-2xl" /><Skeleton className="h-40 w-full rounded-2xl" /><Skeleton className="h-40 w-full rounded-2xl" />
            </div>
          ) : overview?.tiers.map((t, i) => {
            const theme = getTierTheme(i, overview.tiers.length);
            return (
              <div key={t.id} className={`p-5 rounded-2xl border-2 hover:shadow-sm transition-shadow ${theme.color}`}>
                <p className="text-lg font-bold mb-1">{theme.icon} {t.name}</p>
                <p className="text-xs font-mono text-muted-foreground mb-3">{formatNumber(t.minPoints)}+ poin (x{t.multiplier})</p>
                <p className="text-sm mb-3 min-h-[40px]">{t.benefitDesc || `Keuntungan khusus member ${t.name}.`}</p>
                <div className="pt-3 border-t border-surface-border/30">
                  <p className={`text-xl font-bold ${theme.textColor}`}>{formatNumber(t._count.pelanggan)}</p>
                  <p className="text-[10px] text-muted-foreground">member aktif</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Point Rules & Rewards */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-panel p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2"><Star size={16} /> Panduan Poin (Sistem)</h3>
          <div className="space-y-3">
            {[
              { rule: "Setiap transaksi Rp 10.000", poin: "+1 poin" },
              { rule: "Servis pertama kali", poin: "+50 poin bonus" },
              { rule: "Referral pelanggan baru", poin: "+100 poin" },
              { rule: "Review positif (Google Maps)", poin: "+20 poin" },
            ].map((r, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-surface-border bg-surface-hover/20">
                <span className="text-sm">{r.rule}</span>
                <span className="text-sm font-bold text-amber-500 font-mono">{r.poin}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2"><Gift size={16} /> Katalog Reward</h3>
          <div className="space-y-3">
            {loading ? (
              <div className="space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
            ) : rewards.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-4">Belum ada reward yang aktif</div>
            ) : rewards.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-xl border border-surface-border hover:bg-surface-hover/30 transition-colors">
                <div className="min-w-0 pr-4">
                  <p className="text-sm font-medium truncate">{r.name}</p>
                  <p className="text-[10px] text-muted-foreground">Tersedia: {formatNumber(r.stock)}</p>
                </div>
                <span className="text-sm font-bold text-primary font-mono shrink-0">{formatNumber(r.pointsCost)} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
