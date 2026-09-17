"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Search, Loader2, ArrowLeft, AlertCircle, MapPin, ShieldCheck,
  CheckCircle2, Circle, CarFront, ImageIcon, Wrench, Receipt,
  Clock, Activity, RefreshCw, Moon, Sun, X, MessageCircle,
  Share2, Copy, Check
} from "lucide-react";
import Image from "next/image";

// ============ Photo Lightbox ============
function PhotoLightbox({ photos, initialIndex, onClose }: { photos: any[]; initialIndex: number; onClose: () => void }) {
  const [index, setIndex] = useState(initialIndex);
  const photo = photos[index];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) setIndex(i => i - 1);
      if (e.key === "ArrowRight" && index < photos.length - 1) setIndex(i => i + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [index, photos.length, onClose]);

  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center animate-in fade-in duration-200" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white p-2 z-10"><X size={28} /></button>
      <div className="relative w-full max-w-3xl max-h-[85vh] mx-4" onClick={e => e.stopPropagation()}>
        <Image src={photo.url} alt={photo.keterangan || "Foto SPK"} width={900} height={700} className="object-contain w-full max-h-[80vh] rounded-xl" unoptimized />
        {photo.keterangan && <p className="text-center text-white/80 text-sm mt-3">{photo.keterangan}</p>}
        <p className="text-center text-white/40 text-xs mt-1">{index + 1} / {photos.length}</p>
        {index > 0 && (
          <button onClick={() => setIndex(i => i - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-sm">‹</button>
        )}
        {index < photos.length - 1 && (
          <button onClick={() => setIndex(i => i + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-sm">›</button>
        )}
      </div>
    </div>
  );
}

// ============ SPK Detail View (shared between form result and tracked SPK) ============
function SpkDetailView({ spk, onBack }: { spk: any; onBack: () => void }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [liveSpk, setLiveSpk] = useState(spk);
  const [copied, setCopied] = useState(false);

  const statusConfig: Record<string, { color: string; label: string }> = {
    selesai: { color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", label: "✅ Selesai" },
    batal: { color: "bg-red-500/10 text-red-500 border-red-500/20", label: "❌ Dibatalkan" },
    dikerjakan: { color: "bg-blue-500/10 text-blue-500 border-blue-500/20", label: "🔧 Dikerjakan" },
    kendala: { color: "bg-amber-500/10 text-amber-500 border-amber-500/20", label: "⚠️ Kendala" },
    antri: { color: "bg-surface-hover text-muted-foreground border-surface-border", label: "⏳ Antri" },
  };

  const currentStatus = statusConfig[liveSpk.status] || statusConfig.antri;
  const totalTagihan = Number(liveSpk.totalHarga || 0) - Number(liveSpk.diskon || 0);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: `Lacak SPK ${liveSpk.noWo}`, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      {lightboxIndex !== null && liveSpk.photos && (
        <PhotoLightbox photos={liveSpk.photos} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="p-2.5 bg-surface-hover/50 border border-surface-border hover:bg-surface-hover rounded-xl transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground font-mono">{liveSpk.noWo}</p>
          <button onClick={handleShare} className="p-2 bg-surface-hover/50 border border-surface-border hover:bg-surface-hover rounded-xl transition-colors text-muted-foreground" title="Bagikan">
            {copied ? <Check size={14} className="text-emerald-500" /> : <Share2 size={14} />}
          </button>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`rounded-2xl p-4 sm:p-5 border flex items-center justify-between ${currentStatus.color}`}>
        <div>
          <p className="text-sm font-black">{currentStatus.label}</p>
          <p className="text-[10px] opacity-70 mt-0.5">
            Update: {new Date(liveSpk.updatedAt || liveSpk.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <span className="text-2xl font-black font-mono">{liveSpk.progress}%</span>
      </div>

      {/* Info Cards */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="glass-panel p-4 border-l-4 border-l-primary flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><CarFront size={18} /></div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Kendaraan</p>
            <p className="text-sm font-bold leading-tight truncate">{liveSpk.kendaraan?.name || "Tanpa Kendaraan"}</p>
            <p className="text-xs font-mono text-muted-foreground mt-0.5">{liveSpk.kendaraan?.plat || "-"}</p>
          </div>
        </div>
        <div className="glass-panel p-4 border-l-4 border-l-blue-500 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0"><Wrench size={18} /></div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Mekanik</p>
            <p className="text-sm font-bold leading-tight truncate">{liveSpk.mekanik?.name || "Belum Ditugaskan"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{new Date(liveSpk.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
        </div>
      </div>

      {/* Live Progress */}
      <div className="glass-panel p-5 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold flex items-center gap-1.5"><Activity size={16} className="text-primary" /> Live Progress</h2>
          {liveSpk.stages && liveSpk.stages.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {liveSpk.stages.filter((s: any) => s.status === "selesai").length}/{liveSpk.stages.length} tahap
            </span>
          )}
        </div>
        <div className="w-full bg-background rounded-full h-2.5 mb-6 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-1000 ${liveSpk.progress === 100 ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${liveSpk.progress}%` }} />
        </div>

        {liveSpk.stages && liveSpk.stages.length > 0 ? (
          <div className="space-y-0 relative ml-2">
            <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-surface-border" />
            {liveSpk.stages.map((stage: any, index: number) => {
              const isDone = stage.status === "selesai";
              const isWip = stage.status === "dikerjakan";
              return (
                <div key={stage.id} className={`relative pl-8 py-3 ${isDone || isWip ? "opacity-100" : "opacity-40"}`}>
                  {isDone ? (
                    <CheckCircle2 size={16} className="absolute left-0 top-3.5 bg-background text-emerald-500 rounded-full z-10" />
                  ) : isWip ? (
                    <div className="absolute left-[1px] top-4 w-3.5 h-3.5 bg-primary rounded-full ring-4 ring-primary/20 animate-pulse z-10" />
                  ) : (
                    <Circle size={14} className="absolute left-[1px] top-4 bg-background text-surface-border fill-background z-10" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm font-bold ${isDone ? "text-emerald-500" : isWip ? "text-primary" : "text-foreground"}`}>{stage.nama}</h4>
                      {isWip && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase animate-pulse">Aktif</span>}
                    </div>
                    {stage.catatanMekanik && (
                      <p className="text-xs text-muted-foreground mt-1.5 bg-surface-hover/50 p-2.5 rounded-lg border border-surface-border/50">📝 {stage.catatanMekanik}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Clock size={28} className="mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Tahapan belum ditetapkan</p>
          </div>
        )}
      </div>

      {/* Galeri Foto */}
      {liveSpk.photos && liveSpk.photos.length > 0 && (
        <div className="glass-panel p-5">
          <h2 className="text-sm font-bold flex items-center gap-1.5 mb-4">
            <ImageIcon size={16} className="text-primary" /> Foto Dokumentasi
            <span className="text-[10px] bg-surface-hover text-muted-foreground px-1.5 py-0.5 rounded-full font-normal ml-auto">{liveSpk.photos.length}</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {liveSpk.photos.map((photo: any, i: number) => (
              <button key={photo.id} onClick={() => setLightboxIndex(i)} className="relative aspect-square rounded-xl overflow-hidden border border-surface-border group cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all active:scale-95">
                <Image src={photo.url} alt={photo.keterangan || "Foto SPK"} fill className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized />
                {photo.keterangan && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <p className="text-[10px] text-white font-medium line-clamp-1">{photo.keterangan}</p>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pembayaran */}
      {liveSpk.pembayaran && (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Total Tagihan</p>
            <p className="text-2xl font-black text-primary font-mono">Rp {totalTagihan.toLocaleString("id-ID")}</p>
          </div>
          <Link href={`/pub/pembayaran/${liveSpk.pembayaran.publicId}`} className="w-full sm:w-auto px-6 py-3 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 text-center flex items-center justify-center gap-2 active:scale-95">
            <Receipt size={16} /> Lihat Tagihan
          </Link>
        </div>
      )}

      {/* Footer */}
      <div className="text-center pt-4 pb-8">
        <p className="text-xs text-muted-foreground mb-2">Ada pertanyaan?</p>
        <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "62274123456"}?text=${encodeURIComponent(`Halo MMT Racing, saya ingin bertanya tentang SPK ${liveSpk.noWo}`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-[#25D366] hover:text-[#25D366]/80 transition-colors">
          <MessageCircle size={16} /> Tanya via WhatsApp
        </a>
      </div>
    </div>
  );
}

// ============ Main Track Page ============
export default function TrackPage() {
  const [noWo, setNoSpk] = useState("");
  const [accessPin, setAccessPin] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [spk, setSpk] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => { setMounted(true); }, []);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noWo || !accessPin) return;

    setStatus("loading");
    setMsg("");
    setSpk(null);

    try {
      const res = await fetch("/api/v1/landing/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noWo: noWo.trim(), accessPin })
      });
      const data = await res.json();

      if (!data.success) {
        setStatus("error");
        setMsg(data.message || "Gagal menemukan data SPK");
        return;
      }

      setSpk(data.data);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setMsg("Koneksi bermasalah. Silakan coba lagi.");
    }
  };

  const inputCls = "w-full bg-surface-hover border border-surface-border rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all focus:bg-background";
  const labelCls = "text-xs font-semibold text-muted-foreground mb-1.5 block";

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-surface-border">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="font-black text-xl tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
              <span className="text-sm font-black">M</span>
            </div>
            <span>MMT Racing</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg hover:bg-surface-hover transition-colors text-muted-foreground"
              suppressHydrationWarning
            >
              {mounted ? (theme === "dark" ? <Sun size={16} /> : <Moon size={16} />) : <Moon size={16} />}
            </button>
            <Link href="/portal/login" className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-surface-border hover:bg-surface-hover">
              Portal Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-primary/8 blur-[120px] rounded-full pointer-events-none" />

      <main className="flex-1 pt-24 pb-20 px-4 max-w-3xl mx-auto w-full relative z-10">
        {!spk ? (
          <div className="max-w-md mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-8 sm:mt-14">
            {/* Hero Section */}
            <div className="text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mx-auto mb-5 relative">
                <MapPin size={36} />
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <Search size={10} className="text-white" />
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black mb-3 tracking-tight">Lacak Kendaraan</h1>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                Masukkan Nomor WO dan PIN Akses yang tertera di nota servis atau yang dikirimkan via WhatsApp.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleTrack} className="glass-panel p-6 sm:p-8 space-y-5">
              {msg && (
                <div className={`p-4 rounded-xl text-sm font-medium flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 duration-300 ${status === "error" ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"}`}>
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span>{msg}</span>
                </div>
              )}

              <div>
                <label className={labelCls}>Nomor WO <span className="text-red-500">*</span></label>
                <input
                  required
                  type="text"
                  value={noWo}
                  onChange={e => setNoSpk(e.target.value.toUpperCase())}
                  className={`${inputCls} font-mono uppercase`}
                  placeholder="Cth: SPK-20260601-ABCD"
                  autoComplete="off"
                />
              </div>

              <div>
                <label className={labelCls}>PIN Akses <span className="text-red-500">*</span></label>
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={accessPin}
                  onChange={e => setAccessPin(e.target.value.replace(/[^0-9]/g, ""))}
                  className={`${inputCls} font-mono tracking-[0.3em] text-center text-lg`}
                  placeholder="• • • • • •"
                  autoComplete="off"
                />
                <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                  <ShieldCheck size={12} className="text-emerald-500" /> Data dilindungi dan bersifat rahasia
                </p>
              </div>

              <button
                disabled={status === "loading" || !noWo.trim() || accessPin.length !== 6}
                type="submit"
                className="w-full btn-glossy bg-primary text-white py-3.5 rounded-xl font-bold text-sm shadow-glossy-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2 active:scale-[0.98] transition-transform"
              >
                {status === "loading" ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                {status === "loading" ? "Mencari..." : "Lacak Kendaraan"}
              </button>
            </form>

            {/* Bottom Links */}
            <div className="flex items-center justify-center gap-6">
              <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft size={14} /> Beranda
              </Link>
              <span className="text-surface-border">|</span>
              <Link href="/portal/login" className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors">
                Login Portal
              </Link>
            </div>
          </div>
        ) : (
          <SpkDetailView spk={spk} onBack={() => { setSpk(null); setStatus("idle"); }} />
        )}
      </main>
    </div>
  );
}
