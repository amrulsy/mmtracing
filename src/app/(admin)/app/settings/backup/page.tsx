"use client";

import { useState, useRef } from "react";
import { Download, Upload, Database, Shield, Loader2, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";

const EXPORT_ENTITIES = [
  { key: "pelanggan", label: "Pelanggan" },
  { key: "kendaraan", label: "Kendaraan" },
  { key: "spk", label: "SPK" },
  { key: "pembayaran", label: "Pembayaran" },
  { key: "sparepart", label: "Sparepart" },
  { key: "mekanik", label: "Mekanik" },
  { key: "inventaris", label: "Inventaris" },
  { key: "log-aktivitas", label: "Log Aktivitas" },
];

export default function BackupSettingsPage() {
  const [backingUp, setBackingUp] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackupNow = async () => {
    setBackingUp(true);
    try {
      const token = localStorage.getItem("mm_token") || "";
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
      const res = await fetch(`${baseUrl}/settings/backup`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Gagal melakukan backup");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Backup Berhasil", "File backup berhasil diunduh");
    } catch {
      toast.error("Gagal", "Endpoint backup tidak tersedia atau terjadi kesalahan server");
    } finally {
      setBackingUp(false);
    }
  };

  const handleExport = async (entity: string, label: string) => {
    setExporting(entity);
    try {
      const token = localStorage.getItem("mm_token") || "";
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
      const res = await fetch(`${baseUrl}/${entity}/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Not found");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${entity}_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Berhasil", `Data ${label} berhasil diekspor`);
    } catch {
      toast.error("Belum Tersedia", `Ekspor ${label} belum tersedia di backend`);
    } finally {
      setExporting(null);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoring(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      await api.post("/settings/restore", formData);
      toast.success("Berhasil", "Database berhasil di-restore dari backup");
    } catch {
      toast.error("Gagal", "Format file tidak dikenali atau ditolak server");
    } finally {
      setRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Backup &amp; Restore</h1>
        <p className="text-muted-foreground text-sm">Kelola backup data dan export untuk keamanan data bengkel.</p>
      </div>

      <div className="glass-panel p-6 border-l-4 border-l-emerald-500">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Shield size={24} className="text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold">Backup Manual</h3>
            <p className="text-sm text-muted-foreground">Backup semua data ke server sekarang</p>
          </div>
          <button onClick={handleBackupNow} disabled={backingUp}
            className="flex items-center gap-2 text-sm bg-primary text-primary-foreground px-4 py-2 rounded-xl font-medium btn-glossy shadow-glossy-primary disabled:opacity-50 shrink-0">
            {backingUp ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
            {backingUp ? "Memproses..." : "Backup Sekarang"}
          </button>
        </div>
      </div>

      <div className="glass-panel p-4 flex items-start gap-3 border border-amber-500/20 bg-amber-500/5">
        <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Fitur backup otomatis dan riwayat backup tersedia di konfigurasi server. Hubungi administrator untuk jadwal backup rutin.
        </p>
      </div>

      <div className="glass-panel p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">📤 Export Data ke CSV</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {EXPORT_ENTITIES.map(({ key, label }) => (
            <button key={key} onClick={() => handleExport(key, label)} disabled={exporting === key}
              className="p-3 rounded-xl border border-surface-border text-center hover:bg-surface-hover/30 hover:border-primary/20 transition-all disabled:opacity-60">
              {exporting === key
                ? <Loader2 size={16} className="mx-auto text-primary mb-1 animate-spin" />
                : <Download size={16} className="mx-auto text-muted-foreground mb-1" />}
              <p className="text-xs font-medium">{label}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="glass-panel p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          {restoring ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Restore Data
        </h3>
        <div className="border-2 border-dashed border-surface-border rounded-xl p-6 text-center bg-surface-hover/20">
          <Upload size={32} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">Upload File Backup</p>
          <p className="text-xs text-muted-foreground mb-3">Format: .json (Hasil Export Backup Manual)</p>
          <label className={`text-sm font-medium hover:underline cursor-pointer ${restoring ? "text-muted-foreground pointer-events-none" : "text-primary"}`}>
            {restoring ? "Sedang Memproses..." : "Pilih File..."}
            <input type="file" ref={fileInputRef} accept=".json" className="hidden" onChange={handleRestore} disabled={restoring} />
          </label>
        </div>
      </div>
    </>
  );
}
