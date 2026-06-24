"use client";

import { Loader2, X, Save, Edit } from "lucide-react";
import type { Spk } from "@/lib/types";

interface EditSpkModalProps {
 spk: Spk;
 editForm: {
 keluhan: string; judulProyek: string; spesifikasi: string;
 prioritas: string; catatan: string; estimasiSelesai: string;
 };
 setEditForm: (f: EditSpkModalProps["editForm"]) => void;
 editSaving: boolean;
 onClose: () => void;
 onSave: () => void;
}

export function EditSpkModal({ spk, editForm, setEditForm, editSaving, onClose, onSave }: EditSpkModalProps) {
 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
 <div className="bg-surface border border-surface-border shadow-2xl rounded-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
 <div className="p-4 border-b border-surface-border flex justify-between items-center">
 <h3 className="font-bold flex items-center gap-2"><Edit size={16} /> Edit SPK</h3>
 <button onClick={onClose} aria-label="Tutup" className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
 </div>
 <form onSubmit={e => { e.preventDefault(); onSave(); }} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
 <div className="grid md:grid-cols-2 gap-3">
 {spk.mode !== "rutin" && (
 <div className="space-y-1.5 md:col-span-2">
 <label className="text-xs font-medium text-muted-foreground">Judul Proyek</label>
 <input type="text" value={editForm.judulProyek}
 onChange={e => setEditForm({ ...editForm, judulProyek: e.target.value })}
 className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
 </div>
 )}
 <div className="space-y-1.5 md:col-span-2">
 <label className="text-xs font-medium text-muted-foreground">Keluhan / Deskripsi</label>
 <textarea value={editForm.keluhan}
 onChange={e => setEditForm({ ...editForm, keluhan: e.target.value })}
 rows={3} className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
 </div>
 {spk.mode === "modifikasi" && (
 <div className="space-y-1.5 md:col-span-2">
 <label className="text-xs font-medium text-muted-foreground">Spesifikasi</label>
 <textarea value={editForm.spesifikasi}
 onChange={e => setEditForm({ ...editForm, spesifikasi: e.target.value })}
 rows={2} className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
 </div>
 )}
 <div className="space-y-1.5">
 <label className="text-xs font-medium text-muted-foreground">Prioritas</label>
 <select value={editForm.prioritas}
 onChange={e => setEditForm({ ...editForm, prioritas: e.target.value })}
 className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
 <option value="rendah">Rendah</option>
 <option value="normal">Normal</option>
 <option value="tinggi">Tinggi</option>
 <option value="urgent">Urgent</option>
 </select>
 </div>
 <div className="space-y-1.5">
 <label className="text-xs font-medium text-muted-foreground">Estimasi Selesai</label>
 <input type="date" value={editForm.estimasiSelesai}
 onChange={e => setEditForm({ ...editForm, estimasiSelesai: e.target.value })}
 className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
 </div>
 <div className="space-y-1.5 md:col-span-2">
 <label className="text-xs font-medium text-muted-foreground">Catatan Internal</label>
 <textarea value={editForm.catatan}
 onChange={e => setEditForm({ ...editForm, catatan: e.target.value })}
 rows={2} className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
 </div>
 </div>
 <div className="flex justify-end gap-3 pt-2 border-t border-surface-border">
 <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium border border-surface-border rounded-xl hover:bg-surface-hover">Batal</button>
 <button type="submit" disabled={editSaving} className="px-5 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 flex items-center gap-2 disabled:opacity-60">
 {editSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
 Simpan
 </button>
 </div>
 </form>
 </div>
 </div>
 );
}
