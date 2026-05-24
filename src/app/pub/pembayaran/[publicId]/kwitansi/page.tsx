"use client";

import { useState, useEffect, use } from "react";
import { Lock, Loader2, AlertCircle, ShieldCheck, Printer, FileText } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import { ThermalSep, ThermalDoubleSep, ThermalRow } from "@/components/print/PrintToolbar";
import { motion, AnimatePresence } from "framer-motion";

interface BengkelProfile {
  nama_bengkel?: string;
  NAMA_BENGKEL?: string;
  tagline?: string;
  TAGLINE?: string;
  alamat?: string;
  ALAMAT?: string;
  telepon?: string;
  NO_TELEPON?: string;
}

function getBengkelField(b: BengkelProfile, field: "nama" | "tagline" | "alamat" | "telepon"): string {
  switch (field) {
    case "nama": return b.nama_bengkel || b.NAMA_BENGKEL || "BENGKEL";
    case "tagline": return b.tagline || b.TAGLINE || "";
    case "alamat": return b.alamat || b.ALAMAT || "";
    case "telepon": return b.telepon || b.NO_TELEPON || "";
  }
}

export default function PublicKwitansiPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = use(params);
  const [pin, setPin] = useState("");
  const [data, setData] = useState<any>(null);
  const [bengkel, setBengkel] = useState<BengkelProfile>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isVerified, setIsVerified] = useState(false);

  // Load bengkel profile once
  useEffect(() => {
    fetch("/api/v1/settings/pub/profile") 
      .then(res => res.json())
      .then(json => setBengkel(json.data || {}))
      .catch(() => {});
  }, []);

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pin.length < 4) return;

    setLoading(true);
    setError("");

    try {
      // FE fetch ke endpoint baru yang query by publicId
      const res = await fetch(`/api/v1/pembayaran/pub/${publicId}?pin=${pin}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memverifikasi PIN");
      }

      setData(json.data);
      setIsVerified(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 p-8 rounded-[2.5rem] shadow-2xl text-center space-y-8">
            <div className="mx-auto w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center text-blue-500 shadow-inner">
              <Lock size={36} />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">Kwitansi Digital</h1>
              <p className="text-zinc-500 text-sm">Masukkan 4 digit terakhir nomor HP Anda untuk mengakses invoice ini.</p>
            </div>

            <form onSubmit={handleVerify} className="space-y-6">
              <div className="relative">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••"
                  autoFocus
                  className="w-full bg-zinc-800/50 border-2 border-zinc-700 rounded-2xl py-5 text-center text-3xl font-black tracking-[1em] text-white focus:border-blue-500 focus:outline-none transition-all placeholder:text-zinc-700"
                />
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 justify-center text-red-400 text-sm font-medium"
                >
                  <AlertCircle size={16} /> {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading || pin.length < 4}
                className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold text-lg transition-all active:scale-[0.98] shadow-lg shadow-blue-500/20 flex items-center justify-center gap-3"
              >
                {loading ? <Loader2 size={24} className="animate-spin" /> : <ShieldCheck size={24} />}
                {loading ? "Memverifikasi..." : "Akses Kwitansi"}
              </button>
            </form>
            
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Moro Motor Tracing • Secure Gateway</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // If verified, show receipt
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-20">
      {/* Header Info */}
      <div className="bg-white dark:bg-zinc-900 border-b dark:border-zinc-800 px-6 py-4 sticky top-0 z-50 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="font-bold text-zinc-900 dark:text-white leading-tight">Terverifikasi</h2>
            <p className="text-[10px] text-zinc-500 uppercase tracking-tighter font-bold">Kwitansi Digital Sah</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="p-2 text-zinc-500 hover:text-blue-500 transition-colors">
                <Printer size={20} />
            </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 sm:p-8 space-y-8">
        <div className="bg-white dark:bg-white p-8 sm:p-12 shadow-xl rounded-xl text-black">
             <div className="text-center border-b-2 border-zinc-200 pb-4 mb-6">
                <h1 className="text-xl font-black uppercase text-black">{getBengkelField(bengkel, "nama")}</h1>
                <p className="text-[10px] uppercase text-zinc-500">{getBengkelField(bengkel, "tagline")}</p>
                <p className="text-[10px] text-zinc-400 mt-1">{getBengkelField(bengkel, "alamat")}</p>
             </div>

             <div className="text-center mb-8">
                <h2 className="text-sm font-bold uppercase border-y py-1 border-dotted border-zinc-300">INVOICE / KWITANSI</h2>
                <p className="text-xs font-mono mt-1">{data.noInvoice}</p>
             </div>

             <div className="grid grid-cols-2 gap-4 text-[11px] mb-8">
                <div className="space-y-1">
                    <p><span className="text-zinc-500">Tgl:</span> {new Date(data.createdAt).toLocaleDateString("id-ID")}</p>
                    <p><span className="text-zinc-500">Ref:</span> {data.spk?.noSpk}</p>
                    <p className="font-bold text-emerald-600 uppercase italic">Status: {data.status}</p>
                </div>
                <div className="space-y-1">
                    <p><span className="text-zinc-500">Kustomer:</span> {data.spk?.pelanggan?.name}</p>
                    <p><span className="text-zinc-500">Kendaraan:</span> {data.spk?.kendaraan?.plat}</p>
                </div>
             </div>

             <table className="w-full text-xs">
                <thead>
                    <tr className="border-b-2 border-black">
                        <th className="py-2 text-left">ITEM</th>
                        <th className="py-2 text-right">TOTAL</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {data.spk?.items?.map((item: any, i: number) => (
                        <tr key={i}>
                            <td className="py-2">
                                <p className="font-medium">{item.nama}</p>
                                <p className="text-[10px] text-zinc-400">Qty: {item.qty}</p>
                            </td>
                            <td className="py-2 text-right font-mono font-bold">{formatRupiah(item.subtotal)}</td>
                        </tr>
                    ))}
                    {data.spk?.stages?.map((stage: any, i: number) => (
                        <tr key={i}>
                            <td className="py-2 font-medium">Tahap: {stage.nama}</td>
                            <td className="py-2 text-right font-mono font-bold">{formatRupiah(stage.estimasiBiaya)}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot className="border-t-2 border-black font-bold text-sm">
                    <tr>
                        <td className="py-3 pr-4 uppercase text-right">Total Tagihan</td>
                        <td className="py-3 text-right font-mono">{formatRupiah(data.totalTagihan)}</td>
                    </tr>
                    <tr>
                        <td className="py-1 pr-4 uppercase text-right text-emerald-600">Terbayar</td>
                        <td className="py-1 text-right font-mono text-emerald-600">{formatRupiah(data.totalBayar)}</td>
                    </tr>
                    {Number(data.sisaBayar) > 0 && (
                        <tr>
                            <td className="py-1 pr-4 uppercase text-right text-red-600">Sisa</td>
                            <td className="py-1 text-right font-mono text-red-600">{formatRupiah(data.sisaBayar)}</td>
                        </tr>
                    )}
                </tfoot>
             </table>

             <div className="mt-12 text-center text-[10px] text-zinc-400 space-y-1">
                <p>Simpan digital ini sebagai bukti garansi.</p>
                <p>Terima kasih atas kepercayaannya.</p>
             </div>
        </div>

        <div className="flex items-center justify-center gap-4 text-zinc-500">
            <div className="w-10 h-[1px] bg-zinc-300 dark:bg-zinc-800" />
            <p className="text-[10px] uppercase font-bold tracking-widest">Akhir Dokumen</p>
            <div className="w-10 h-[1px] bg-zinc-300 dark:bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}
