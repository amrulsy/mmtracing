"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Banknote,
  CreditCard,
  QrCode,
  Wallet,
  CheckCircle,
  Loader2,
  Receipt,
  X,
  AlertTriangle,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { formatRupiah, formatCurrencyDisplay, parseCurrencyInput } from "@/lib/utils";
import type { Pembayaran } from "@/lib/types";
import { QrisPaymentPanel } from "./qris-payment";

const QUICK_AMOUNTS = [50_000, 100_000, 200_000, 500_000, 1_000_000];
const METODE_LIST = [
  { icon: Banknote, label: "Cash", key: "1" },
  { icon: CreditCard, label: "Transfer", key: "2" },
  { icon: QrCode, label: "QRIS", key: "3" },
  { icon: Wallet, label: "E-Wallet", key: "4" },
];

interface PaymentModalProps {
  /** Invoice/pembayaran to pay */
  pembayaran: Pembayaran;
  /** Whether the modal is open */
  open: boolean;
  /** Called when the modal should close */
  onClose: () => void;
  /** Called after a successful payment, receives updated data */
  onSuccess?: (updated: Pembayaran) => void;
}

type ModalStep = "form" | "confirm" | "qris" | "success";

interface SuccessData {
  jumlah: number;
  metode: string;
  kembalian: number;
  isLunas: boolean;
  invoiceId: number;
  noInvoice: string;
}

