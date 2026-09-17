"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Trophy, Star, Gift, History, Loader2, CheckCircle2 } from "lucide-react";
import { portalFetch, portalLogout } from "@/lib/portalFetch";
import { SkeletonCard, SkeletonKPI } from "@/components/portal/PortalSkeleton";
import { PortalError } from "@/components/portal/PortalError";
import type { LoyaltyData, LoyaltyReward, LoyaltyHistory } from "@/types/portal";

export default function LoyaltyPage() {
  const [data, setData] = useState<LoyaltyData | null>(null);
  const [history, setHistory] = useState<LoyaltyHistory[]>([]);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"rewards" | "history">("rewards");
  const [redeeming, setRedeeming] = useState<number | null>(null);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [error, setError] = useState<{ type: "auth" | "network" | "server"; message: string } | null>(null);

  const fetchLoyalty = async () => {
    setError(null);
    try {
      const [loyaltyRes, rewardsRes, historyRes] = await Promise.all([
        portalFetch("/api/v1/customer-auth/loyalty"),
        portalFetch("/api/v1/customer-auth/loyalty/rewards"),
        portalFetch("/api/v1/customer-auth/loyalty/history")
      ]);

      if (loyaltyRes.status === 401) { portalLogout(); return; }

      const [loyaltyJson, rewardsJson, historyJson] = await Promise.all([
        loyaltyRes.json(), rewardsRes.json(), historyRes.json()
      ]);

      if (loyaltyJson.success) setData(loyaltyJson.data);
      else setError({ type: "server", message: loyaltyJson.message || "Gagal memuat data loyalty" });

      if (rewardsJson.success) setRewards(rewardsJson.data);
      if (historyJson.success) setHistory(historyJson.data);
    } catch {
      setError({ type: "network", message: "Koneksi bermasalah. Periksa internet Anda." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLoyalty(); }, []);

  const handleRedeem = async (rewardId: number) => {
    if (!confirm("Tukar poin Anda dengan reward ini?")) return;
    
    setRedeeming(rewardId);
    setMsg({ text: "", type: "" });
    try {
      const res = await portalFetch("/api/v1/customer-auth/loyalty/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardId }),
      });
      const json = await res.json();
      if (json.success) {
        setMsg({ text: "Reward berhasil ditukar! Hubungi admin untuk klaim.", type: "success" });
        setData(prev => prev ? { ...prev, balance: json.data.balance } : null);
        
        // Refresh history & rewards stock
        const [rewardsRes, historyRes] = await Promise.all([
          portalFetch("/api/v1/customer-auth/loyalty/rewards"),
          portalFetch("/api/v1/customer-auth/loyalty/history")
        ]);
        setRewards((await rewardsRes.json()).data);
        setHistory((await historyRes.json()).data);
      } else {
        setMsg({ text: json.message || "Gagal menukar poin", type: "error" });
      }
    } catch {
      setMsg({ text: "Koneksi bermasalah", type: "error" });
    } finally {
      setRedeeming(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-sm md:max-w-2xl mx-auto p-4 space-y-6">
        <SkeletonCard height="h-32" />
        <SkeletonKPI />
        <SkeletonCard height="h-64" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-sm md:max-w-2xl mx-auto p-4">
        <PortalError error={error} onRetry={fetchLoyalty} />
      </div>
    );
  }

  const progressPercentage = data?.nextTier 
    ? Math.min(100, ((data.balance ?? 0) / data.nextTier.minPoints) * 100) 
    : 100;

  return (
    <div className="max-w-sm md:max-w-2xl mx-auto p-4 space-y-6 pb-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Link href="/portal/dashboard" className="p-2.5 bg-surface-hover/50 border border-surface-border hover:bg-surface-hover rounded-xl transition-colors md:hidden">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
          <Trophy className="text-amber-500" size={24} /> MMT Loyalty
        </h1>
      </div>

      {/* Hero Card */}
      <div className="glass-panel p-6 sm:p-8 bg-background relative overflow-hidden border-amber-500/30">
        <Trophy size={120} className="absolute -right-6 -bottom-6 text-amber-500/10 pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider mb-1">
              Member {data?.tier?.name || "Bronze"}
            </p>
            <p className="text-4xl sm:text-5xl font-black font-mono tracking-tight">{Number(data?.balance ?? 0).toLocaleString("id-ID")}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Poin Tersedia</p>
          </div>
        </div>

        {data?.nextTier && (
          <div className="mt-8 relative z-10">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider mb-2">
              <span className="text-muted-foreground">Progress ke {data.nextTier.name}</span>
              <span>{data.balance} / {data.nextTier.minPoints}</span>
            </div>
            <div className="w-full bg-background rounded-full h-2.5 border border-surface-border overflow-hidden">
              <div 
                className="h-full bg-amber-500 rounded-full transition-all duration-1000"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {msg.text && (
        <div className={`p-4 rounded-xl text-sm font-medium border ${msg.type === "error" ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"} flex items-start gap-2.5`}>
          <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
          <span>{msg.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-surface-hover border border-surface-border rounded-xl">
        <button 
          onClick={() => setActiveTab("rewards")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === "rewards" ? "bg-background shadow-sm text-amber-600 dark:text-amber-500" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Gift size={16} /> Rewards
        </button>
        <button 
          onClick={() => setActiveTab("history")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === "history" ? "bg-background shadow-sm text-amber-600 dark:text-amber-500" : "text-muted-foreground hover:text-foreground"}`}
        >
          <History size={16} /> Riwayat
        </button>
      </div>

      {/* Content */}
      {activeTab === "rewards" ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {rewards.map(reward => {
            const canRedeem = (data?.balance ?? 0) >= reward.pointsCost && reward.stock > 0;
            return (
              <div key={reward.id} className="glass-panel p-5 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-black text-lg">{reward.name}</h3>
                    <span className="text-[10px] font-bold px-2 py-1 bg-surface-hover rounded border border-surface-border">
                      Sisa {reward.stock}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">{reward.description || "Reward spesial untuk pelanggan setia MMT."}</p>
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-xl font-black font-mono text-amber-600 dark:text-amber-500">{reward.pointsCost} <span className="text-[10px] uppercase">pts</span></span>
                  <button 
                    onClick={() => handleRedeem(reward.id)}
                    disabled={!canRedeem || redeeming === reward.id}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                      canRedeem 
                        ? "bg-red-600 text-white shadow-lg hover:bg-red-700 active:scale-95" 
                        : "bg-surface-hover text-muted-foreground cursor-not-allowed"
                    }`}
                  >
                    {redeeming === reward.id ? <Loader2 size={14} className="animate-spin" /> : "Tukar Poin"}
                  </button>
                </div>
              </div>
            );
          })}
          {rewards.length === 0 && (
            <div className="col-span-full p-8 text-center glass-panel">
              <Gift size={56} className="mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-bold mb-1">Belum Ada Reward</p>
              <p className="text-sm text-muted-foreground">Saat ini belum ada reward yang tersedia.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-panel overflow-hidden">
          {history.length === 0 ? (
            <div className="p-8 text-center">
              <History size={56} className="mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-bold mb-1">Belum Ada Riwayat Poin</p>
              <p className="text-sm text-muted-foreground">Anda belum pernah mendapatkan poin loyalty.</p>
            </div>
          ) : (
            <div className="divide-y divide-surface-border/50">
              {history.map(item => {
                const isEarn = item.type === "earn";
                return (
                  <div key={item.id} className="p-4 flex items-center justify-between gap-4 hover:bg-surface-hover/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isEarn ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                        {isEarn ? <Star size={18} /> : <Gift size={18} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{item.description}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(item.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    <span className={`text-base font-black font-mono shrink-0 ${isEarn ? "text-emerald-500" : "text-red-500"}`}>
                      {isEarn ? "+" : "-"}{Math.abs(item.points)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
