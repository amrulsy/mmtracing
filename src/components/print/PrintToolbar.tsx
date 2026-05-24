"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowLeft, Printer, Receipt, FileText, Monitor, Info, MessageCircle, Bluetooth } from "lucide-react";
import { bluetoothHelper } from "@/lib/bluetoothHelper";
import { toast } from "sonner";
import { PrinterSelectModal } from "./PrinterSelectModal";
import { Settings } from "lucide-react";

export type PrintFormat = "thermal-58" | "thermal-80" | "a4";

const FORMAT_OPTIONS: { value: PrintFormat; label: string; icon: React.ElementType; desc: string; color: string }[] = [
  { value: "thermal-58", label: "Thermal 58mm", icon: Receipt, desc: "Struk kecil", color: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  { value: "thermal-80", label: "Thermal 80mm", icon: Receipt, desc: "Struk standar", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  { value: "a4", label: "A4 Full", icon: FileText, desc: "Kertas penuh", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
];

const STORAGE_KEY = "mm_print_format";

interface PrintToolbarProps {
  backHref: string;
  title?: string;
  onShareWhatsApp?: () => void;
  onPrintBluetooth?: () => Promise<Uint8Array>;
}

export function usePrintFormat(): [PrintFormat, (f: PrintFormat) => void] {
  const [format, setFormatState] = useState<PrintFormat>("a4");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as PrintFormat | null;
    if (saved && ["thermal-58", "thermal-80", "a4"].includes(saved)) {
      setFormatState(saved);
    }
  }, []);

  const setFormat = (f: PrintFormat) => {
    setFormatState(f);
    localStorage.setItem(STORAGE_KEY, f);
  };

  // Apply body class and dynamic @page styles
  useEffect(() => {
    // 1. Manage body classes
    document.body.classList.remove("print-thermal-58", "print-thermal-80", "print-a4");
    document.body.classList.add(`print-${format}`);

    // 2. Manage dynamic @page styles to override browser defaults
    let styleTag = document.getElementById("dynamic-print-style");
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = "dynamic-print-style";
      document.head.appendChild(styleTag);
    }

    if (format.startsWith("thermal")) {
      styleTag.innerHTML = `@page { size: auto; margin: 0mm; }`;
    } else {
      styleTag.innerHTML = `@page { size: A4; margin: 15mm; }`;
    }

    return () => {
      document.body.classList.remove("print-thermal-58", "print-thermal-80", "print-a4");
    };
  }, [format]);

  return [format, setFormat];
}

