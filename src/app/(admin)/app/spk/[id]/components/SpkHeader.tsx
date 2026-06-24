"use client";

import Link from "next/link";
import { ArrowLeft, Printer, Receipt, Edit, Copy, MessageCircle, Trash2 } from "lucide-react";
import type { Spk } from "@/lib/types";

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

interface SpkHeaderProps {
 spk: Spk;
 id: string;
 isAdmin: boolean;
 openEdit: () => void;
 handleClone: () => void;
 handleSendWA: (kind: "created" | "selesai" | "progress") => void | Promise<void>;
 sendingWA: string;
 handleDelete: () => void;
}

export function SpkHeader({ spk, id, isAdmin, openEdit, handleClone, handleSendWA, sendingWA, handleDelete }: SpkHeaderProps) {
 return (
 <div className="flex flex-wrap items-start gap-3">
 <Link href="/app/spk" className="p-2 hover:bg-surface-hover rounded-xl border border-surface-border glass transition-colors shrink-0">
 <ArrowLeft size={20} />
 </Link>
 <div className="flex-1 min-w-0">
 <div className="flex flex-wrap items-center gap-2">
 <h1 className="text-xl lg:text-2xl font-bold tracking-tight font-mono">{spk.noSpk}</h1>
 <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${statusStyle(spk.status)}`}>{spk.status}</span>
 <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${prioritasStyle(spk.prioritas)}`}>{spk.prioritas}</span>
 <span className="px-2 py-0.5 rounded-full bg-surface-hover border border-surface-border text-[10px] text-muted-foreground capitalize">{spk.mode}</span>
 </div>
 <p className="text-xs text-muted-foreground mt-1">Dibuat {fmtDateTime(spk.createdAt)} oleh {spk.createdBy?.name || "—"}</p>
 </div>
 <div className="flex gap-2 shrink-0">
 <Link
 href={`/app/spk/${id}/cetak`}
 onClick={() => localStorage.setItem("mm_print_format", "thermal-80")}
 className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-2 border-amber-500/30 text-amber-600 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors"
 >
 <Receipt size={14} /> Struk
 </Link>
 <Link
 href={`/app/spk/${id}/cetak`}
 onClick={() => localStorage.setItem("mm_print_format", "a4")}
 className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold border border-surface-border rounded-xl hover:bg-surface-hover transition-colors"
 >
 <Printer size={14} /> A4
 </Link>
 {spk.status !== "selesai" && spk.status !== "dibatalkan" && (
 <button
 onClick={openEdit}
 className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold border border-surface-border rounded-xl hover:bg-surface-hover transition-colors"
 aria-label="Edit SPK"
 >
 <Edit size={14} /> Edit
 </button>
 )}
 <button
 onClick={handleClone}
 className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold border border-surface-border rounded-xl hover:bg-surface-hover transition-colors"
 aria-label="Clone SPK"
 title="Buat SPK baru berdasarkan data SPK ini"
 >
 <Copy size={14} /> Clone
 </button>
 {spk.pelanggan?.phone && (
 <div className="relative group">
 <button
 disabled={!!sendingWA}
 className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold border border-emerald-500/30 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
 aria-label="Kirim WhatsApp"
 >
 {sendingWA ? <MessageCircle size={14} className="animate-spin" /> : <MessageCircle size={14} />}
 WA
 </button>
 <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-surface-border rounded-xl shadow-2xl p-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
 <button onClick={() => handleSendWA("created")} className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-surface-hover">SPK Dibuat (invoice)</button>
 <button onClick={() => handleSendWA("progress")} className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-surface-hover">Update Progress</button>
 <button onClick={() => handleSendWA("selesai")} className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-surface-hover">Siap Ambil (Selesai)</button>
 </div>
 </div>
 )}
 {isAdmin && spk.status !== "selesai" && spk.status !== "dibatalkan" && (
 <button onClick={handleDelete} className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-red-500/30 text-red-500 rounded-xl hover:bg-red-500/10 transition-colors" aria-label="Hapus SPK">
 <Trash2 size={15} />
 </button>
 )}
 </div>
 </div>
 );
}
