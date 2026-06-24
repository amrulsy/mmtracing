"use client";

import { Image as ImageIcon, Upload, Loader2 } from "lucide-react";
import type { SpkPhoto } from "@/lib/types";

interface SpkPhotosProps {
 photos: SpkPhoto[];
 onUpload: (f: File) => void;
 uploading: boolean;
}

export function SpkPhotos({ photos, onUpload, uploading }: SpkPhotosProps) {
 const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
 if (e.target.files && e.target.files.length > 0) {
 onUpload(e.target.files[0]);
 }
 e.target.value = "";
 };

 return (
 <div className="glass-panel p-4 space-y-3">
 <div className="flex items-center justify-between">
 <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
 <ImageIcon size={12} /> Lampiran & Foto
 </h3>
 <label className={`text-[10px] font-bold text-primary hover:underline flex items-center gap-1 ${uploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
 {uploading ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />}
 {uploading ? "Mengunggah..." : "Tambah Foto"}
 <input type="file" accept="image/*" className="hidden" onChange={handleSelect} disabled={uploading} />
 </label>
 </div>

 {photos.length === 0 ? (
 <p className="text-xs text-muted-foreground italic">Belum ada foto lampiran.</p>
 ) : (
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
 {photos.map(p => (
 <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden border border-surface-border group bg-surface-hover">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src={p.url} alt={p.caption || "Lampiran SPK"} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
 {p.caption && (
 <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1.5 text-[10px] text-white truncate">
 {p.caption}
 </div>
 )}
 </div>
 ))}
 </div>
 )}
 </div>
 );
}