export function PaymentModal({ pembayaran, open, onClose, onSuccess }: PaymentModalProps) {
  const [step, setStep] = useState<ModalStep>("form");
  const [jumlahBayar, setJumlahBayar] = useState("");
  const [metode, setMetode] = useState("Cash");
  const [processing, setProcessing] = useState(false);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const sisa = Number(pembayaran.sisaBayar) || 0;
  const numBayar = parseCurrencyInput(jumlahBayar);
  const kembalian = numBayar > sisa ? numBayar - sisa : 0;
  const bayarPokok = Math.min(numBayar, sisa);

  // Reset state when pembayaran changes or modal opens
  useEffect(() => {
    if (open) {
      setStep("form");
      setJumlahBayar(sisa.toString());
      setMetode("Cash");
      setProcessing(false);
      setSuccessData(null);
      // Auto-focus input after a tick
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, pembayaran.id, sisa]);

  // Dialog open/close management
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
      document.body.style.overflow = "hidden";
    } else {
      if (dialog.open) dialog.close();
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleCurrencyInput = (raw: string) => {
    const num = raw.replace(/\D/g, "");
    setJumlahBayar(num);
  };

  const handleProceedToConfirm = () => {
    if (numBayar <= 0) {
      toast.warning("Nominal Terlalu Kecil", "Jumlah bayar harus lebih dari 0");
      return;
    }
    setStep(metode === "QRIS" ? "qris" : "confirm");
  };

  const handleConfirmPay = async () => {
    if (metode === "QRIS") { setStep("qris"); return; }
    setProcessing(true);
    try {
      const res = await api.post<Pembayaran>(`/pembayaran/${pembayaran.id}/bayar`, {
        jumlah: bayarPokok,
        metode: metode.toLowerCase(),
      });

      const isLunasAfter = bayarPokok >= sisa;

      setSuccessData({
        jumlah: bayarPokok,
        metode,
        kembalian,
        isLunas: isLunasAfter,
        invoiceId: pembayaran.id,
        noInvoice: pembayaran.noInvoice,
      });
      setStep("success");

      onSuccess?.(res.data);
    } catch (err: unknown) {
      toast.error("Pembayaran Gagal", err instanceof Error ? err.message : "Gagal memproses pembayaran");
      setStep("form");
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    if (processing) return;
    onClose();
  };

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => { e.preventDefault(); handleClose(); }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg max-h-[calc(100dvh-2rem)] overflow-hidden rounded-2xl border border-surface-border bg-surface text-foreground p-0 backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-surface-border px-5 py-3">
          <h2 className="text-lg font-bold">
            {step === "success" ? "Pembayaran Berhasil" : step === "confirm" ? "Konfirmasi Pembayaran" : "Proses Pembayaran"}
          </h2>
          {step !== "success" && (
            <button type="button" onClick={handleClose} disabled={processing} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg hover:bg-surface-hover disabled:opacity-50">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="min-h-0 overflow-y-auto overscroll-contain p-5">
          {step === "qris" && <QrisPaymentPanel
            invoiceId={pembayaran.id}
            amount={bayarPokok}
            onBusy={setProcessing}
            onClose={() => setStep("form")}
            onSuccess={(updated, amount) => {
              setSuccessData({ jumlah: amount, metode: "QRIS", kembalian: 0, isLunas: updated.status === "lunas", invoiceId: pembayaran.id, noInvoice: pembayaran.noInvoice });
              setStep("success");
              onSuccess?.(updated);
            }}
          />}
          {/* ─── STEP: Form ─── */}
          {step === "form" && (
            <div className="space-y-5 animate-in fade-in duration-300">
              {/* Invoice info */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-hover/50 border border-surface-border">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Invoice</p>
                  <p className="font-mono text-sm font-bold text-primary truncate">{pembayaran.noInvoice}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Sisa Tagihan</p>
                  <p className="text-lg font-bold font-mono text-primary">{formatRupiah(sisa)}</p>
                </div>
              </div>

              {/* Nominal Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Uang Diterima / Nominal Dibayar <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">Rp</span>
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    value={formatCurrencyDisplay(jumlahBayar)}
                    onChange={(e) => handleCurrencyInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && numBayar > 0) handleProceedToConfirm(); }}
                    className="w-full bg-background border border-surface-border rounded-xl pl-10 pr-4 py-3 text-lg font-mono font-bold text-right focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                {/* Quick amounts */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setJumlahBayar(sisa.toString())}
                    className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                  >
                    Uang Pas
                  </button>
                  {QUICK_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setJumlahBayar(amt.toString())}
                      className="px-2.5 py-1 text-[10px] font-medium rounded-lg border border-surface-border hover:bg-surface-hover transition-colors"
                    >
                      {formatRupiah(amt, "compact")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live kembalian */}
              <div className={`flex justify-between items-center p-3 rounded-xl border transition-colors ${kembalian > 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-background border-surface-border"}`}>
                <span className="text-sm text-muted-foreground">Kembalian</span>
                <span className={`text-xl font-bold font-mono ${kembalian > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>{formatRupiah(kembalian)}</span>
              </div>

              {/* Metode */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Pilih Metode Pembayaran</p>
                <div className="grid grid-cols-4 gap-2">
                  {METODE_LIST.map((m) => (
                    <button
                      key={m.label}
                      onClick={() => setMetode(m.label)}
                      className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 font-medium text-xs transition-all ${
                        metode === m.label
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-surface-border text-muted-foreground hover:border-primary/30 hover:bg-surface-hover"
                      }`}
                    >
                      <m.icon size={20} />
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleProceedToConfirm}
                disabled={numBayar <= 0}
                className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-bold text-base hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle size={20} />
                Lanjut ke Konfirmasi
              </button>
            </div>
          )}

          {/* ─── STEP: Confirm ─── */}
          {step === "confirm" && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <AlertTriangle size={20} className="text-amber-500 shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                  Pastikan nominal dan metode pembayaran sudah benar sebelum konfirmasi.
                </p>
              </div>

              <div className="space-y-3 bg-surface-hover/50 rounded-xl p-4 border border-surface-border">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Invoice</span>
                  <span className="font-mono font-bold text-sm text-primary">{pembayaran.noInvoice}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Pelanggan</span>
                  <span className="font-semibold text-sm">{pembayaran.spk?.pelanggan?.name || "—"}</span>
                </div>
                <div className="border-t border-surface-border" />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Sisa Tagihan</span>
                  <span className="font-mono font-bold">{formatRupiah(sisa)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Nominal Bayar</span>
                  <span className="font-mono font-bold text-lg text-primary">{formatRupiah(bayarPokok)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Metode</span>
                  <span className="font-semibold">{metode}</span>
                </div>
                {kembalian > 0 && (
                  <>
                    <div className="border-t border-surface-border" />
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-emerald-600">Kembalian</span>
                      <span className="font-mono font-bold text-lg text-emerald-600">{formatRupiah(kembalian)}</span>
                    </div>
                  </>
                )}
                <div className="border-t border-surface-border" />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Status Setelah Bayar</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${bayarPokok >= sisa ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                    {bayarPokok >= sisa ? "LUNAS" : "PARSIAL"}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("form")}
                  disabled={processing}
                  className="flex-1 py-3 rounded-xl border border-surface-border font-medium text-sm hover:bg-surface-hover transition-colors disabled:opacity-50"
                >
                  Kembali
                </button>
                <button
                  onClick={handleConfirmPay}
                  disabled={processing}
                  className="flex-[2] bg-primary text-primary-foreground py-3 rounded-xl font-bold text-base hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {processing ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      <CheckCircle size={20} />
                      Konfirmasi & Bayar
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP: Success ─── */}
          {step === "success" && successData && (
            <div className="text-center space-y-5 animate-in fade-in zoom-in-95 duration-300">
              <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${successData.isLunas ? "bg-emerald-500/20" : "bg-blue-500/20"}`}>
                <CheckCircle size={40} className={successData.isLunas ? "text-emerald-500" : "text-blue-500"} />
              </div>

              <div>
                <h3 className="text-xl font-bold">
                  {successData.isLunas ? "Invoice Lunas! 🎉" : "Pembayaran Berhasil"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{successData.noInvoice}</p>
              </div>

              <div className="space-y-2 text-sm bg-surface-hover/50 rounded-xl p-4 border border-surface-border text-left">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dibayar</span>
                  <span className="font-bold font-mono">{formatRupiah(successData.jumlah)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Metode</span>
                  <span className="font-medium">{successData.metode}</span>
                </div>
                {successData.kembalian > 0 && (
                  <div className="flex justify-between pt-2 border-t border-surface-border">
                    <span className="font-bold text-emerald-600">Kembalian</span>
                    <span className="font-bold text-emerald-600 font-mono text-lg">{formatRupiah(successData.kembalian)}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {successData.isLunas && (
                  <Link
                    href={`/app/pembayaran/${successData.invoiceId}/kwitansi`}
                    className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors text-sm"
                  >
                    <Receipt size={16} /> Cetak Struk Thermal
                  </Link>
                )}
                {!successData.isLunas && (
                  <Link
                    href={`/app/pembayaran/${successData.invoiceId}/kwitansi`}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors text-sm"
                  >
                    <Receipt size={16} /> Cetak Struk Pembayaran
                  </Link>
                )}
                <button
                  onClick={handleClose}
                  className="w-full py-3 rounded-xl border border-surface-border text-sm font-medium hover:bg-surface-hover transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
