"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2, ArrowLeft, CheckCircle2, Circle, Clock, CarFront, FileText,
  ImageIcon, Wrench, Receipt, AlertTriangle, Activity, RefreshCw, Share2,
  Copy, Check, X, ChevronDown, ChevronUp, MessageCircle, Star
} from "lucide-react";
import Image from "next/image";
import { portalFetch, portalLogout } from "@/lib/portalFetch";
import type { SPKDetail, SPKReview, SPKStage, SPKItem, SPKPhoto } from "@/types/portal";

// ============ Photo Lightbox Component ============
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
      <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white p-2 z-10">
        <X size={28} />
      </button>
      <div className="relative w-full max-w-sm md:max-w-2xl max-h-[85vh] mx-4" onClick={e => e.stopPropagation()}>
        <Image
          src={photo.url}
          alt={photo.keterangan || "Foto SPK"}
          width={900}
          height={700}
          className="object-contain w-full max-h-[80vh] rounded-xl"
          unoptimized
        />
        {photo.keterangan && (
          <p className="text-center text-white/80 text-sm mt-3">{photo.keterangan}</p>
        )}
        <p className="text-center text-white/40 text-xs mt-1">{index + 1} / {photos.length}</p>
        {index > 0 && (
          <button onClick={() => setIndex(i => i - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-sm transition-colors">
            ‹
          </button>
        )}
        {index < photos.length - 1 && (
          <button onClick={() => setIndex(i => i + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-sm transition-colors">
            ›
          </button>
        )}
      </div>
    </div>
  );
}

// ============ Estimasi Waktu Selesai ============
function EstimatedCompletion({ stages }: { stages: any[] }) {
  if (!stages || stages.length === 0) return null;
  const done = stages.filter((s: any) => s.status === "selesai").length;
  const total = stages.length;
  const remaining = total - done;

  if (remaining === 0) {
    return (
      <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold">
        <CheckCircle2 size={14} /> Semua tahap selesai!
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-muted-foreground text-xs">
      <Clock size={14} /> Sisa {remaining} dari {total} tahap
    </div>
  );
}

// ============ Review Prompt Component ============
function ReviewPrompt({ spkId, onSubmitted }: { spkId: number, onSubmitted: () => void }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  const TAG_OPTIONS = ["Cepat", "Rapih", "Ramah", "Harga Wajar", "Profesional"];

  const toggleTag = (t: string) => setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return setMsg("Mohon berikan rating bintang.");
    setSubmitting(true);
    setMsg("");
    try {
      const res = await portalFetch("/api/v1/customer-auth/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spkId, rating, comment, tags })
      });
      if (res.ok) {
        onSubmitted();
      } else {
        const json = await res.json();
        setMsg(json.message || "Gagal mengirim review");
      }
    } catch {
      setMsg("Koneksi bermasalah");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-panel p-5 mt-6 border-amber-500/30">
      <h3 className="text-sm font-black flex items-center gap-2 mb-1 text-amber-500">
        <Star size={16} className="fill-amber-500" /> Nilai Pelayanan Kami
      </h3>
      <p className="text-xs text-muted-foreground mb-4">Ulasan Anda membantu kami untuk terus berkembang.</p>
      
      {msg && <p className="text-xs font-bold text-red-500 mb-3">{msg}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              type="button"
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(rating)}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star size={32} className={(hover || rating) >= star ? "fill-amber-500 text-amber-500" : "text-surface-border"} />
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {TAG_OPTIONS.map(t => (
            <button
              type="button"
              key={t}
              onClick={() => toggleTag(t)}
              className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-colors ${tags.includes(t) ? "bg-amber-500 text-white border-amber-500" : "bg-surface-hover text-muted-foreground border-surface-border hover:bg-background"}`}
            >
              {t}
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Tulis ulasan Anda... (opsional)"
          className="w-full bg-surface-hover/50 border border-surface-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none h-24"
        />

        <button type="submit" disabled={submitting || rating === 0} className="w-full py-3 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 transition-all disabled:opacity-50 flex justify-center">
          {submitting ? <Loader2 size={16} className="animate-spin" /> : "Kirim Ulasan"}
        </button>
      </form>
    </div>
  );
}

export default function PortalSpkDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [spk, setSpk] = useState<SPKDetail | null>(null);
  const [error, setError] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllItems, setShowAllItems] = useState(false);
  const [review, setReview] = useState<SPKReview | null>(null);

  const fetchDetail = useCallback(async (showLoader = true) => {
    if (showLoader) setRefreshing(true);

    try {
      const res = await portalFetch(`/api/v1/customer-auth/spk/${id}`);
      const data = await res.json();

      if (data.success) {
        setSpk(data.data);
        if (data.data.status === "selesai") {
          const revRes = await portalFetch(`/api/v1/customer-auth/review/${data.data.id}`);
          const revJson = await revRes.json();
          if (revJson.success && revJson.data) setReview(revJson.data);
        }
      } else if (res.status === 401) {
        portalLogout();
      } else {
        setError(data.message || "Gagal memuat detail SPK");
      }
    } catch (err) {
      setError("Koneksi bermasalah. Silakan coba lagi.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchDetail(false);
  }, [fetchDetail]);

  // Auto-refresh setiap 60 detik jika SPK masih aktif
  useEffect(() => {
    if (!spk || spk.status === "selesai" || spk.status === "batal") return;
    const interval = setInterval(() => fetchDetail(false), 60000);
    return () => clearInterval(interval);
  }, [spk, fetchDetail]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Detail SPK ${spk?.noSpk}`, url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-primary" size={32} />
        <p className="text-xs text-muted-foreground animate-pulse">Memuat detail SPK...</p>
      </div>
    );
  }

  if (error || !spk) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-4">
        <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mb-4">
          <AlertTriangle size={32} className="text-red-500" />
        </div>
        <h2 className="text-lg font-black mb-1">Oops!</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">{error || "SPK tidak ditemukan"}</p>
        <Link href="/portal/dashboard" className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all flex items-center gap-2">
          <ArrowLeft size={16} /> Kembali ke Dasbor
        </Link>
      </div>
    );
  }

  const statusConfig: Record<string, { color: string; label: string }> = {
    selesai: { color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", label: "✅ Selesai" },
    batal: { color: "bg-red-500/10 text-red-500 border-red-500/20", label: "❌ Dibatalkan" },
    dikerjakan: { color: "bg-blue-500/10 text-blue-500 border-blue-500/20", label: "🔧 Dikerjakan" },
    kendala: { color: "bg-amber-500/10 text-amber-500 border-amber-500/20", label: "⚠️ Kendala" },
    antri: { color: "bg-surface-hover text-muted-foreground border-surface-border", label: "⏳ Antri" },
  };

  const currentStatus = statusConfig[spk.status] || statusConfig.antri;
  const totalTagihan = Number(spk.totalHarga || 0) - Number(spk.diskon || 0);
  const itemsToShow = showAllItems ? spk.items : (spk.items || []).slice(0, 5);
  const hasMoreItems = (spk.items || []).length > 5;

  return (
    <div className="max-w-sm md:max-w-2xl mx-auto space-y-6 p-4 pb-20 animate-in fade-in duration-500">
      {/* Lightbox */}
      {lightboxIndex !== null && spk.photos && (
        <PhotoLightbox photos={spk.photos} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/portal/dashboard" className="p-2.5 bg-surface-hover/50 border border-surface-border hover:bg-surface-hover rounded-xl transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-lg font-black flex items-center gap-2">
              Detail SPK
            </h1>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{spk.noSpk}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchDetail(true)}
            disabled={refreshing}
            className="p-2.5 bg-surface-hover/50 border border-surface-border hover:bg-surface-hover rounded-xl transition-colors text-muted-foreground"
            title="Refresh data"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          </button>
          <button onClick={handleShare} className="p-2.5 bg-surface-hover/50 border border-surface-border hover:bg-surface-hover rounded-xl transition-colors text-muted-foreground" title="Bagikan link">
            {copied ? <Check size={16} className="text-emerald-500" /> : <Share2 size={16} />}
          </button>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`rounded-2xl p-4 border flex items-center justify-between ${currentStatus.color}`}>
        <div>
          <p className="text-sm font-black">{currentStatus.label}</p>
          <p className="text-[10px] opacity-70 mt-0.5">Update: {new Date(spk.updatedAt || spk.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <span className="text-2xl font-black font-mono">{spk.progress}%</span>
      </div>

      {/* Info Kendaraan & Mekanik */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="glass-panel p-4 border-l-4 border-l-primary flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <CarFront size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Kendaraan</p>
            <p className="text-sm font-bold leading-tight truncate">{spk.kendaraan ? spk.kendaraan.name : "Tanpa Kendaraan"}</p>
            <p className="text-xs font-mono text-muted-foreground mt-0.5">{spk.kendaraan ? spk.kendaraan.plat : "-"}</p>
          </div>
        </div>

        <div className="glass-panel p-4 border-l-4 border-l-blue-500 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <Wrench size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Mekanik</p>
            <p className="text-sm font-bold leading-tight truncate">{spk.mekanik ? spk.mekanik.name : "Belum Ditugaskan"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{new Date(spk.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      </div>

      {/* Keluhan */}
      {spk.keluhan && (
        <div className="glass-panel p-4">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <FileText size={14} /> Keluhan / Catatan
          </h2>
          <p className="text-sm italic border-l-2 border-primary/30 pl-3 text-muted-foreground">{spk.keluhan}</p>
        </div>
      )}

      {/* Live Progress Timeline */}
      <div className="glass-panel p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold flex items-center gap-1.5">
            <Activity size={16} className="text-primary" /> Progress Pengerjaan
          </h2>
          <EstimatedCompletion stages={spk.stages} />
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-background rounded-full h-2.5 mb-6 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out ${spk.progress === 100 ? "bg-emerald-500" : "bg-primary"}`}
            style={{ width: `${spk.progress}%` }}
          />
        </div>

        {spk.stages && spk.stages.length > 0 ? (
          <div className="space-y-0 relative ml-2">
            {/* Vertical line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-surface-border" />
            {spk.stages.map((stage: any, index: number) => {
              const isDone = stage.status === "selesai";
              const isWip = stage.status === "dikerjakan";
              const isLast = index === spk.stages.length - 1;

              return (
                <div key={stage.id} className={`relative pl-8 py-3 ${!isLast ? "" : ""} ${isDone ? "opacity-100" : isWip ? "opacity-100" : "opacity-40"}`}>
                  {/* Dot */}
                  {isDone ? (
                    <CheckCircle2 size={16} className="absolute left-0 top-3.5 bg-background text-emerald-500 rounded-full z-10" />
                  ) : isWip ? (
                    <div className="absolute left-[1px] top-4 w-3.5 h-3.5 bg-primary rounded-full ring-4 ring-primary/20 animate-pulse z-10" />
                  ) : (
                    <Circle size={14} className="absolute left-[1px] top-4 bg-background text-surface-border fill-background z-10" />
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm font-bold ${isDone ? "text-emerald-500" : isWip ? "text-primary" : "text-foreground"}`}>
                        {stage.nama}
                      </h4>
                      {isWip && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase animate-pulse">Aktif</span>}
                    </div>
                    {stage.catatanMekanik && (
                      <p className="text-xs text-muted-foreground mt-1.5 bg-surface-hover/50 p-2.5 rounded-lg border border-surface-border/50 leading-relaxed">
                        📝 {stage.catatanMekanik}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Clock size={28} className="mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Tahapan pengerjaan belum ditetapkan</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Mekanik akan mengatur tahapan saat mulai mengerjakan</p>
          </div>
        )}
      </div>

      {/* Rincian Jasa & Sparepart */}
      {spk.items && spk.items.length > 0 && (
        <div className="glass-panel p-0 overflow-hidden">
          <div className="p-4 bg-surface-hover/30 border-b border-surface-border flex items-center justify-between">
            <h2 className="text-sm font-bold flex items-center gap-1.5">
              <Receipt size={16} className="text-primary" /> Rincian Pekerjaan
            </h2>
            <span className="text-xs text-muted-foreground">{spk.items.length} item</span>
          </div>
          <div>
            {itemsToShow.map((item: any, i: number) => (
              <div key={item.id} className={`p-4 flex justify-between items-center ${i !== itemsToShow.length - 1 ? "border-b border-surface-border/50" : ""}`}>
                <div className="min-w-0 flex-1 mr-3">
                  <p className="text-sm font-bold truncate">{item.nama}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">{item.type === "jasa" ? "🔧 Jasa" : "📦 Sparepart"}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold font-mono">Rp {Number(item.subtotal).toLocaleString("id-ID")}</p>
                  <p className="text-[10px] text-muted-foreground">{item.qty} × Rp {Number(item.hargaSatuan).toLocaleString("id-ID")}</p>
                </div>
              </div>
            ))}
          </div>
          {hasMoreItems && (
            <button onClick={() => setShowAllItems(!showAllItems)} className="w-full p-3 text-xs font-bold text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-1 border-t border-surface-border/50">
              {showAllItems ? <><ChevronUp size={14} /> Sembunyikan</> : <><ChevronDown size={14} /> Tampilkan Semua ({spk.items.length} item)</>}
            </button>
          )}
          {/* Total */}
          <div className="p-4 bg-surface-hover/30 border-t border-surface-border flex justify-between items-center">
            <p className="text-sm font-bold text-muted-foreground">Total Estimasi</p>
            <p className="text-lg font-black font-mono text-primary">Rp {totalTagihan.toLocaleString("id-ID")}</p>
          </div>
        </div>
      )}

      {/* Galeri Foto */}
      {spk.photos && spk.photos.length > 0 && (
        <div className="glass-panel p-5">
          <h2 className="text-sm font-bold flex items-center gap-1.5 mb-4">
            <ImageIcon size={16} className="text-primary" /> Foto Laporan Mekanik
            <span className="text-[10px] bg-surface-hover text-muted-foreground px-1.5 py-0.5 rounded-full font-normal ml-auto">{spk.photos.length} foto</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {spk.photos.map((photo: any, i: number) => (
              <button
                key={photo.id}
                onClick={() => setLightboxIndex(i)}
                className="relative aspect-square rounded-xl overflow-hidden border border-surface-border group cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all active:scale-95"
              >
                <Image
                  src={photo.url}
                  alt={photo.keterangan || "Foto SPK"}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  unoptimized
                />
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

      {/* Pembayaran CTA */}
      {spk.pembayaran && (
        <div className="bg-background border border-primary/20 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Total Tagihan</p>
            <p className="text-2xl font-black text-primary font-mono">Rp {totalTagihan.toLocaleString("id-ID")}</p>
          </div>
          <Link
            href={`/portal/pembayaran/${spk.pembayaran.publicId}`}
            className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white font-bold text-sm rounded-xl hover:bg-red-700 transition-all text-center flex items-center justify-center gap-2 active:scale-95"
          >
            <Receipt size={16} /> Lihat Tagihan
          </Link>
        </div>
      )}

      {/* Review Section */}
      {spk.status === "selesai" && !review && (
        <ReviewPrompt spkId={spk.id} onSubmitted={() => fetchDetail(false)} />
      )}
      {review && (
        <div className="glass-panel p-5 mt-6 border-amber-500/20">
          <h3 className="text-sm font-black flex items-center gap-2 mb-2 text-foreground">
            Ulasan Anda <CheckCircle2 size={14} className="text-emerald-500" />
          </h3>
          <div className="flex items-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map(star => (
              <Star key={star} size={16} className={star <= review.rating ? "fill-amber-500 text-amber-500" : "text-surface-border"} />
            ))}
          </div>
          {review.tags && review.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {review.tags.map((t: string) => (
                <span key={t} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-surface-hover border border-surface-border text-muted-foreground">{t}</span>
              ))}
            </div>
          )}
          {review.comment && <p className="text-xs text-muted-foreground italic border-l-2 border-surface-border pl-2 mt-2">{review.comment}</p>}
        </div>
      )}

      {/* Footer Bantuan */}
      <div className="text-center pt-4 pb-8">
        <p className="text-xs text-muted-foreground mb-4">Ada pertanyaan tentang pengerjaan kendaraan Anda?</p>
        <div className="flex flex-col gap-3">
          <a
            href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "62274123456"}?text=${encodeURIComponent(`Halo MMT Racing, saya ingin bertanya tentang SPK ${spk.noSpk}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 text-sm font-bold text-[#25D366] hover:text-[#25D366]/80 transition-colors"
          >
            <MessageCircle size={16} /> Tanya via WhatsApp
          </a>
          <Link href="/portal/dashboard" className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