export function PrintToolbar({ backHref, title, onShareWhatsApp, onPrintBluetooth }: PrintToolbarProps) {
  const [format, setFormat] = usePrintFormat();
  const [showTip, setShowTip] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const [isPrintingBt, setIsPrintingBt] = useState(false);
  const [showPrinterModal, setShowPrinterModal] = useState(false);

  const handleBluetoothPrint = async (forceSelect = false) => {
    if (!onPrintBluetooth) return;

    try {
      if (!bluetoothHelper.isSupported()) {
        toast.error("Browser Anda tidak mendukung Bluetooth atau Anda tidak menggunakan koneksi aman (HTTPS/localhost).");
        return;
      }

      // Check if we need to show the modal
      const savedId = bluetoothHelper.getDefaultPrinterId();
      const authorized = await bluetoothHelper.getAuthorizedDevices();

      if (forceSelect || (!savedId && authorized.length > 0) || (authorized.length > 1 && !savedId)) {
        setShowPrinterModal(true);
        return;
      }

      setIsPrintingBt(true);
      const data = await onPrintBluetooth();
      await bluetoothHelper.autoPrint(data);
      toast.success("Berhasil mengirim data ke printer!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Gagal mencetak via Bluetooth");
    } finally {
      setIsPrintingBt(false);
    }
  };

  const handleDeviceSelect = async (device: any) => {
    bluetoothHelper.setActiveDevice(device);
    if (onPrintBluetooth) {
      try {
        setIsPrintingBt(true);
        const data = await onPrintBluetooth();
        await bluetoothHelper.print(data);
        toast.success("Mencetak dengan " + (device.name || "Printer"));
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setIsPrintingBt(false);
      }
    }
  };

  const isThermal = format.startsWith("thermal");

  return (
    <div className="print:hidden sticky top-0 z-50 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-700 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3">
        {/* Top row: back + title + print */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Link
              href={backHref}
              className="p-2 rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors text-gray-700 dark:text-gray-300"
            >
              <ArrowLeft size={18} />
            </Link>
            {title && <h1 className="text-sm font-bold tracking-tight text-gray-900 dark:text-white truncate max-w-[150px] sm:max-w-xs">{title}</h1>}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTip(!showTip)}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              title="Tips pengaturan printer"
            >
              <Info size={16} />
            </button>

            {onShareWhatsApp && (
              <button
                onClick={onShareWhatsApp}
                className="hidden sm:flex px-4 py-2.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-all items-center gap-2 text-sm font-bold shadow-lg shadow-emerald-500/25 active:scale-95 border-b-2 border-emerald-700"
              >
                <MessageCircle size={16} />
                WhatsApp
              </button>
            )}

            <button
              onClick={handlePrint}
              className="px-3 sm:px-5 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-all flex items-center gap-2 text-sm font-bold shadow-lg shadow-red-500/25 active:scale-95 border-b-2 border-red-800"
            >
              <Printer size={16} />
              <span className="hidden min-[450px]:inline">Cetak</span>
            </button>

            {isThermal && onPrintBluetooth && (
              <button
                onClick={() => handleBluetoothPrint()}
                disabled={isPrintingBt}
                className={`px-3 sm:px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 text-sm font-bold shadow-lg border-b-2 active:scale-95 ${
                  isPrintingBt 
                    ? "bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/25 border-blue-800"
                }`}
              >
                <Bluetooth size={16} className={isPrintingBt ? "animate-pulse" : ""} />
                <span className="hidden min-[450px]:inline">{isPrintingBt ? "Sedang..." : "Cetak BT"}</span>
              </button>
            )}

            {isThermal && onPrintBluetooth && (
              <button
                onClick={() => handleBluetoothPrint(true)}
                className="p-2.5 rounded-xl text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors shrink-0"
                title="Kelola Printer"
              >
                <Settings size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Printer Modal */}
        <PrinterSelectModal 
          isOpen={showPrinterModal} 
          onClose={() => setShowPrinterModal(false)}
          onSelect={handleDeviceSelect}
        />

        {/* Mobile-only WhatsApp & Print Floating or row */}
        {onShareWhatsApp && (
          <div className="flex sm:hidden gap-2 mb-3">
            <button
              onClick={onShareWhatsApp}
              className="flex-1 flex justify-center items-center gap-2 py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm shadow-md"
            >
              <MessageCircle size={18} />
              WhatsApp
            </button>
          </div>
        )}

        {/* Printer Settings Tip */}
        {showTip && (
          <div className="mb-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-800 dark:text-amber-400 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
            <p className="font-bold flex items-center gap-1.5 text-sm mb-1">
              <Info size={14} /> Penting: Pengaturan Browser
            </p>
            {isThermal ? (
              <>
                <p>• <b>Margins:</b> Pilih <b>"None"</b> atau <b>"Minimum"</b> agar struk tidak terpotong.</p>
                <p>• <b>Scale:</b> Pilih <b>"100%"</b> (jangan "Fit to page").</p>
                <p>• <b>Headers & Footers:</b> Pastikan <b>Dimatikan</b> agar tanggal/URL tidak ikut tercetak.</p>
                <p className="mt-2 text-[10px] opacity-80 italic">* Pengaturan ini muncul setelah Anda menekan tombol "Cetak" di atas.</p>
              </>
            ) : (
              <>
                <p>• <b>Paper Size:</b> Pastikan memilih <b>A4</b>.</p>
                <p>• <b>Margins:</b> Disarankan pilih <b>Default</b>.</p>
              </>
            )}
          </div>
        )}

        {/* Format selector */}
        <div className="flex gap-2">
          {FORMAT_OPTIONS.map(opt => {
            const isActive = format === opt.value;
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => setFormat(opt.value)}
                className={`flex-1 flex items-center gap-2.5 px-3 py-2 rounded-xl border-2 transition-all text-left ${
                  isActive
                    ? `${opt.color} border-current shadow-sm scale-[1.02]`
                    : "border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800"
                }`}
              >
                <Icon size={18} className={isActive ? "" : "opacity-50"} />
                <div className="min-w-0">
                  <p className={`text-xs font-bold leading-tight ${isActive ? "" : "text-gray-700 dark:text-gray-300"}`}>{opt.label}</p>
                  <p className="text-[10px] opacity-70">{opt.desc}</p>
                </div>
                {isActive && (
                  <Monitor size={12} className="ml-auto shrink-0 opacity-60" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Full-screen print page wrapper using React Portal.
 * Renders at document.body level to escape the admin layout stacking context,
 * ensuring the print page covers the ENTIRE viewport (no sidebar/topbar).
 */
export function PrintPageWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Prevent body scroll when overlay is active
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-white dark:bg-zinc-900 overflow-y-auto">
      {children}
    </div>,
    document.body
  );
}

/** Reusable thermal separator line */
export function ThermalSep({ char = "-", className = "" }: { char?: string; className?: string }) {
  return (
    <div className={`text-center text-xs font-mono text-gray-400 overflow-hidden leading-none select-none my-1 ${className}`}>
      {char.repeat(48)}
    </div>
  );
}

/** Reusable thermal double separator */
export function ThermalDoubleSep({ className = "" }: { className?: string }) {
  return (
    <div className={`text-center text-xs font-mono text-gray-500 overflow-hidden leading-none select-none my-1.5 ${className}`}>
      {"=".repeat(48)}
    </div>
  );
}

/** Thermal row: label left, value right */
export function ThermalRow({
  label,
  value,
  bold = false,
  className = "",
}: {
  label: string;
  value: string;
  bold?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex justify-between gap-2 text-xs leading-relaxed ${bold ? "font-bold" : ""} ${className}`}>
      <span className="truncate">{label}</span>
      <span className="text-right shrink-0 font-mono">{value}</span>
    </div>
  );
}
