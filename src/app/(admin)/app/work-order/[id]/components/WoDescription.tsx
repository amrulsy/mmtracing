"use client";

import { FileText } from "lucide-react";
import type { WorkOrder } from "@/lib/types";

interface SpkDescriptionProps {
 spk: WorkOrder;
}

export function WoDescription({ spk }: SpkDescriptionProps) {
 if (!(spk.keluhan || spk.judulProyek || spk.spesifikasi)) return null;

 return (
 <div className="glass-panel p-4 space-y-3">
 <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
 <FileText size={12} />Deskripsi Pekerjaan
 </h3>
 {spk.judulProyek && (
 <div>
 <p className="text-[10px] text-muted-foreground">Judul Proyek</p>
 <p className="font-semibold text-sm">{spk.judulProyek}</p>
 </div>
 )}
 {spk.keluhan && (
 <div>
 <p className="text-[10px] text-muted-foreground">Keluhan / Deskripsi</p>
 <p className="text-sm">{spk.keluhan}</p>
 </div>
 )}
 {spk.spesifikasi && (
 <div>
 <p className="text-[10px] text-muted-foreground">Spesifikasi</p>
 <p className="text-sm text-muted-foreground">{spk.spesifikasi}</p>
 </div>
 )}
 </div>
 );
}
