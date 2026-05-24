"use client";

import { Plus, Trash2, Loader2, CheckCircle2, X, Search, Upload, Image as ImageIcon } from "lucide-react";
import type { Sparepart } from "@/lib/types";

export interface SelectedSparepart {
  sparepartId: number;
  nama: string;
  harga: number;
  qty: number;
}

interface SparepartPickerProps {
  label: string;
  sparepartList: Sparepart[];
  sparepartSearch: string;
  setSparepartSearch: (v: string) => void;
  loadingSparepart: boolean;
  selectedSparepartItems: SelectedSparepart[];
  addSparepart: (sp: Sparepart) => void;
  removeSparepart: (id: number) => void;
  updateSparepartQty: (id: number, qty: number) => void;
  totalSparepart: number;
  formatRp: (n: number) => string;
}

export function SparepartPicker({
  label,
  sparepartList,
  sparepartSearch,
  setSparepartSearch,
  loadingSparepart,
  selectedSparepartItems,
  addSparepart,
  removeSparepart,
  updateSparepartQty,
  totalSparepart,
  formatRp,
}: SparepartPickerProps) {
  return (
    <div className="space-y-2 pt-4 border-t border-surface-border">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        {totalSparepart > 0 && (
          <span className="text-xs font-bold text-primary">{formatRp(totalSparepart)}</span>
        )}
      </div>

      <div className="flex items-center gap-2 bg-surface border border-surface-border rounded-xl px-3 py-2 focus-within:ring-1 focus-within:ring-primary/50">
        <Search size={13} className="text-muted-foreground shrink-0" />
        <input
          type="text"
          value={sparepartSearch}
          onChange={e => setSparepartSearch(e.target.value)}
          placeholder="Cari sparepart / material..."
          className="bg-transparent border-none focus:outline-none text-sm w-full"
        />
        {loadingSparepart && <Loader2 size={13} className="animate-spin text-muted-foreground" />}
      </div>

      <div className="border border-surface-border rounded-xl overflow-hidden">
        <div className="max-h-52 overflow-y-auto divide-y divide-surface-border">
          {sparepartList.length === 0 && !loadingSparepart && (
            <p className="text-xs text-center text-muted-foreground py-5">
              {sparepartSearch ? `Tidak ada sparepart "${sparepartSearch}"` : "Cari data sparepart..."}
            </p>
          )}
          {sparepartList.map(sp => {
            const selected = selectedSparepartItems.find(x => x.sparepartId === sp.id);
            return (
              <div key={sp.id} className={`flex items-center justify-between px-3 py-2.5 transition-colors ${selected ? "bg-primary/5" : "hover:bg-surface-hover/40"}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {selected && <CheckCircle2 size={12} className="text-primary shrink-0" />}
                    <p className="text-sm font-medium truncate">{sp.name}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {sp.kode && <span className="uppercase text-muted-foreground mr-1">{sp.kode} ·</span>}
                    {sp.merk && <span className="uppercase">{sp.merk} ·</span>}
                    Sisa Stok: {sp.stok}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-2 shrink-0">
                  <span className="text-xs font-bold text-primary">{formatRp(Number(sp.hargaJual))}</span>
                  {selected ? (
                    <button type="button" onClick={() => removeSparepart(sp.id)}
                      className="w-7 h-7 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-colors">
                      <X size={13} />
                    </button>
                  ) : (
                    <button type="button" onClick={() => addSparepart(sp)}
                      className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors">
                      <Plus size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedSparepartItems.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Sparepart Terpilih ({selectedSparepartItems.length})</p>
          {selectedSparepartItems.map(item => (
            <div key={item.sparepartId} className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2">
              <CheckCircle2 size={13} className="text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.nama}</p>
                <p className="text-[10px] text-muted-foreground">{formatRp(item.harga)} × {item.qty} = <span className="font-semibold text-primary">{formatRp(item.harga * item.qty)}</span></p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => updateSparepartQty(item.sparepartId, item.qty - 1)}
                  className="w-6 h-6 rounded-lg border border-surface-border text-sm font-bold hover:bg-surface-hover flex items-center justify-center">−</button>
                <span className="text-sm font-bold w-5 text-center">{item.qty}</span>
                <button type="button" onClick={() => updateSparepartQty(item.sparepartId, item.qty + 1)}
                  className="w-6 h-6 rounded-lg border border-surface-border text-sm font-bold hover:bg-surface-hover flex items-center justify-center">+</button>
                <button type="button" onClick={() => removeSparepart(item.sparepartId)}
                  className="w-6 h-6 rounded-lg text-red-500 hover:bg-red-500/10 flex items-center justify-center ml-1">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ImageUploaderProps {
  files: File[];
  setFiles: (files: File[]) => void;
  previews: string[];
  setPreviews: (previews: string[]) => void;
  maxFiles?: number;
}

export function ImageUploader({ files, setFiles, previews, setPreviews, maxFiles = 6 }: ImageUploaderProps) {
  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    const remaining = maxFiles - files.length;
    const accepted = newFiles.slice(0, remaining);
    setFiles([...files, ...accepted]);
    accepted.forEach(f => {
      const reader = new FileReader();
      reader.onload = () => setPreviews([...previews, reader.result as string]);
      reader.readAsDataURL(f);
    });
    e.target.value = "";
  };

  const removeAt = (idx: number) => {
    setFiles(files.filter((_, i) => i !== idx));
    setPreviews(previews.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <ImageIcon size={12} /> Gambar Referensi (Opsional, maks {maxFiles})
      </label>
      {previews.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {previews.map((src, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-surface-border group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Referensi ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      {files.length < maxFiles && (
        <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-surface-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors text-sm text-muted-foreground">
          <Upload size={16} />
          <span>Klik untuk tambah gambar referensi</span>
          <input type="file" accept="image/*" multiple onChange={onSelect} className="hidden" />
        </label>
      )}
    </div>
  );
}
