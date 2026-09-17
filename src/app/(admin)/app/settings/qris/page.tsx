"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Upload, Save, Loader2, QrCode } from "lucide-react";
import { api } from "@/lib/api";
import { useRole } from "@/hooks/useRole";

interface QrisPreview { payload: string; merchantName: string; merchantCity: string; }
type QrisMode = "static" | "midtrans" | "legacy";
interface QrisSettings extends Partial<QrisPreview> { configured: boolean; enabled: boolean; mode: QrisMode; midtransReady: boolean; midtransEnvironment: string; updatedAt?: string; }

export default function QrisSettingsPage() {
  const { hasAccess } = useRole();
  const allowed = hasAccess("settings", "full");
  const [saved, setSaved] = useState<QrisSettings | null>(null);
  const [preview, setPreview] = useState<QrisPreview | null>(null);
  const [mode, setMode] = useState<QrisMode>("static");
  const [enabled, setEnabled] = useState(false);
  const [midtransServerKey, setMidtransServerKey] = useState("");
  const [midtransEnvironment, setMidtransEnvironment] = useState("sandbox");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filename, setFilename] = useState("");
  const [reload, setReload] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const mutation = useRef(false);

  useEffect(() => {
    if (!allowed) { setLoading(false); return; }
    let active = true;
    setLoading(true); setError("");
    api.get<QrisSettings>("/settings/qris").then(res => {
      if (active) {
        setSaved(res.data);
        setEnabled(res.data.enabled);
        setMode(res.data.mode);
        setMidtransEnvironment(res.data.midtransEnvironment || "sandbox");
      }
    }).catch(e => { if (active) setError(e instanceof Error ? e.message : "Pengaturan gagal dimuat."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [allowed, reload]);

  async function upload(file?: File) {
    if (!file || mutation.current) return;
    setError(""); setMessage("");
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError("Pilih PNG, JPG, atau WebP maksimal 5 MB."); return;
    }
    mutation.current = true; setBusy(true);
    try {
      const form = new FormData(); form.append("file", file);
      const res = await api.upload<QrisPreview>("/settings/qris/preview", form);
      setPreview(res.data); setFilename(file.name);
      setMessage("QRIS terbaca. Periksa nama merchant lalu simpan untuk menerapkannya.");
    } catch (e) { setError(e instanceof Error ? e.message : "QRIS tidak terbaca."); }
    finally { mutation.current = false; setBusy(false); if (input.current) input.current.value = ""; }
  }

  const current = preview || (saved?.payload ? { payload: saved.payload, merchantName: saved.merchantName!, merchantCity: saved.merchantCity! } : null);
  const changed = !!preview || enabled !== saved?.enabled || mode !== saved?.mode || midtransEnvironment !== saved?.midtransEnvironment || !!midtransServerKey;
  const canSave = mode === "midtrans" ? (!enabled || !!saved?.midtransReady || !!midtransServerKey) : !!current;

  async function save() {
    if (!canSave || mutation.current) return;
    mutation.current = true; setBusy(true); setError(""); setMessage("");
    try {
      const res = await api.put<QrisSettings>("/settings/qris", { payload: current?.payload || "", enabled, mode, midtransServerKey: midtransServerKey || undefined, midtransEnvironment });
      setSaved(res.data); setPreview(null); setFilename(""); setEnabled(res.data.enabled); setMode(res.data.mode); setMidtransServerKey(""); setMidtransEnvironment(res.data.midtransEnvironment || "sandbox");
      setMessage("Pengaturan QRIS berhasil disimpan.");
    } catch (e) { setError(e instanceof Error ? e.message : "Pengaturan gagal disimpan."); }
    finally { mutation.current = false; setBusy(false); }
  }

  if (!allowed) return <div className="glass-panel p-6">Pengaturan QRIS hanya dapat dikelola oleh pengguna dengan akses penuh Pengaturan.</div>;
  if (loading) return <div role="status" className="flex gap-2 p-6"><Loader2 className="animate-spin" /> Memuat pengaturan QRIS...</div>;

  return <section className="glass-panel space-y-6 p-5 lg:p-6">
    <div className="flex items-center gap-3"><QrCode className="text-primary" /><div><h2 className="text-xl font-bold">QRIS Pembayaran</h2><p className="text-sm text-muted-foreground">Pilih QRIS statis atau QRIS dinamis melalui Midtrans.</p></div></div>
    {error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-600">{message}</p>}
    {!saved ? <button onClick={() => setReload(v => v + 1)} className="text-primary underline">Muat ulang pengaturan</button> : <>
      <div className="rounded-xl border border-surface-border p-4 text-sm">
        <p>Status tersimpan: <strong>{saved.enabled ? "Aktif" : saved.configured ? "Nonaktif" : "Belum diatur"}</strong></p>
        {saved.merchantName && <p>Merchant tersimpan: {saved.merchantName} · {saved.merchantCity}</p>}
        {saved.updatedAt && <p className="mt-1 text-xs text-muted-foreground">Diperbarui {new Date(saved.updatedAt).toLocaleString("id-ID")}</p>}
      </div>
      <label className="block space-y-2 text-sm font-medium">Mode pembayaran
        <select value={mode} disabled={busy} onChange={e => setMode(e.target.value as QrisMode)} className="w-full rounded-xl border border-surface-border bg-background p-3">
          <option value="static">QRIS statis ? nominal diisi pelanggan</option>
          <option value="midtrans">QRIS dinamis ? API Midtrans</option>
          <option value="legacy">QR bernominal dari QR statis ? verifikasi kasir</option>
        </select>
      </label>
      {mode === "midtrans" ? <div className="rounded-xl border border-surface-border p-4 space-y-4 text-sm">
        <label className="block space-y-2">
          <span className="font-semibold">Lingkungan Midtrans (Environment)</span>
          <select value={midtransEnvironment} disabled={busy} onChange={e => setMidtransEnvironment(e.target.value)} className="w-full rounded-xl border border-surface-border bg-background p-3">
            <option value="sandbox">Sandbox (Pengujian)</option>
            <option value="production">Production (Nyata)</option>
          </select>
        </label>
        <label className="block space-y-2">
          <span className="font-semibold">Server Key Midtrans</span>
          <input type="password" value={midtransServerKey} disabled={busy} onChange={e => setMidtransServerKey(e.target.value)} placeholder={saved.midtransReady ? "•••••••••••••••• (sudah diatur, isi untuk mengubah)" : "Masukkan Server Key dari dashboard Midtrans"} className="w-full rounded-xl border border-surface-border bg-background p-3 font-mono" />
        </label>
        <div className="text-muted-foreground space-y-1 mt-2 text-xs">
          <p>QR dibuat per transaksi. Kasir menekan Cek status &amp; catat pembayaran; sistem memeriksa dana masuk langsung ke API Midtrans.</p>
          <p>Server Key hanya disimpan di database server dan tidak dikembalikan ke browser.</p>
        </div>
      </div> : <p className="text-sm text-muted-foreground">{mode === "static" ? "Unggah QRIS statis resmi merchant. Pelanggan memasukkan nominal sendiri dan kasir memverifikasi dana masuk. QRIS statis Midtrans tidak dibuat melalui API." : "Mode lama: nominal disisipkan pada QR statis. Pastikan didukung penyedia; verifikasi tetap dilakukan kasir."}</p>}
      {mode !== "midtrans" && <>
      <div className="rounded-xl border-2 border-dashed border-surface-border p-6 text-center space-y-3">
        <Upload className="mx-auto text-primary" />
        <label htmlFor="qris-file" className="block font-semibold">{saved.configured ? "Ganti QRIS statis" : "Unggah QRIS statis"}</label>
        <p className="text-xs text-muted-foreground">PNG, JPG, WebP · maksimal 5 MB / 20 megapiksel. Gambar harus menampilkan QR secara utuh dan jelas.</p>
        <input id="qris-file" ref={input} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e => void upload(e.target.files?.[0])} className="max-w-full text-sm" />
        {filename && <p className="break-all text-sm">{filename} — belum disimpan</p>}
      </div>
      {current && <div className="grid gap-4 sm:grid-cols-2 items-center rounded-xl bg-surface-hover/50 p-4">
        <div className="mx-auto w-fit max-w-full rounded-xl bg-white p-2"><QRCodeSVG value={current.payload} size={220} marginSize={4} level="M" title="Pratinjau QRIS statis" className="max-w-full h-auto" /></div>
        <div className="space-y-2"><p className="text-xs uppercase text-muted-foreground">{preview ? "Pratinjau pengganti" : "QRIS tersimpan"}</p><p className="text-lg font-bold">{current.merchantName}</p><p>{current.merchantCity}</p><p className="text-sm text-muted-foreground">Pastikan nama merchant sesuai dengan akun penerima dana bengkel Anda.</p></div>
      </div>}
      </>}
      <label className="flex gap-3 items-start rounded-xl border border-surface-border p-4">
        <input type="checkbox" checked={enabled} disabled={busy || (mode !== "midtrans" && !current) || (mode === "midtrans" && !saved.midtransReady)} onChange={e => setEnabled(e.target.checked)} className="mt-1" />
        <span><span className="block font-semibold">Aktifkan QRIS di pembayaran</span><span className="text-sm text-muted-foreground">Metode verifikasi mengikuti mode pembayaran yang dipilih.</span></span>
      </label>
      <p className="text-sm text-muted-foreground">Mengganti atau menonaktifkan QRIS berlaku untuk pembuatan QR berikutnya; QR yang sudah ditampilkan tetap dapat dibayar dan diverifikasi.</p>
      <div className="flex flex-wrap gap-3">
        <button onClick={save} disabled={busy || !canSave || !changed} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50">{busy ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Simpan pengaturan</button>
        {changed && <button disabled={busy} onClick={() => { setPreview(null); setFilename(""); setEnabled(saved.enabled); setMode(saved.mode); setMidtransEnvironment(saved.midtransEnvironment || "sandbox"); setMidtransServerKey(""); setMessage(""); setError(""); }} className="rounded-xl border border-surface-border px-4 py-3">Batalkan perubahan</button>}
      </div>
    </>}
  </section>;
}
