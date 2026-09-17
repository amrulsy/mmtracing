"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { formatRupiah } from "@/lib/utils";
import type { Pembayaran } from "@/lib/types";

interface Attempt { mode: "static" | "midtrans" | "legacy"; qrImageUrl?: string; id: string; payload: string; amount: number; merchantName: string; merchantCity: string; noInvoice: string; }
interface Props {
  invoiceId: number;
  amount: number;
  onSuccess: (payment: Pembayaran, amount: number) => void;
  onClose: () => void;
  onBusy?: (busy: boolean) => void;
}

export function QrisPaymentPanel({ invoiceId, amount, onSuccess, onClose, onBusy }: Props) {
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const posting = useRef(false);

  useEffect(() => {
    let active = true;
    setLoading(true); setAttempt(null); setError(""); setReference(""); setVerified(false);
    api.post<Attempt>(`/pembayaran/${invoiceId}/qris`, { jumlah: amount })
      .then(res => { if (active) setAttempt(res.data); })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : "QRIS gagal dibuat."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [invoiceId, amount, retry]);

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!attempt || (attempt.mode !== "midtrans" && !verified) || posting.current) return;
    posting.current = true; setBusy(true); onBusy?.(true); setError("");
    try {
      const res = await api.post<Pembayaran>(`/pembayaran/${invoiceId}/bayar`, {
        jumlah: attempt.amount, metode: "qris", qrisAttemptId: attempt.id,
        ...(attempt.mode === "midtrans" ? {} : { qrisReference: reference.trim(), qrisVerified: verified }),
      });
      onSuccess(res.data, attempt.amount);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Konfirmasi gagal. Periksa riwayat invoice sebelum mencoba lagi.");
    } finally {
      posting.current = false; setBusy(false); onBusy?.(false);
    }
  }

  return <div className="space-y-4">
    <div>
      <h3 className="text-lg font-bold">Pembayaran QRIS</h3>
      <p className="text-sm text-muted-foreground">{attempt?.mode === "static" ? "Masukkan nominal sesuai tagihan setelah memindai QR." : "Nominal terisi otomatis saat pelanggan memindai QR."}</p>
    </div>
    {loading && <div role="status" className="flex justify-center gap-2 py-10"><Loader2 className="animate-spin" /> Membuat QRIS...</div>}
    {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">{error}</div>}
    {!loading && !attempt && <div className="space-y-3 text-sm">
      <Link href="/app/settings/qris" className="text-primary underline">Buka pengaturan QRIS (admin)</Link>
      <button type="button" onClick={() => setRetry(v => v + 1)} className="ml-4 underline">Coba lagi</button>
    </div>}
    {attempt && <>
      <div className="text-center space-y-2">
        <p className="font-mono text-sm">{attempt.noInvoice}</p>
        <div className="mx-auto w-fit max-w-full rounded-xl bg-white p-2">
          {attempt.qrImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={attempt.qrImageUrl} alt="QRIS dinamis Midtrans" width={300} height={360} className="max-w-full h-auto" />
          ) : <QRCodeSVG value={attempt.payload} size={256} marginSize={4} level="M" title={`QRIS ${attempt.merchantName} ${formatRupiah(attempt.amount)}`} className="max-w-full h-auto" />}
        </div>
        <p className="font-semibold">{attempt.merchantName}</p>
        <p className="text-xs text-muted-foreground">{attempt.merchantCity}</p>
        <p className="text-2xl font-bold text-primary">{formatRupiah(attempt.amount)}</p>
        <p className="text-sm text-amber-600">{attempt.mode === "midtrans" ? "Menunggu pemeriksaan status Midtrans" : "Menunggu verifikasi kasir"}</p>
      </div>
      <p className="rounded-xl bg-surface-hover p-3 text-sm text-muted-foreground">{attempt.mode === "midtrans" ? "Setelah membayar, tekan tombol di bawah untuk memeriksa status Midtrans dan mencatat pembayaran. Menutup layar tidak membatalkan transaksi; buka kembali dengan nominal yang sama untuk melanjutkan." : "Cek nama merchant dan nominal sebelum membayar. Kasir wajib memverifikasi dana masuk. Menutup layar tidak membatalkan pembayaran."}</p>
      <form onSubmit={confirm} className="space-y-3">
        {attempt.mode !== "midtrans" && <>
        <label className="block text-sm font-medium">Referensi transaksi dari aplikasi merchant
          <input autoFocus required minLength={4} maxLength={100} value={reference} onChange={e => setReference(e.target.value)} disabled={busy} placeholder="Nomor referensi / RRN" className="mt-1 w-full rounded-xl border border-surface-border bg-background p-3" />
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={verified} onChange={e => setVerified(e.target.checked)} disabled={busy} className="mt-1" />
          <span>Saya sudah memeriksa transaksi masuk di aplikasi merchant, dengan nominal dan referensi yang sesuai.</span>
        </label>
        </>}
        <button type="submit" disabled={busy || (attempt.mode !== "midtrans" && (!verified || reference.trim().length < 4))} className="flex w-full justify-center gap-2 rounded-xl bg-primary p-3 font-semibold text-primary-foreground disabled:opacity-50">
          {busy && <Loader2 size={20} className="animate-spin" />} {busy ? "Memeriksa pembayaran..." : attempt.mode === "midtrans" ? "Cek status & catat pembayaran" : "Konfirmasi dana diterima"}
        </button>
      </form>
    </>}
    <button type="button" onClick={onClose} disabled={busy} className="w-full rounded-xl border border-surface-border p-3 text-sm disabled:opacity-50">Tutup</button>
  </div>;
}

export function QrisPaymentDialog(props: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} aria-label="Pembayaran QRIS" onCancel={e => { e.preventDefault(); if (!busy) props.onClose(); }} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-surface-border bg-background p-5 text-foreground backdrop:bg-black/60">
    <QrisPaymentPanel {...props} onBusy={setBusy} />
  </dialog>;
}
