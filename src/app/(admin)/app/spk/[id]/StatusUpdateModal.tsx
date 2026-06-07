"use client";

import { Loader2, X, CheckCircle2, AlertTriangle, Receipt } from "lucide-react";
import Link from "next/link";
import type { Spk } from "@/lib/types";

const fmt = (n: number) => `Rp ${Number(n).toLocaleString("id-ID")}`;

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

interface StatusUpdateModalProps {
  spk: Spk;
  pendingStatus: string;
  catatan: string;
  setCatatan: (v: string) => void;
  updatingStatus: boolean;
  sisaBayar: number;
  onClose: () => void;
  onConfirm: () => void;
  onOpenChecklist: () => void;
}

export function StatusUpdateModal({
  spk, pendingStatus, catatan, setCatatan, updatingStatus,
  sisaBayar, onClose, onConfirm, onOpenChecklist,
}: StatusUpdateModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-surface border border-surface-border shadow-2xl rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-surface-border flex justify-between items-center">
          <h3 className="font-bold">Konfirmasi Ubah Status</h3>
          <button onClick={onClose} aria-label="Tutup" className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Ubah status SPK{" "}
            <span className="font-semibold text-foreground">{spk.noSpk}</span> dari{" "}
            <span className={`font-bold px-2 py-0.5 rounded-full text-xs border ${statusStyle(spk.status)}`}>{spk.status}</span>{" "}
            ke{" "}
            <span className={`font-bold px-2 py-0.5 rounded-full text-xs border ${statusStyle(pendingStatus)}`}>{pendingStatus}</span>
          </p>

          {/* Completion confirmation summary */}
          {pendingStatus === "selesai" && (() => {
            const items = spk.items || [];
            const stages = spk.stages || [];
            const pendingItems = items.filter(i => i.status !== "done");
            const pendingStages = stages.filter(s => s.status !== "done");
            const totalUnits = items.length + stages.length;
            const doneUnits = items.filter(i => i.status === "done").length + stages.filter(s => s.status === "done").length;
            return (
              <div className="space-y-3 rounded-xl border border-surface-border bg-surface-hover/30 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ringkasan Pengerjaan</p>
                  <span className={`text-xs font-bold ${doneUnits === totalUnits ? "text-emerald-600" : "text-amber-600"}`}>
                    {doneUnits}/{totalUnits} selesai
                  </span>
                </div>
                {(pendingItems.length > 0 || pendingStages.length > 0) ? (
                  <div className="space-y-1.5">
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                      <AlertTriangle size={12} /> {pendingItems.length + pendingStages.length} pekerjaan belum dicentang selesai:
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-0.5 max-h-24 overflow-y-auto">
                      {pendingItems.map(i => <li key={`pi-${i.id}`}>• {i.nama} <span className="text-[10px] uppercase">({i.type})</span></li>)}
                      {pendingStages.map(s => <li key={`ps-${s.id}`}>• {s.nama} <span className="text-[10px] uppercase">({s.status})</span></li>)}
                    </ul>
                    <button type="button" onClick={() => { onClose(); onOpenChecklist(); }} className="text-xs text-primary font-bold hover:underline">
                      Buka Checklist →
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 size={12} /> Semua pekerjaan sudah dicentang selesai.
                  </p>
                )}
                <div className="border-t border-surface-border pt-2 space-y-0.5 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Tagihan</span><span className="font-mono">{fmt(Number(spk.totalHarga) - Number(spk.diskon ?? 0))}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Sudah Dibayar</span><span className="font-mono text-emerald-600">{fmt(Number(spk.totalBayar))}</span></div>
                  <div className="flex justify-between font-bold"><span>Sisa</span><span className={`font-mono ${sisaBayar > 0 ? "text-red-500" : "text-emerald-600"}`}>{fmt(sisaBayar)}</span></div>
                  {sisaBayar > 0 && (
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 italic">Setelah konfirmasi, Anda akan diarahkan ke kasir untuk pelunasan.</p>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Warning saat revert dari selesai */}
          {spk.status === "selesai" && pendingStatus === "dikerjakan" && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Peringatan Tindakan Berisiko</p>
                <p className="mt-0.5">Mengembalikan SPK dari <strong>selesai</strong> akan mempengaruhi garansi &amp; perolehan poin loyalty pelanggan. Operasi ini dibatalkan jika invoice sudah <strong>lunas</strong>.</p>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Catatan {pendingStatus === "kendala" ? <span className="text-red-500">*</span> : "(opsional)"}
            </label>
            <textarea
              value={catatan}
              onChange={e => setCatatan(e.target.value)}
              rows={3}
              placeholder={pendingStatus === "kendala" ? "Jelaskan kendala yang terjadi..." : "Tambahkan catatan jika perlu..."}
              className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium border border-surface-border rounded-xl hover:bg-surface-hover">Batal</button>
            <button
              onClick={onConfirm}
              disabled={updatingStatus || (pendingStatus === "kendala" && !catatan.trim())}
              className="px-5 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center gap-2"
            >
              {updatingStatus && <Loader2 size={14} className="animate-spin" />}
              Konfirmasi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
