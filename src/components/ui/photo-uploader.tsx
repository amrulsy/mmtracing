"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";

interface Props {
  value?: string | null;
  onChange: (url: string | null) => void;
  /** ukuran tampilan (px). Default 96. */
  size?: number;
  /** label tombol untuk accessibility */
  label?: string;
  /** rounded-full untuk avatar, rounded-xl untuk foto kendaraan */
  shape?: "circle" | "rounded";
}

export function PhotoUploader({ value, onChange, size = 96, label = "Upload foto", shape = "circle" }: Props) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      return toast.error("Format Salah", "File harus berupa gambar (jpg/png/webp).");
    }
    if (file.size > 5 * 1024 * 1024) {
      return toast.error("File Terlalu Besar", "Maksimal 5MB.");
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await api.upload<{ url: string }>("/upload/image", fd);
      onChange(res.data.url);
      toast.success("Berhasil", "Foto berhasil diupload.");
    } catch (err: unknown) {
      toast.error("Gagal Upload", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const src = value ? (value.startsWith("http") ? value : value) : null;
  const radius = shape === "circle" ? "rounded-full" : "rounded-xl";

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div
        className={`relative ${radius} bg-surface-hover border-2 border-dashed border-surface-border overflow-hidden flex items-center justify-center`}
        style={{ width: size, height: size }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="Foto" className="w-full h-full object-cover" />
        ) : (
          <Camera size={size * 0.35} className="text-muted-foreground/60" />
        )}
        {uploading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <Loader2 className="animate-spin text-primary" size={size * 0.3} />
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-[10px] font-medium px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 flex items-center gap-1"
          aria-label={label}
        >
          <Camera size={11} /> {value ? "Ganti" : "Upload"}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-[10px] font-medium px-2 py-1 rounded-md bg-red-500/10 text-red-600 hover:bg-red-500/20 flex items-center gap-1"
            aria-label="Hapus foto"
          >
            <X size={11} /> Hapus
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

// Helper: convert relative /uploads/xxx URL to absolute (for QR, etc.)
// Tidak digunakan di component tapi disediakan untuk import di tempat lain.
export function absoluteUploadUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  if (typeof window !== "undefined") return `${window.location.origin}${url}`;
  return url;
}
