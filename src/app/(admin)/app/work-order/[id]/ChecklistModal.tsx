"use client";

import { CheckCircle2, Clock, Loader2, Package, X } from "lucide-react";
import type { WorkOrder } from "@/lib/types";

const fmt = (n: number) => `Rp ${Number(n).toLocaleString("id-ID")}`;

interface ChecklistModalProps {
 spk: WorkOrder;
 togglingId: string;
 onClose: () => void;
 onOpenStatusModal: (status: string) => void;
 onToggleItem: (itemId: number, current: string) => void;
 onToggleStage: (stageId: number, current: string) => void;
}

export function ChecklistModal({
 spk, togglingId, onClose, onOpenStatusModal, onToggleItem, onToggleStage,
}: ChecklistModalProps) {
 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
 <div className="bg-surface border border-surface-border shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
 <div className="p-4 border-b border-surface-border flex justify-between items-center">
 <div>
 <h3 className="font-bold flex items-center gap-2"><CheckCircle2 size={16} /> Checklist Pekerjaan</h3>
 <p className="text-[11px] text-muted-foreground">Centang pekerjaan yang sudah selesai. Progres Work Order terhitung otomatis.</p>
 </div>
 <button onClick={onClose} aria-label="Tutup" className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
 </div>

 <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
 {/* Progress bar */}
 <div className="space-y-1.5">
 <div className="flex justify-between text-xs">
 <span className="text-muted-foreground">Progres</span>
 <span className="font-bold">{spk.progress}%</span>
 </div>
 <div className="h-2 bg-surface-border rounded-full overflow-hidden">
 <div className="h-full bg-primary transition-all" style={{ width: `${spk.progress}%` }} />
 </div>
 </div>

 {/* Items */}
 {spk.items && spk.items.length > 0 && (
 <div className="space-y-2">
 <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
 <Package size={11} /> Item ({spk.items.filter(i => i.status === "done").length}/{spk.items.length})
 </p>
 {spk.items.map(item => (
 <label key={item.id} className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${item.status === "done" ? "bg-emerald-500/5 border-emerald-500/20" : "bg-surface-hover/40 border-surface-border hover:bg-surface-hover"}`}>
 <button
 type="button"
 onClick={() => onToggleItem(item.id, item.status ?? "pending")}
 disabled={togglingId === `item-${item.id}` || spk.status === "selesai" || spk.status === "dibatalkan"}
 className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all ${item.status === "done" ? "bg-emerald-500 text-white" : "bg-surface border-2 border-surface-border hover:border-emerald-500"} disabled:opacity-50`}
 aria-label={item.status === "done" ? "Batal centang" : "Centang selesai"}
 >
 {togglingId === `item-${item.id}` ? <Loader2 size={11} className="animate-spin" /> : item.status === "done" && <CheckCircle2 size={13} />}
 </button>
 <div className="flex-1 min-w-0">
 <p className={`text-sm font-medium ${item.status === "done" ? "line-through text-muted-foreground" : ""}`}>{item.nama}</p>
 <p className="text-[10px] text-muted-foreground">
 {item.type} • {fmt(item.hargaSatuan)} × {item.qty} = <span className="font-bold">{fmt(item.subtotal)}</span>
 </p>
 </div>
 </label>
 ))}
 </div>
 )}

 {/* Stages */}
 {spk.stages && spk.stages.length > 0 && (
 <div className="space-y-2">
 <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
 Tahapan ({spk.stages.filter(s => s.status === "done").length}/{spk.stages.length})
 </p>
 {spk.stages.map(stage => (
 <div key={stage.id} className={`flex items-start gap-3 p-2.5 rounded-xl border transition-colors ${stage.status === "done" ? "bg-emerald-500/5 border-emerald-500/20" : stage.status === "in_progress" ? "bg-blue-500/5 border-blue-500/20" : "bg-surface-hover/40 border-surface-border"}`}>
 <button
 type="button"
 onClick={() => onToggleStage(stage.id, stage.status)}
 disabled={togglingId === `stage-${stage.id}` || spk.status === "selesai" || spk.status === "dibatalkan"}
 className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all ${stage.status === "done" ? "bg-emerald-500 text-white" : stage.status === "in_progress" ? "bg-blue-500 text-white" : "bg-surface border-2 border-surface-border hover:border-emerald-500"} disabled:opacity-50`}
 aria-label="Ubah status tahap"
 title="pending → in_progress → done"
 >
 {togglingId === `stage-${stage.id}` ? <Loader2 size={11} className="animate-spin" />
 : stage.status === "done" ? <CheckCircle2 size={13} />
 : stage.status === "in_progress" ? <Clock size={11} />
 : null}
 </button>
 <div className="flex-1 min-w-0">
 <p className={`text-sm font-medium ${stage.status === "done" ? "line-through text-muted-foreground" : ""}`}>{stage.nama}</p>
 <p className="text-[10px] text-muted-foreground">
 <span className="capitalize">{stage.status === "in_progress" ? "Berjalan" : stage.status === "done" ? "Selesai" : "Menunggu"}</span>
 {" • "}{stage.durasiHari} hari • {fmt(stage.estimasiBiaya)}
 </p>
 </div>
 </div>
 ))}
 </div>
 )}

 {(!spk.items || spk.items.length === 0) && (!spk.stages || spk.stages.length === 0) && (
 <p className="text-sm text-center text-muted-foreground py-6">Tidak ada item / tahapan yang dapat dichecklist.</p>
 )}
 </div>

 <div className="p-4 border-t border-surface-border bg-surface-hover/30 flex justify-end gap-3">
 <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium border border-surface-border rounded-xl hover:bg-surface-hover">Tutup</button>
 {spk.status === "dikerjakan" && (() => {
 const totalUnits = (spk.items?.length ?? 0) + (spk.stages?.length ?? 0);
 const doneUnits = (spk.items?.filter(i => i.status === "done").length ?? 0) + (spk.stages?.filter(s => s.status === "done").length ?? 0);
 const allDone = totalUnits > 0 && doneUnits === totalUnits;
 return (
 <button
 type="button"
 onClick={() => { onClose(); onOpenStatusModal("selesai"); }}
 className={`px-5 py-2 text-sm font-bold rounded-xl flex items-center gap-2 transition-all ${allDone ? "bg-emerald-500 hover:bg-emerald-600 text-white " : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/30"}`}
 >
 <CheckCircle2 size={14} /> {allDone ? "Selesaikan Work Order" : "Selesaikan (paksa)"}
 </button>
 );
 })()}
 </div>
 </div>
 </div>
 );
}
