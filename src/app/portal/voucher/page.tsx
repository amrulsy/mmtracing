"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Ticket, Loader2 } from "lucide-react";
import { portalFetch, portalLogout } from "@/lib/portalFetch";
import { PortalError } from "@/components/portal/PortalError";
import type { LoyaltyVoucher } from "@/types/portal";

export default function VoucherPage() {
  const [vouchers, setVouchers] = useState<LoyaltyVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ type: "auth" | "network" | "server"; message: string } | null>(null);

  useEffect(() => {
    portalFetch("/api/v1/customer-auth/loyalty/vouchers")
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) { portalLogout(); return; }
        const json = await res.json();
        if (json.success) setVouchers(json.data || []);
        else setError({ type: "server", message: json.message || "Gagal memuat voucher" });
      })
      .catch(() => setError({ type: "network", message: "Koneksi bermasalah. Coba lagi." }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="max-w-sm md:max-w-2xl mx-auto p-8 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  if (error) return <div className="max-w-sm md:max-w-2xl mx-auto p-4"><PortalError error={error} onRetry={() => window.location.reload()} /></div>;

  return <div className="max-w-sm md:max-w-2xl mx-auto p-4 space-y-6 pb-6">
    <div className="flex items-center gap-3"><Link href="/portal/loyalty" className="p-2.5 bg-surface-hover/50 border border-surface-border rounded-xl"><ArrowLeft size={18} /></Link><h1 className="text-xl font-black flex items-center gap-2"><Ticket className="text-amber-500" size={23} /> Voucher Saya</h1></div>
    {vouchers.length === 0 ? <div className="glass-panel p-10 text-center"><Ticket size={48} className="mx-auto mb-3 text-muted-foreground" /><p className="font-bold">Belum ada voucher</p><p className="text-sm text-muted-foreground mt-1">Tukar poin di halaman Loyalty untuk mendapatkan voucher.</p><Link href="/portal/loyalty" className="inline-block mt-5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold">Lihat Loyalty</Link></div> : <div className="grid sm:grid-cols-2 gap-3">{vouchers.map(v => <div key={v.id} className={`glass-panel p-4 border-l-4 ${v.status === "tersedia" ? "border-l-amber-500" : "border-l-surface-border opacity-70"}`}><div className="flex justify-between gap-3"><div><p className="text-xs text-muted-foreground">{v.rewardName || "Reward loyalty"}</p><p className="font-mono font-black text-lg tracking-wider mt-1">{v.code}</p></div><span className="text-[10px] uppercase font-bold px-2 py-1 rounded-full bg-surface-hover">{v.status}</span></div>{v.expiresAt && <p className="text-[10px] text-muted-foreground mt-3">Berlaku sampai {new Date(v.expiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>}</div>)}</div>}
  </div>;
}
