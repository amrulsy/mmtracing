"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { CheckCheck, FileText, CreditCard, Wrench, AlertTriangle, Settings, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { Pagination } from "@/lib/types";
import { Skeleton } from "@/components/ui/loading-skeleton";

interface Notifikasi {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;       // backend field is `link` not `referenceUrl`
  createdAt: string;
}

export default function NotifikasiPage() {
  const [tab, setTab] = useState("semua");
  const [notifs, setNotifs] = useState<Notifikasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 15 };
      if (tab !== "semua") params.type = tab;
      const res = await api.getPaginated<Notifikasi>("/notifikasi", params);
      setNotifs(res.data);
      setPagination(res.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, tab]);

  useEffect(() => {
    fetchNotifs();
  }, [fetchNotifs]);

  const markAllRead = async () => {
    try {
      await api.put("/notifikasi/read", {});
      setNotifs(notifs.map(n => ({ ...n, isRead: true })));
    } catch (e) { console.error(e); }
  };

  const markRead = async (id: number) => {
    try {
      await api.put(`/notifikasi/${id}/read`, {});
      setNotifs(notifs.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) { console.error(e); }
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case "spk": return <FileText size={16} />;
      case "pembayaran": return <CreditCard size={16} />;
      case "monitoring": return <Wrench size={16} />;
      case "stok": return <AlertTriangle size={16} />;
      default: return <Settings size={16} />;
    }
  };

  const typeColor = (type: string) => {
    switch (type) {
      case "spk": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "pembayaran": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "monitoring": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "stok": return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "bg-surface-hover text-muted-foreground border-surface-border";
    }
  };

  const timeAgo = (dateStr: string) => {
    const minDiff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 60000);
    if (minDiff < 60) return `${minDiff || 1} mnt lalu`;
    if (minDiff < 1440) return `${Math.floor(minDiff/60)} jam lalu`;
    return `${Math.floor(minDiff/1440)} hari lalu`;
  };

  const unreadCount = notifs.filter(n => !n.isRead).length;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out max-w-3xl mx-auto">
      <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Notifikasi
            {unreadCount > 0 && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">{unreadCount} baru</span>}
          </h1>
          <p className="text-muted-foreground text-sm">Pemberitahuan aktivitas bengkel.</p>
        </div>
        <button onClick={markAllRead} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-hover font-medium bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">
          <CheckCheck size={14} /> Tandai Semua Dibaca
        </button>
      </div>

      {/* Filter - scrollable */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0">
        {[
          { key: "semua", label: "Semua" },
          { key: "spk", label: "SPK" },
          { key: "pembayaran", label: "Pembayaran" },
          { key: "monitoring", label: "Monitoring" },
          { key: "stok", label: "Stok" },
          { key: "auth", label: "Keamanan" },
        ].map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${tab === t.key ? "bg-primary text-white shadow-sm" : "bg-surface border border-surface-border text-muted-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-1.5">
        {loading ? (
          Array.from({length: 4}).map((_,i) => <div key={i} className="p-4 rounded-xl border"><Skeleton className="h-10 w-full" /></div>)
        ) : notifs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground border rounded-xl bg-surface-hover/20">Tidak ada notifikasi</div>
        ) : notifs.map(n => (
          <div key={n.id} className={`flex items-start gap-3 p-3 lg:p-4 rounded-xl border transition-colors ${!n.isRead ? "bg-primary/5 border-primary/15 shadow-sm" : "border-surface-border hover:bg-surface-hover/30"}`}>
            <div className={`w-8 h-8 lg:w-9 lg:h-9 rounded-lg lg:rounded-xl flex items-center justify-center shrink-0 border ${typeColor(n.type)}`}>
              {typeIcon(n.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className={`text-sm font-semibold truncate ${!n.isRead ? "" : "text-muted-foreground"}`}>{n.title}</p>
                {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
                {n.link && (
                  <Link href={n.link} onClick={() => !n.isRead && markRead(n.id)} className="text-[10px] text-primary font-medium">Lihat →</Link>
                )}
                {!n.link && !n.isRead && (
                  <button onClick={() => markRead(n.id)} className="text-[10px] text-primary font-medium">Tandai dibaca</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
          <span className="text-xs">
            Halaman {page} dari {pagination.totalPages}
          </span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!pagination.hasPrev} className="px-3 py-1 rounded border border-surface-border bg-surface hover:bg-surface-hover text-xs disabled:opacity-50">←</button>
            <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={!pagination.hasNext} className="px-3 py-1 rounded border border-surface-border bg-surface hover:bg-surface-hover text-xs disabled:opacity-50">→</button>
          </div>
        </div>
      )}
    </div>
  );
}
