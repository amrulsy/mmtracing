"use client";

import { Loader2, X, Save, UserCheck } from "lucide-react";
import type { Mekanik } from "@/lib/types";

interface AssignMekanikModalProps {
 mekanikList: Mekanik[];
 assignMekanikId: string;
 setAssignMekanikId: (id: string) => void;
 assignSaving: boolean;
 onClose: () => void;
 onSave: () => void;
}

export function AssignMekanikModal({
 mekanikList, assignMekanikId, setAssignMekanikId,
 assignSaving, onClose, onSave,
}: AssignMekanikModalProps) {
 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
 <div className="bg-surface border border-surface-border shadow-2xl rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
 <div className="p-4 border-b border-surface-border flex justify-between items-center">
 <h3 className="font-bold flex items-center gap-2"><UserCheck size={16} /> Assign Mekanik</h3>
 <button onClick={onClose} aria-label="Tutup" className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
 </div>
 <div className="p-5 space-y-4">
 <p className="text-xs text-muted-foreground">Pilih mekanik yang akan bertanggung jawab atas Work Order ini.</p>
 <div className="space-y-1.5">
 <label className="text-xs font-medium text-muted-foreground">Mekanik</label>
 <select
 value={assignMekanikId}
 onChange={e => setAssignMekanikId(e.target.value)}
 className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
 >
 <option value="">— Unassign (tidak ada mekanik) —</option>
 {mekanikList.map(m => (
 <option key={m.id} value={m.id}>
 {m.name}{m.status === "busy" ? " (sedang sibuk)" : ""}{m.spesialisasi ? ` • ${m.spesialisasi}` : ""}
 </option>
 ))}
 </select>
 </div>
 <div className="flex justify-end gap-3 pt-2 border-t border-surface-border">
 <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium border border-surface-border rounded-xl hover:bg-surface-hover">Batal</button>
 <button type="button" onClick={onSave} disabled={assignSaving} className="px-5 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 flex items-center gap-2 disabled:opacity-60">
 {assignSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
 Simpan
 </button>
 </div>
 </div>
 </div>
 </div>
 );
}
