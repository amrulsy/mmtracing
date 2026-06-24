"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, ShieldAlert, AlertTriangle, ChevronRight, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { portalFetch, portalLogout } from "@/lib/portalFetch";
import { SkeletonCard } from "@/components/portal/PortalSkeleton";
import { PortalError } from "@/components/portal/PortalError";
import type { Garansi, GaransiClaim } from "@/types/portal";

export default function GaransiPage() {
  const [data, setData] = useState<Garansi[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [claimReason, setClaimReason] = useState("");
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [error, setError] = useState<{ type: "auth" | "network" | "server"; message: string } | null>(null);

  const fetchGaransi = async () => {
    setError(null);
    try {
      const res = await portalFetch("/api/v1/customer-auth/garansi");
      if (res.status === 401 || res.status === 403) { portalLogout(); return; }
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError({ type: "server", message: json.message || "Gagal memuat data garansi" });
    } catch {
      setError({ type: "network", message: "Koneksi bermasalah. Periksa internet Anda." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGaransi(); }, []);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimingId || !claimReason) return;
    
    setMsg({ text: "", type: "" });
    try {
      const res = await portalFetch("/api/v1/customer-auth/garansi/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ garansiId: claimingId, reason: claimReason }),
      });
      const json = await res.json();
      
      if (json.success) {
        setMsg({ text: "Klaim garansi berhasil diajukan! Mekanik kami akan segera memeriksa.", type: "success" });
        setClaimingId(null);
        setClaimReason("");
        // Reload data
        const reload = await portalFetch("/api/v1/customer-auth/garansi");
        setData((await reload.json()).data);
      } else {
        setMsg({ text: json.message || "Gagal mengajukan klaim", type: "error" });
      }
    } catch {
      setMsg({ text: "Koneksi bermasalah", type: "error" });
    }
  };

  if (loading) {
    return (
      <div className="max-w-sm md:max-w-2xl mx-auto p-4 space-y-4">
        <SkeletonCard height="h-32" />
        <SkeletonCard height="h-32" />
      </div>
    );
  }

  if (error && data.length === 0) {
    return (
      <div className="max-w-sm md:max-w-2xl mx-auto p-4">
        <PortalError error={error} onRetry={fetchGaransi} />
      </div>
    );
  }

  const activeCount = data.filter(g => g.computedStatus === "aktif" || g.computedStatus === "hampir").length;

  return (
    <div className="max-w-sm md:max-w-2xl mx-auto p-4 space-y-6 pb-28 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Link href="/portal/dashboard" className="p-2.5 bg-surface-hover/50 border border-surface-border hover:bg-surface-hover rounded-xl transition-colors md:hidden">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
          <ShieldCheck className="text-emerald-500" size={24} /> Garansi Anda
        </h1>
        <span className="ml-auto bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/20">
          {activeCount} Aktif
        </span>
      </div>

      {msg.text && (
        <div className={`p-4 rounded-xl text-sm font-medium border ${msg.type === "error" ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"} flex items-start gap-2.5`}>
          {msg.type === "error" ? <AlertCircle size={18} className="shrink-0 mt-0.5" /> : <CheckCircle2 size={18} className="shrink-0 mt-0.5" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Modal Klaim */}
      {claimingId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-background border border-surface-border rounded-2xl shadow-2xl p-6 animate-in zoom-in-95">
            <h3 className="text-lg font-black mb-2">Ajukan Klaim Garansi</h3>
            <p className="text-xs text-muted-foreground mb-4">Sebutkan kendala yang Anda alami secara detail.</p>
            <form onSubmit={handleClaim} className="space-y-4">
              <textarea
                required
                value={claimReason}
                onChange={e => setClaimReason(e.target.value)}
                className="w-full bg-surface-hover/50 border border-surface-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none h-28"
                placeholder="Contoh: Mesin masih brebet di rpm atas, padahal baru diservis minggu lalu..."
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setClaimingId(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-surface-border hover:bg-surface-hover transition-colors text-sm font-bold text-muted-foreground">Batal</button>
                <button type="submit" disabled={claimReason.length < 5} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-all disabled:opacity-50">Kirim Klaim</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {data.length === 0 ? (
          <div className="text-center py-12 glass-panel">
            <ShieldAlert size={56} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-bold">Belum Ada Garansi</p>
            <p className="text-sm text-muted-foreground">Belum ada garansi yang terdaftar</p>
          </div>
        ) : (
          data.map(item => {
            const isExpired = item.computedStatus === "expired";
            const isHampir = item.computedStatus === "hampir";
            const hasPendingClaim = item.claims?.some((c: GaransiClaim) => c.status === "pending");

            return (
              <div key={item.id} className="glass-panel overflow-hidden border border-surface-border/50">
                <div className={`p-4 sm:p-5 flex flex-col sm:flex-row gap-4 justify-between items-start border-l-4 ${isExpired ? 'border-l-red-500' : isHampir ? 'border-l-amber-500' : 'border-l-emerald-500'}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-black tracking-tight uppercase truncate">{item.itemName}</h3>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                        isExpired ? "bg-red-500/10 text-red-500" : 
                        isHampir ? "bg-amber-500/10 text-amber-500" : 
                        "bg-emerald-500/10 text-emerald-500"
                      }`}>
                        {item.computedStatus}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 mb-2">
                      <span className="font-mono bg-surface-hover px-1.5 py-0.5 rounded">{item.noSpk}</span>
                      <span className="mx-2">•</span>
                      <span>Tipe: <strong className="uppercase">{item.type}</strong></span>
                    </p>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground mt-3">
                      <div className="bg-surface-hover/50 px-2.5 py-1.5 rounded-lg border border-surface-border">
                        Mulai: {new Date(item.startDate).toLocaleDateString("id-ID")}
                      </div>
                      <ChevronRight size={12} className="opacity-50" />
                      <div className="bg-surface-hover/50 px-2.5 py-1.5 rounded-lg border border-surface-border">
                        Berakhir: {new Date(item.endDate).toLocaleDateString("id-ID")}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-left sm:text-right shrink-0 w-full sm:w-auto flex flex-row sm:flex-col items-center justify-between sm:items-end sm:justify-start gap-3">
                    <div className="text-center sm:text-right">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sisa Waktu</p>
                      <p className={`text-2xl font-black font-mono leading-none mt-1 ${isExpired ? "text-red-500" : "text-foreground"}`}>
                        {item.daysLeft > 0 ? `${item.daysLeft} Hari` : "Habis"}
                      </p>
                    </div>
                    {!isExpired && !hasPendingClaim && (
                      <button onClick={() => setClaimingId(item.id)} className="px-4 py-2 border border-surface-border text-foreground rounded-xl text-xs font-bold hover:bg-surface-hover transition-colors active:scale-95">
                        Ajukan Klaim
                      </button>
                    )}
                    {hasPendingClaim && (
                      <span className="px-3 py-1.5 bg-amber-500/10 text-amber-500 text-[10px] font-bold rounded-lg border border-amber-500/20 flex items-center gap-1.5">
                        <Loader2 size={12} className="animate-spin" /> Sedang Diproses
                      </span>
                    )}
                  </div>
                </div>

                {/* History Klaim */}
                {item.claims && item.claims.length > 0 && (
                  <div className="bg-surface-hover/30 border-t border-surface-border/50 p-4">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Riwayat Klaim</p>
                    <div className="space-y-3">
                      {item.claims.map((claim: GaransiClaim) => (
                        <div key={claim.id} className="bg-background rounded-xl p-3 border border-surface-border text-sm flex gap-3">
                          <div className={`mt-0.5 shrink-0 ${
                            claim.status === "pending" ? "text-amber-500" :
                            claim.status === "approved" || claim.status === "resolved" ? "text-emerald-500" :
                            "text-red-500"
                          }`}>
                            {claim.status === "pending" ? <AlertTriangle size={16} /> :
                             claim.status === "rejected" ? <XCircle size={16} /> :
                             <CheckCircle2 size={16} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground">{claim.reason}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {new Date(claim.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                              <span className="mx-1">•</span> 
                              <strong className="uppercase">{claim.status}</strong>
                            </p>
                            {claim.resolution && (
                              <div className="mt-2 text-xs bg-surface-hover/50 p-2 rounded-lg border border-surface-border/50 text-muted-foreground">
                                <strong>Tanggapan:</strong> {claim.resolution}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
