"use client";

import { useState } from "react";
import { Plus, CheckCircle2, Clock, Loader2, X } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import type { Spk } from "@/lib/types";

const fmt = (n: number) => `Rp ${Number(n).toLocaleString("id-ID")}`;

const stageStatusStyle = (s: string) => {
 if (s === "done") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
 if (s === "in_progress") return "bg-blue-500/10 text-blue-600 border-blue-500/20";
 return "bg-surface-hover text-muted-foreground border-surface-border";
};

interface SpkStagesProps {
 spk: Spk;
 id: string;
 fetchSpk: () => Promise<void>;
 togglingId: string;
 handleToggleStage: (stageId: number, currentStatus: string) => Promise<void>;
}

export function SpkStages({ spk, id, fetchSpk, togglingId, handleToggleStage }: SpkStagesProps) {
 const [showAddStage, setShowAddStage] = useState(false);
 const [newStage, setNewStage] = useState({ nama: "", estimasiBiaya: 0, durasiHari: 1 });
 const [addStageSaving, setAddStageSaving] = useState(false);

 const totalBiayaStages = (spk.stages || []).reduce((s, s2) => s + Number(s2.estimasiBiaya), 0);

 const handleAddStage = async () => {
 if (!newStage.nama.trim()) return toast.error("Wajib Diisi", "Nama tahap wajib diisi.");
 setAddStageSaving(true);
 try {
 await api.post(`/spk/${id}/stages`, newStage);
 await fetchSpk();
 toast.success("Berhasil", "Tahap ditambahkan");
 setShowAddStage(false);
 setNewStage({ nama: "", estimasiBiaya: 0, durasiHari: 1 });
 } catch (err: unknown) {
 toast.error("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan");
 } finally {
 setAddStageSaving(false);
 }
 };

 if (!(spk.stages && spk.stages.length > 0) && !((spk.mode === "modifikasi" || spk.mode === "bubut") && spk.status !== "selesai" && spk.status !== "dibatalkan")) {
 return null;
 }

 return (
 <>
 <div className="glass-panel overflow-hidden">
 <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
 <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tahapan Pekerjaan</h3>
 <div className="flex items-center gap-2">
 <span className="text-xs font-bold text-primary">{fmt(totalBiayaStages)}</span>
 {spk.status !== "selesai" && spk.status !== "dibatalkan" && (
 <button
 onClick={() => setShowAddStage(true)}
 className="text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded-lg flex items-center gap-1"
 aria-label="Tambah tahap"
 >
 <Plus size={11} /> Tambah
 </button>
 )}
 </div>
 </div>
 {(spk.stages || []).length === 0 ? (
 <div className="py-6 text-center text-xs text-muted-foreground">Belum ada tahapan.</div>
 ) : (
 <div className="divide-y divide-surface-border">
 {(spk.stages || []).map((stage, i) => (
 <div key={stage.id} className="flex items-center gap-3 px-4 py-3">
 <button
 type="button"
 onClick={() => spk.status !== "selesai" && spk.status !== "dibatalkan" && handleToggleStage(stage.id, stage.status)}
 disabled={spk.status === "selesai" || spk.status === "dibatalkan" || togglingId === `stage-${stage.id}`}
 className={`w-7 h-7 rounded-full border flex items-center justify-center text-[11px] font-bold shrink-0 transition-all ${stageStatusStyle(stage.status)} disabled:cursor-not-allowed`}
 aria-label={`Ubah status tahap ${stage.nama}`}
 title="Klik untuk siklus status: pending → in_progress → done"
 >
 {togglingId === `stage-${stage.id}` ? <Loader2 size={12} className="animate-spin" /> : stage.status === "done" ? <CheckCircle2 size={14} /> : i + 1}
 </button>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium">{stage.nama}</p>
 <p className="text-[10px] text-muted-foreground">{stage.durasiHari} hari estimasi</p>
 </div>
 <div className="text-right shrink-0">
 <p className="text-sm font-bold">{fmt(stage.estimasiBiaya)}</p>
 <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${stageStatusStyle(stage.status)}`}>
 {stage.status === "done" ? "Selesai" : stage.status === "in_progress" ? "Berjalan" : "Menunggu"}
 </span>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 {showAddStage && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
 <div className="bg-surface border border-surface-border shadow-2xl rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
 <div className="p-4 border-b border-surface-border flex justify-between items-center">
 <h3 className="font-bold flex items-center gap-2"><Plus size={16} /> Tambah Tahap</h3>
 <button onClick={() => setShowAddStage(false)} aria-label="Tutup" className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
 </div>
 <form onSubmit={(e) => { e.preventDefault(); handleAddStage(); }} className="p-5 space-y-4">
 <div className="space-y-1.5">
 <label className="text-xs font-medium text-muted-foreground">Nama Tahap <span className="text-red-500">*</span></label>
 <input type="text" value={newStage.nama} onChange={e => setNewStage({ ...newStage, nama: e.target.value })} required placeholder="mis. Pengecatan, Bubut Crankshaft"
 className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <label className="text-xs font-medium text-muted-foreground">Estimasi Biaya</label>
 <input type="number" min="0" value={newStage.estimasiBiaya} onChange={e => setNewStage({ ...newStage, estimasiBiaya: Math.max(0, Number(e.target.value)) })}
 className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
 </div>
 <div className="space-y-1.5">
 <label className="text-xs font-medium text-muted-foreground">Durasi (hari)</label>
 <input type="number" min="1" value={newStage.durasiHari} onChange={e => setNewStage({ ...newStage, durasiHari: Math.max(1, Number(e.target.value)) })}
 className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
 </div>
 </div>
 <div className="flex justify-end gap-3 pt-2 border-t border-surface-border">
 <button type="button" onClick={() => setShowAddStage(false)} className="px-4 py-2 text-sm font-medium border border-surface-border rounded-xl hover:bg-surface-hover">Batal</button>
 <button type="submit" disabled={addStageSaving} className="px-5 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 flex items-center gap-2 disabled:opacity-60">
 {addStageSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
 Tambah
 </button>
 </div>
 </form>
 </div>
 </div>
 )}
 </>
 );
}
