"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Filter, Camera, MessageSquare, AlertCircle, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { useSSE } from "@/hooks/useSSE";
import type { Spk, Mekanik } from "@/lib/types";

interface Column {
  title: string;
  statuses: string[];
  dot: string;
  bgMobile: string;
  cards: Spk[];
}

export default function MonitoringPage() {
  const [activeCol, setActiveCol] = useState(0);
  const [spkList, setSpkList] = useState<Spk[]>([]);
  const [mekaniks, setMekaniks] = useState<Mekanik[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterMekanik, setFilterMekanik] = useState<number | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const [spkRes, mekRes] = await Promise.all([
        api.getPaginated<Spk>("/spk", { limit: 100 }),
        api.getPaginated<Mekanik>("/mekanik", { limit: 50 }),
      ]);
      setSpkList(spkRes.data);
      setMekaniks(mekRes.data);
      setError("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data monitoring");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Close filter dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilter(false);
      }
    };
    if (showFilter) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showFilter]);

  // Auto-refresh via SSE
  useSSE((event) => {
    if (event.type?.startsWith("spk:") || event.type?.startsWith("pembayaran:")) {
      fetchData();
    }
  });

  // Apply mekanik filter
  const filtered = filterMekanik
    ? spkList.filter(s => s.mekanikId === filterMekanik)
    : spkList;

  // Build kanban columns
  const columns: Column[] = [
    {
      title: "Antrian",
      statuses: ["antri"],
      dot: "bg-slate-400",
      bgMobile: "",
      cards: filtered.filter(s => s.status === "antri"),
    },
    {
      title: "Dikerjakan",
      statuses: ["dikerjakan"],
      dot: "bg-blue-500 animate-pulse",
      bgMobile: "bg-blue-500/5",
      cards: filtered.filter(s => s.status === "dikerjakan"),
    },
    {
      title: "Kendala",
      statuses: ["kendala"],
      dot: "bg-amber-500",
      bgMobile: "bg-amber-500/5",
      cards: filtered.filter(s => s.status === "kendala"),
    },
    {
      title: "Selesai",
      statuses: ["selesai"],
      dot: "bg-emerald-500",
      bgMobile: "bg-emerald-500/5",
      cards: filtered.filter(s => s.status === "selesai"),
    },
  ];

  const formatRp = (n: number) => `Rp ${Number(n).toLocaleString("id-ID")}`;
  const modeLabel = (m: string) => m === "modifikasi" ? "Modif" : m === "bubut" ? "Bubut" : "Rutin";
  const modeColor = (m: string) => m === "modifikasi" ? "text-primary" : m === "bubut" ? "text-orange-500" : "text-slate-500";
  const getInitials = (name: string) => name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground w-8 h-8" /></div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 animate-in fade-in duration-500">
        <AlertTriangle size={32} className="text-red-500" />
        <p className="text-muted-foreground text-sm">{error}</p>
        <button onClick={() => { setLoading(true); fetchData(); }} className="text-primary text-sm font-medium hover:underline">Coba lagi</button>
      </div>
    );
  }

  const renderCard = (card: Spk) => (
    <Link key={card.id} href={`/app/spk/${card.id}`} className={`glass p-4 rounded-xl cursor-pointer hover:-translate-y-1 hover:shadow-glossy transition-all block ${card.prioritas === "urgent" || card.prioritas === "tinggi" ? "border-l-4 border-l-amber-500" : ""}`}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-background border border-surface-border">{card.noSpk}</span>
        <span className={`text-[10px] font-bold uppercase ${modeColor(card.mode)}`}>{modeLabel(card.mode)}</span>
      </div>
      <h4 className="font-semibold text-sm mb-1">{card.judulProyek || card.keluhan || card.noSpk}</h4>
      <p className="text-xs text-muted-foreground mb-3">{card.pelanggan?.name ?? "—"} {card.kendaraan ? `• ${card.kendaraan.name}` : ""}</p>
      {card.progress > 0 && card.progress < 100 && (
        <div className="mb-3 space-y-1.5">
          <div className="flex justify-between text-[10px] text-muted-foreground font-medium"><span>Progress</span><span>{card.progress}%</span></div>
          <div className="w-full bg-surface border border-surface-border rounded-full h-1.5 overflow-hidden"><div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${card.progress}%` }} /></div>
        </div>
      )}
      {card.catatan && card.status === "kendala" && (
        <div className="p-2 mb-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex gap-2 text-xs text-amber-700 dark:text-amber-400">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <p className="line-clamp-2">{card.catatan}</p>
        </div>
      )}
      <div className="pt-3 border-t border-surface-border/50 flex justify-between items-center">
        {card.mekanik ? (
          <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center font-bold border-2 border-surface" title={card.mekanik.name}>
            {getInitials(card.mekanik.name)}
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-surface-border text-muted-foreground text-[10px] flex items-center justify-center font-bold border-2 border-surface">?</div>
        )}
        {card.status === "antri" && <span className="text-xs text-muted-foreground font-medium">{card.prioritas === "urgent" ? "🔥 Urgent" : card.prioritas === "tinggi" ? "⚡ Prioritas Tinggi" : "Menunggu"}</span>}
        {card.status === "dikerjakan" && card.startedAt && (
          <span className="text-xs text-blue-500 font-medium">
            {(() => {
              const diff = Date.now() - new Date(card.startedAt).getTime();
              const hours = Math.floor(diff / 3600000);
              const mins = Math.floor((diff % 3600000) / 60000);
              return `Sedang Jalan (${hours}h ${mins}m)`;
            })()}
          </span>
        )}
        {card.status === "kendala" && (
          <span className="text-xs flex items-center gap-1 font-medium text-amber-600"><MessageSquare size={12} /> Follow Up</span>
        )}
        {card.status === "selesai" && <span className="text-xs text-emerald-600 font-medium">{formatRp(card.totalHarga)}</span>}
      </div>
    </Link>
  );

  return (
    <div className="space-y-4 lg:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Monitoring Pengerjaan</h1>
          <p className="text-muted-foreground text-sm">Task Board (Kanban) — Data real-time dari backend.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fetchData()} className="flex items-center gap-2 bg-surface border border-surface-border px-3 py-2 rounded-xl text-sm font-medium hover:bg-surface-hover">
            <RefreshCw size={16} /> Refresh
          </button>
          <div className="relative" ref={filterRef}>
            <button onClick={() => setShowFilter(!showFilter)} className="flex items-center gap-2 bg-surface border border-surface-border px-3 py-2 rounded-xl text-sm font-medium hover:bg-surface-hover">
              <Filter size={16} /> {filterMekanik ? mekaniks.find(m => m.id === filterMekanik)?.name : "Semua Mekanik"}
            </button>
            {showFilter && (
              <div className="absolute right-0 top-full mt-1 z-50 glass-panel p-2 min-w-[200px] space-y-1">
                <button onClick={() => { setFilterMekanik(null); setShowFilter(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm ${!filterMekanik ? "bg-primary/10 text-primary font-medium" : "hover:bg-surface-hover"}`}>
                  Semua Mekanik
                </button>
                {mekaniks.map(m => (
                  <button key={m.id} onClick={() => { setFilterMekanik(m.id); setShowFilter(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm ${filterMekanik === m.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-surface-hover"}`}>
                    {m.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Column Switcher */}
      <div className="flex gap-1 overflow-x-auto lg:hidden pb-1">
        {columns.map((col, i) => (
          <button key={i} onClick={() => setActiveCol(i)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${activeCol === i ? "bg-primary text-white shadow-glossy-primary" : "bg-surface border border-surface-border text-muted-foreground"}`}>
            <span className={`w-2 h-2 rounded-full ${activeCol === i ? "bg-white" : col.dot}`} />
            {col.title} <span className="opacity-60">({col.cards.length})</span>
          </button>
        ))}
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-2">
        {columns[activeCol].cards.length === 0 ? (
          <div className={`rounded-xl border border-surface-border p-8 text-center text-sm text-muted-foreground ${columns[activeCol].bgMobile}`}>
            Tidak ada SPK di kolom ini
          </div>
        ) : columns[activeCol].cards.map(card => renderCard(card))}
      </div>

      {/* Desktop Kanban */}
      <div className="hidden lg:flex gap-6 h-[calc(100vh-14rem)] overflow-x-auto pb-4">
        {columns.map((col, ci) => (
          <div key={ci} className="w-80 flex flex-col gap-4 shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2"><span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />{col.title}</h3>
              <span className="text-xs font-medium bg-surface-hover px-2 py-1 rounded-full border border-surface-border">{col.cards.length}</span>
            </div>
            <div className={`flex-1 rounded-2xl border border-surface-border/50 p-2 space-y-3 overflow-y-auto ${col.bgMobile || "bg-surface-hover/30"}`}>
              {col.cards.length === 0 ? (
                <div className="h-full flex items-center justify-center"><p className="text-sm text-muted-foreground/50 font-medium">Tidak ada SPK</p></div>
              ) : col.cards.map(card => renderCard(card))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
