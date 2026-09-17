"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
 CheckCircle2, AlertTriangle, Clock, Loader2,
 FileText, ChevronRight, Save,
 BadgeCheck, Ban, Receipt,
 MessageCircle, AlertCircle, Wrench
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useRole } from "@/hooks/useRole";
import type { WorkOrder } from "@/lib/types";
import { Skeleton } from "@/components/ui/loading-skeleton";
import { PaymentModal } from "@/components/ui/payment-modal";
import { WoItems } from "./WoItems";
import { WoStages } from "./WoStages";
import { StatusUpdateModal } from "./StatusUpdateModal";
import { EditWoModal } from "./EditWoModal";
import { AssignMekanikModal } from "./AssignMekanikModal";
import { ChecklistModal } from "./ChecklistModal";
import { WoSidebar } from "./components/WoSidebar";
import { WoHeader } from "./components/WoHeader";
import { WoKpiCards } from "./components/WoKpiCards";
import { WoPaymentCTA } from "./components/WoPaymentCTA";
import { WoIssueBanner } from "./components/WoIssueBanner";
import { WoDescription } from "./components/WoDescription";
import { WoProgressPanel } from "./components/WoProgressPanel";
import { WoPhotos } from "./components/WoPhotos";
import { useWoDetail } from "./hooks/useWoDetail";

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
const fmt = (n: number) => `Rp ${Number(n).toLocaleString("id-ID")}`;

const fmtDate = (d?: string | null) =>
 d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—";

const fmtDateTime = (d?: string | null) =>
 d ? new Date(d).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const statusStyle = (s: string) => {
 switch (s) {
 case "selesai": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
 case "dikerjakan": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
 case "antri": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
 case "kendala": return "bg-red-500/10 text-red-500 border-red-500/20";
 case "dibatalkan": return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
 default: return "bg-surface-hover text-muted-foreground";
 }
};

const prioritasStyle = (p: string) => {
 switch (p) {
 case "urgent": return "bg-red-500/15 text-red-600 border-red-500/30";
 case "tinggi": return "bg-amber-500/15 text-amber-600 border-amber-500/30";
 case "normal": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
 default: return "bg-surface-hover text-muted-foreground border-surface-border";
 }
};

// Status transitions yang diperbolehkan
const nextStatus: Record<string, { label: string; value: string; color: string }[]> = {
 antri: [
 { label: "Mulai Kerjakan", value: "dikerjakan", color: "bg-blue-500 hover:bg-blue-600 text-white" },
 { label: "Batalkan", value: "dibatalkan", color: "bg-zinc-500 hover:bg-zinc-600 text-white" },
 ],
 dikerjakan: [
 { label: "Tandai Selesai", value: "selesai", color: "bg-emerald-500 hover:bg-emerald-600 text-white" },
 { label: "Laporkan Kendala", value: "kendala", color: "bg-amber-500 hover:bg-amber-600 text-white" },
 { label: "Batalkan", value: "dibatalkan", color: "bg-zinc-500 hover:bg-zinc-600 text-white" },
 ],
 kendala: [
 { label: "Lanjutkan", value: "dikerjakan", color: "bg-blue-500 hover:bg-blue-600 text-white" },
 { label: "Batalkan", value: "dibatalkan", color: "bg-zinc-500 hover:bg-zinc-600 text-white" },
 ],
 selesai: [
 { label: "Kembalikan ke Dikerjakan", value: "dikerjakan", color: "bg-surface border border-surface-border hover:bg-surface-hover text-foreground" },
 ],
 dibatalkan: [],
};

