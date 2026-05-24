"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bluetooth, Plus, Check, Loader2, Printer, Info } from "lucide-react";
import { bluetoothHelper } from "@/lib/bluetoothHelper";

interface PrinterSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (device: any) => void;
}

export function PrinterSelectModal({ isOpen, onClose, onSelect }: PrinterSelectModalProps) {
  const [authorizedDevices, setAuthorizedDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDevices();
    }
  }, [isOpen]);

  const loadDevices = async () => {
    setLoading(true);
    const devices = await bluetoothHelper.getAuthorizedDevices();
    setAuthorizedDevices(devices);
    setLoading(false);
  };

  const handleRequestNew = async () => {
    try {
      setScanning(true);
      const device = await bluetoothHelper.requestPrinter();
      setScanning(false);
      
      if (device) {
        // Beri jeda sedikit agar browser sempat mendaftarkan perangkat baru
        await new Promise(resolve => setTimeout(resolve, 500));
        await loadDevices(); 
        onSelect(device);
        onClose();
      }
    } catch (err: any) {
      setScanning(false);
      if (err.name !== 'NotFoundError' && !err.message.includes('User cancelled')) {
        console.error(err);
      }
    }
  };

  const currentDefaultId = bluetoothHelper.getDefaultPrinterId();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden border border-white/20 dark:border-zinc-800"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/10 rounded-2xl">
                <Bluetooth className="text-blue-500" size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">Printer Bluetooth</h2>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Pilih perangkat aktif</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-xl transition-colors text-gray-400"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-gray-400">
                <Loader2 size={32} className="animate-spin text-blue-500" />
                <p className="text-sm font-medium">Mencari printer tersimpan...</p>
              </div>
            ) : authorizedDevices.length > 0 ? (
              <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {authorizedDevices.map((device) => {
                  const isDefault = device.id === currentDefaultId;
                  return (
                    <motion.button
                      key={device.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onSelect(device);
                        onClose();
                      }}
                      className={`w-full group flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                        isDefault
                          ? "bg-blue-500/5 border-blue-500/30 dark:border-blue-500/20 shadow-sm"
                          : "bg-gray-50/50 dark:bg-zinc-800/30 border-transparent hover:border-gray-200 dark:hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center gap-4 text-left">
                        <div className={`p-3 rounded-xl ${isDefault ? "bg-blue-500 text-white" : "bg-white dark:bg-zinc-700 text-gray-400 shadow-sm"}`}>
                          <Printer size={20} className={device.isOffline ? "opacity-40" : ""} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                             <p className={`text-sm font-bold ${device.isOffline ? "text-gray-400" : "text-gray-900 dark:text-zinc-100"}`}>
                              {device.name || "Bluetooth Printer"}
                            </p>
                            {device.isOffline && (
                              <span className="px-1.5 py-0.5 rounded-md bg-gray-200 dark:bg-zinc-800 text-[8px] font-bold text-gray-500">OFFLINE</span>
                            )}
                          </div>
                          <p className="text-[10px] font-mono text-gray-400 truncate max-w-[150px]">{device.id}</p>
                        </div>
                      </div>
                      {isDefault ? (
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
                          <Check size={16} strokeWidth={3} />
                        </div>
                      ) : (
                        <div className="text-[10px] font-bold text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          {device.isOffline ? "SAMBUNGKAN" : "GUNAKAN"}
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center space-y-3 mb-4">
                <div className="w-16 h-16 bg-gray-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-gray-300">
                  <Bluetooth size={32} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-gray-700 dark:text-zinc-300">Belum ada printer</p>
                  <p className="text-xs text-gray-400 px-8">Anda perlu memasangkan printer baru untuk pertama kali.</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleRequestNew}
                disabled={scanning}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-black font-bold text-sm shadow-xl hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-50"
              >
                {scanning ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Plus size={18} />
                )}
                {scanning ? "Memindai..." : "Tambah Printer Baru"}
              </button>
              
              <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex gap-3">
                <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-relaxed font-medium">
                  Gunakan browser <b>Chrome</b> atau <b>Edge</b> versi terbaru untuk koneksi Bluetooth yang stabil.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
