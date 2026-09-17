"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, Check, Loader2, Wrench, Receipt, Trophy, ShieldAlert, CircleDot } from "lucide-react";
import { portalFetch, portalLogout } from "@/lib/portalFetch";
import { SkeletonText } from "@/components/portal/PortalSkeleton";
import { PortalError } from "@/components/portal/PortalError";
import { useUnreadCount } from "@/hooks/usePortalApi";
import type { Notifikasi } from "@/types/portal";

export default function NotifikasiPage() {
  const [data, setData] = useState<Notifikasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<{ type: "auth" | "network" | "server"; message: string } | null>(null);
  const { refreshUnread } = useUnreadCount();
  const router = useRouter();

  const fetchNotifikasi = async () => {
    setError(null);
    try {
      const res = await portalFetch("/api/v1/customer-auth/notifikasi");
      if (res.status === 401 || res.status === 403) { portalLogout(); return; }
      const json = await res.json();
      if (json.success) setData(json.data.notifikasi);
      else setError({ type: "server", message: json.message || "Gagal memuat notifikasi" });
    } catch {
      setError({ type: "network", message: "Koneksi bermasalah. Periksa internet Anda." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifikasi(); }, []);

  const handleMarkAllRead = async () => {
    if (data.every(n => n.isRead)) return;
    setMarkingAll(true);
    try {
      await portalFetch("/api/v1/customer-auth/notifikasi/read-all", { method: "PUT" });
      setData(data.map(n => ({ ...n, isRead: true })));
      refreshUnread();
    } catch {
      // ignore
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationClick = async (item: Notifikasi) => {
    if (!item.isRead) {
      setData((current) => current.map((n) => n.id === item.id ? { ...n, isRead: true } : n));
      refreshUnread();
      await portalFetch(`/api/v1/customer-auth/notifikasi/${item.id}/read`, { method: "PUT" }).catch(() => {});
    }
    const destination = item.link && item.link.startsWith("/") ? item.link : "/portal/dashboard";
    router.push(destination);
  };

  const getIcon = (type: string) => {
    if (type.includes("pembayaran") || type.includes("lunas")) return <Receipt size={18} />;
    if (type.includes("garansi")) return <ShieldAlert size={18} />;
    if (type.includes("loyalty") || type.includes("poin")) return <Trophy size={18} />;
    return <Wrench size={18} />;
  };

  const getColor = (type: string) => {
    if (type.includes("selesai") || type.includes("lunas")) return "bg-emerald-500/10 text-emerald-500";
    if (type.includes("kendala") || type.includes("batal")) return "bg-red-500/10 text-red-500";
    if (type.includes("pembayaran")) return "bg-emerald-500/10 text-emerald-500";
    return "bg-primary/10 text-primary";
  };

  if (error && data.length === 0) {
    return (
      <div className="max-w-sm md:max-w-2xl mx-auto p-4">
        <PortalError error={error} onRetry={fetchNotifikasi} />
      </div>
    );
  }

  return (
    <div className="max-w-sm md:max-w-2xl mx-auto p-4 space-y-6 pb-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/portal/dashboard" className="p-2.5 bg-surface-hover/50 border border-surface-border hover:bg-surface-hover rounded-xl transition-colors md:hidden">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <Bell className="text-primary" size={24} /> Notifikasi
          </h1>
        </div>
        
        {data.some(n => !n.isRead) && (
          <button 
            onClick={handleMarkAllRead} 
            disabled={markingAll}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors"
          >
            {markingAll ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            <span className="hidden sm:inline">Tandai semua dibaca</span>
          </button>
        )}
      </div>

      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-4">
            <SkeletonText lines={2} />
            <SkeletonText lines={2} />
            <SkeletonText lines={2} />
          </div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center">
            <Bell size={56} className="mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-bold mb-1">Belum Ada Notifikasi</p>
            <p className="text-sm text-muted-foreground">Anda belum memiliki notifikasi apapun.</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-border/50">
            {data.map((item) => (
              <button
                type="button"
                key={item.id} 
                onClick={() => handleNotificationClick(item)}
                aria-label={`Buka notifikasi: ${item.title}`}
                className={`w-full text-left p-4 flex gap-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${item.isRead ? 'hover:bg-surface-hover/30' : 'bg-primary/5 hover:bg-primary/10'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${getColor(item.type)}`}>
                  {getIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <h3 className={`text-sm font-bold truncate ${item.isRead ? 'text-foreground' : 'text-primary'}`}>
                      {item.title}
                    </h3>
                    {!item.isRead && <CircleDot size={10} className="text-primary fill-primary shrink-0 mt-1.5" />}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {item.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 font-medium mt-2">
                    {new Date(item.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