// ──────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────
export default function SpkDetailPage({ params }: { params: Promise<{ id: string }> }) {
 const { id } = use(params);
 const { user } = useAuth();
 const { hasAccess } = useRole();
 const isAdmin = hasAccess("wo", "full");
 const [showDpPayModal, setShowDpPayModal] = useState(false);

 const {
 spk, loading, error, fetchSpk,
 progress, setProgress, updatingProgress, handleUpdateProgress,
 showStatusModal, setShowStatusModal,
 pendingStatus, catatan, setCatatan, updatingStatus,
 openStatusModal, handleUpdateStatus,
 showEdit, setShowEdit, editForm, setEditForm, editSaving,
 openEdit, handleEdit,
 showAssign, setShowAssign, mekanikList, assignMekanikId, setAssignMekanikId,
 assignSaving, openAssign, handleAssign,
 sendingWA, handleSendWA,
 showChecklist, setShowChecklist, togglingId,
 handleToggleItem, handleToggleStage,
 uploadingPhoto, handleUploadPhoto,
 handleClone, handleDelete,
 } = useWoDetail(id);

 // ── Loading ──────────────────────────────────────────────────
 if (loading) {
 return (
 <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
 <div className="flex items-center gap-4">
 <Skeleton className="w-10 h-10 rounded-xl" />
 <div className="space-y-2 flex-1"><Skeleton className="h-7 w-48" /><Skeleton className="h-4 w-32" /></div>
 </div>
 <div className="grid md:grid-cols-3 gap-4">
 {[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
 </div>
 <Skeleton className="h-64 rounded-2xl" />
 </div>
 );
 }

 // ── Error ─────────────────────────────────────────────────────
 if (error || !spk) {
 return (
 <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 animate-in fade-in duration-500">
 <AlertTriangle size={32} className="text-red-500" />
 <p className="text-muted-foreground text-sm">{error || "Work Order tidak ditemukan"}</p>
 <div className="flex gap-3">
 <button onClick={fetchSpk} className="text-primary text-sm font-medium hover:underline">Coba lagi</button>
 <Link href="/app/work-order" className="text-muted-foreground text-sm hover:underline">Kembali ke daftar</Link>
 </div>
 </div>
 );
 }

  const transitions = spk ? (nextStatus[spk.status] ?? []) : [];
  const totalBiayaItems = (spk?.items || []).reduce((s: number, i: any) => s + i.subtotal, 0);
  const totalBiayaStages = (spk?.stages || []).reduce((s: number, s2: any) => s + Number(s2.estimasiBiaya), 0);
  // Fallback harus memperhitungkan diskon
  const sisaBayar = spk?.pembayaran?.[0]?.sisaBayar ?? Math.max(0, Number(spk?.totalHarga ?? 0) - Number(spk?.diskon ?? 0) - Number(spk?.totalBayar ?? 0));
  const displayProgress = spk?.status === "selesai" ? 100 : (spk?.progress ?? 0);

 return (
 <div className="space-y-4 lg:space-y-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
 
 {/* ── Header ── */}
 <WoHeader
 spk={spk}
 id={id}
 isAdmin={isAdmin}
 openEdit={openEdit}
 handleClone={handleClone}
 handleSendWA={handleSendWA}
 sendingWA={sendingWA}
 handleDelete={handleDelete}
 />

 {/* ── Bayar CTA prominent (B8) ── */}
 <WoPaymentCTA sisaBayar={Number(sisaBayar)} pembayaran={spk.pembayaran?.[0] ?? null} status={spk.status} onPaymentSuccess={fetchSpk} />

 {/* ── Kendala Banner ── */}
 <WoIssueBanner status={spk.status} catatan={spk.catatan} />

 {/* ── KPI Row ── */}
 <WoKpiCards spk={spk} sisaBayar={Number(sisaBayar)} displayProgress={displayProgress} />

 {/* ── Main Grid ── */}
 <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">

 {/* Left: Pelanggan, Kendaraan, Mekanik, Dates */}
 <WoSidebar spk={spk} openAssign={openAssign} />

 {/* Right: Detail Pekerjaan + Actions */}
 <div className="lg:col-span-2 space-y-4">

 <WoDescription spk={spk} />

 {/* Items */}
 <WoItems spk={spk} id={id} fetchSpk={fetchSpk} togglingId={togglingId} handleToggleItem={handleToggleItem} />

 {/* Stages */}
 <WoStages spk={spk} id={id} fetchSpk={fetchSpk} togglingId={togglingId} handleToggleStage={handleToggleStage} />

 {/* Photos */}
 <WoPhotos photos={spk.photos || []} onUpload={handleUploadPhoto} uploading={uploadingPhoto} />

 <WoProgressPanel
 status={spk.status}
 progress={progress}
 originalProgress={spk.progress}
 hasChecklist={(spk.items?.length ?? 0) > 0 || (spk.stages?.length ?? 0) > 0}
 onChangeProgress={v => setProgress(v)}
 onOpenChecklist={() => setShowChecklist(true)}
 onSave={handleUpdateProgress}
 saving={updatingProgress}
 />

 {/* Garansi */}
 {spk?.garansi && spk.garansi.length > 0 && (
 <div className="glass-panel p-4 space-y-3">
 <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><BadgeCheck size={12} />Garansi</h3>
 <div className="space-y-2">
 {spk.garansi.map((g: any) => (
 <div key={g.id} className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${g.status === "aktif" ? "bg-emerald-500/5 border-emerald-500/20" : g.status === "hampir" ? "bg-amber-500/5 border-amber-500/20" : "bg-surface-hover border-surface-border"}`}>
 <div>
 <p className="font-medium">{g.itemName}</p>
 <p className="text-muted-foreground">{fmtDate(g.startDate)} — {fmtDate(g.endDate)}</p>
 </div>
 <span className={`font-bold uppercase px-2 py-0.5 rounded-full border ${g.status === "aktif" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : g.status === "hampir" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-surface-hover text-muted-foreground border-surface-border"}`}>
 {g.status}
 </span>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Action Buttons */}
 {spk && transitions.length > 0 && (() => {
 const needsDp = ["modifikasi", "bubut"].includes(spk.mode) && Number(spk.minimumDp) > 0;
 const dpKurang = needsDp ? Math.max(0, Number(spk.minimumDp) - Number(spk.totalBayar)) : 0;
 const dpLocked = needsDp && dpKurang > 0;
 const payId = spk.pembayaran?.[0]?.id;
 return (
 <div className="glass-panel p-4 space-y-3">
 <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ubah status Work Order</h3>
 {/* C1: warning kalau antri + belum ada mekanik */}
 {spk.status === "antri" && !spk.mekanikId && (
 <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs">
 <AlertCircle size={13} className="shrink-0 mt-0.5" />
 <span>Tombol <strong>Mulai Kerjakan</strong> tidak tersedia. Assign mekanik terlebih dahulu.</span>
 </div>
 )}
 {/* DP guard untuk modifikasi & bubut */}
 {spk.status === "antri" && dpLocked && (
 <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/40 text-xs">
 <AlertCircle size={14} className="shrink-0 mt-0.5 text-orange-600" />
 <div className="flex-1">
 <p className="font-bold text-orange-700 dark:text-orange-400">DP Belum Terpenuhi</p>
 <p className="text-muted-foreground mt-0.5">
 WorkOrder <span className="capitalize font-semibold">{spk.mode}</span> wajib bayar DP min. <span className="font-bold">{fmt(Number(spk.minimumDp))}</span> sebelum mulai dikerjakan.
 </p>
 <p className="text-muted-foreground mt-0.5">
 Sudah dibayar: <span className="font-mono font-bold text-emerald-600">{fmt(Number(spk.totalBayar))}</span> • Kurang: <span className="font-mono font-bold text-red-500">{fmt(dpKurang)}</span>
 </p>
 </div>
 {payId && spk.pembayaran?.[0] && (
 <button
 onClick={() => setShowDpPayModal(true)}
 className="shrink-0 px-3 py-2 text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-lg flex items-center gap-1.5 self-start"
 >
 <Receipt size={12} /> Bayar DP
 </button>
 )}
 </div>
 )}
 <div className="flex flex-wrap gap-2">
 {transitions.map(t => {
 const blockedStart = t.value === "dikerjakan" && spk.status === "antri" && (!spk.mekanikId || dpLocked);
 return (
 <button
 key={t.value}
 onClick={() => openStatusModal(t.value)}
 disabled={blockedStart}
 title={blockedStart ? (!spk.mekanikId ? "Assign mekanik dulu" : `DP kurang ${fmt(dpKurang)}`) : undefined}
 className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none ${t.color}`}
 >
 {t.value === "selesai" && <CheckCircle2 size={15} />}
 {t.value === "kendala" && <AlertTriangle size={15} />}
 {t.value === "dikerjakan" && <Wrench size={15} />}
 {t.value === "dibatalkan" && <Ban size={15} />}
 {t.label}
 </button>
 );
 })}
 </div>
 </div>
 );
 })()}
 </div>
 </div>

 {/* ── Status Update Modal ── */}
 {showStatusModal && spk && (
 <StatusUpdateModal
 spk={spk}
 pendingStatus={pendingStatus}
 catatan={catatan}
 setCatatan={setCatatan}
 updatingStatus={updatingStatus}
 sisaBayar={Number(sisaBayar)}
 onClose={() => setShowStatusModal(false)}
 onConfirm={handleUpdateStatus}
 onOpenChecklist={() => setShowChecklist(true)}
 />
 )}

 {/* ── Edit Work Order Modal (A3) ── */}
 {showEdit && spk && (
 <EditWoModal
 spk={spk}
 editForm={editForm}
 setEditForm={setEditForm}
 editSaving={editSaving}
 onClose={() => setShowEdit(false)}
 onSave={handleEdit}
 />
 )}

 {/* ── Assign Mekanik Modal (A2) ── */}
 {showAssign && (
 <AssignMekanikModal
 mekanikList={mekanikList}
 assignMekanikId={assignMekanikId}
 setAssignMekanikId={setAssignMekanikId}
 assignSaving={assignSaving}
 onClose={() => setShowAssign(false)}
 onSave={handleAssign}
 />
 )}

 {/* ── Checklist Pekerjaan Modal ── */}
 {showChecklist && spk && (
 <ChecklistModal
 spk={spk}
 togglingId={togglingId}
 onClose={() => setShowChecklist(false)}
 onOpenStatusModal={openStatusModal}
 onToggleItem={handleToggleItem}
 onToggleStage={handleToggleStage}
 />
 )}

  {/* ── DP Payment Modal ── */}
  {showDpPayModal && spk?.pembayaran?.[0] && (
  <PaymentModal
  pembayaran={spk.pembayaran[0]}
  open={showDpPayModal}
  onClose={() => setShowDpPayModal(false)}
  onSuccess={() => {
   setShowDpPayModal(false);
   fetchSpk();
  }}
  />
  )}

 </div>
 );
}
