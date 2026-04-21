"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, FileText, CreditCard, Wrench, Trash2, Edit, UserPlus, Settings, Shield, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { Pagination } from "@/lib/types";
import { Skeleton } from "@/components/ui/loading-skeleton";

interface ActivityLog {
  id: number;
  module: string;
  action: string;
  details?: string;
  createdAt: string;
  user?: { id: number; name: string; username: string };
}

export default function LogAktivitasPage() {
  const [filterModule, setFilterModule] = useState("semua");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced, filterModule]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (filterModule !== "semua") params.module = filterModule;
      if (searchDebounced) params.search = searchDebounced;

      const res = await api.getPaginated<ActivityLog>("/log-aktivitas", params);
      setLogs(res.data);
      setPagination(res.pagination);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Gagal memuat log aktivitas");
    } finally {
      setLoading(false);
    }
  }, [page, filterModule, searchDebounced]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getModuleIcon = (moduleName: string) => {
    switch (moduleName) {
      case "spk": return FileText;
      case "pelanggan": return UserPlus;
      case "pembayaran": return CreditCard;
      case "monitoring": return Wrench;
      case "stok":
      case "inventaris": return Trash2;
      case "master": return Edit;
      case "auth": return Shield;
      default: return Settings;
    }
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'});
  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'});

  // Group by date
  const groupedLogs = logs.reduce((acc, log) => {
    const date = formatDate(log.createdAt);
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {} as Record<string, ActivityLog[]>);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out max-w-4xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Log Aktivitas</h1>
        <p className="text-muted-foreground">Audit trail semua perubahan dalam sistem — siapa, kapan, apa.</p>
      </div>

      <div className="glass-panel p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-background px-3 py-2 rounded-lg border border-surface-border flex-1 max-w-md focus-within:ring-1 focus-within:ring-primary">
          <Search size={18} className="text-muted-foreground" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari aktivitas..." className="bg-transparent border-none focus:outline-none text-sm w-full" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["semua", "spk", "pembayaran", "inventaris", "pelanggan", "master", "auth"].map(f => (
            <button key={f} onClick={() => setFilterModule(f)} className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full border transition-colors ${filterModule === f ? "bg-primary/10 text-primary border-primary/20" : "text-muted-foreground border-surface-border hover:bg-surface-hover"}`}>{f}</button>
          ))}
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="p-4 space-y-4">
            <Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 text-sm flex flex-col items-center gap-3">
            <span>{error}</span>
            <button onClick={fetchLogs} className="text-xs px-3 py-1.5 border border-red-500/30 rounded-lg hover:bg-red-500/10">Coba Lagi</button>
          </div>
        ) : Object.keys(groupedLogs).length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Tidak ada aktivitas tersimpan</div>
        ) : (
          Object.keys(groupedLogs).map((date) => (
            <div key={date}>
              <div className="p-4 border-b border-surface-border bg-surface-hover/30">
                <p className="text-sm font-medium text-muted-foreground">📅 {date}</p>
              </div>
              <div className="divide-y divide-surface-border">
                {groupedLogs[date].map((log) => {
                  const IconComp = getModuleIcon(log.module);
                  const userName = log.user?.name || "System Otomatis";
                  const isSystem = !log.user;
                  return (
                    <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-surface-hover/20 transition-colors">
                      <span className="text-xs font-mono text-muted-foreground mt-1 w-10 shrink-0">{formatTime(log.createdAt)}</span>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isSystem ? "bg-surface-border text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                        <IconComp size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-bold">{userName}</span>
                          <span className="text-muted-foreground"> — </span>
                          <span className="font-medium">{log.action}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 break-words">{log.details || "—"}</p>
                      </div>
                      <div className="shrink-0">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-surface-hover text-muted-foreground border border-surface-border">{log.module}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {/* Pagination offset logic equivalent */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-surface-border text-sm text-muted-foreground">
            <span className="text-xs">
              Halaman {page} dari {pagination.totalPages} ({pagination.total} total logs)
            </span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!pagination.hasPrev} className="px-3 py-1 rounded border border-surface-border bg-surface hover:bg-surface-hover text-xs disabled:opacity-50">←</button>
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={!pagination.hasNext} className="px-3 py-1 rounded border border-surface-border bg-surface hover:bg-surface-hover text-xs disabled:opacity-50">→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
