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
    <div className="min-h-screen bg-zinc-950 pb-20 print:bg-white print:pb-0">
      {/* Header Info */}
      <div className="bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 px-6 py-4 sticky top-0 z-50 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="font-bold text-white leading-tight">Digital Receipt</h2>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Terverifikasi Sah</p>
          </div>
        </div>
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all">
            <Printer size={16} /> Print
        </button>
      </div>

      <div className="max-w-2xl mx-auto p-4 sm:p-8 mt-4 print:p-0 print:mt-0 print:max-w-full">
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2rem] shadow-2xl overflow-hidden print:shadow-none print:rounded-none"
        >
          {/* Header Gradient */}
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 p-8 text-white relative overflow-hidden print:bg-transparent print:text-black print:p-4 print:border-b-2 print:border-black">
             <div className="absolute top-0 right-0 p-8 opacity-10 print:hidden">
                <FileText size={120} />
             </div>
             
             <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start gap-6">
                 <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight">{getBengkelField(bengkel, "nama")}</h1>
                    <p className="text-sm text-zinc-400 print:text-zinc-600 mt-2 font-medium">{getBengkelField(bengkel, "alamat")}</p>
                    <p className="text-sm text-zinc-400 print:text-zinc-600 mt-1 font-medium">{getBengkelField(bengkel, "telepon")}</p>
                 </div>
                 <div className="text-left sm:text-right">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-1">INVOICE</p>
                    <p className="text-xl font-mono font-black">{data.noInvoice}</p>
                    <div className="mt-3 inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-white backdrop-blur-md print:border print:border-black print:text-black">
                        Status: {data.status.replace("_", " ")}
                    </div>
                 </div>
             </div>
          </div>

          <div className="p-8 space-y-8 print:p-4 print:space-y-6">
             {/* Info Grid */}
             <div className="grid grid-cols-2 gap-6 p-6 bg-zinc-50 rounded-3xl border border-zinc-100 print:p-0 print:border-none print:bg-transparent">
                <div>
                    <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-2">Detail Kustomer</p>
                    <p className="font-black text-zinc-900 text-lg">{data.spk?.pelanggan?.name}</p>
                    <p className="text-sm font-medium text-zinc-600 mt-1">{data.spk?.pelanggan?.phone}</p>
                </div>
                <div>
                    <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-2">Kendaraan</p>
                    <p className="font-black text-zinc-900 text-lg">{data.spk?.kendaraan?.plat || "-"}</p>
                    <p className="text-sm font-medium text-zinc-600 mt-1">Ref WO: <span className="font-mono">{data.spk?.noWo}</span></p>
                </div>
             </div>

             {/* Items Table */}
             <div>
                 <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-widest mb-4 border-b border-zinc-100 pb-3">Rincian Item & Jasa</h3>
                 <div className="space-y-4">
                     {data.spk?.items?.map((item: any, i: number) => (
                         <div key={`item-${i}`} className="flex justify-between items-start gap-4">
                             <div>
                                 <p className="font-bold text-zinc-900">{item.nama}</p>
                                 <p className="text-xs text-zinc-500 font-medium">{item.qty}x @ {formatRupiah(item.hargaSatuan || 0)}</p>
                             </div>
                             <p className="font-mono font-bold text-zinc-900">{formatRupiah(item.subtotal)}</p>
                         </div>
                     ))}
                     {data.spk?.stages?.map((stage: any, i: number) => (
                         <div key={`stage-${i}`} className="flex justify-between items-start gap-4">
                             <div>
                                 <p className="font-bold text-zinc-900">Tahap: {stage.nama}</p>
                             </div>
                             <p className="font-mono font-bold text-zinc-900">{formatRupiah(stage.estimasiBiaya)}</p>
                         </div>
                     ))}
                     
                     {(!data.spk?.items?.length && !data.spk?.stages?.length) && (
                         <p className="text-center text-sm text-zinc-500 italic py-4">Tidak ada item tercatat</p>
                     )}
                 </div>
             </div>

             <div className="border-t-2 border-dashed border-zinc-200 pt-6">
                <div className="flex justify-between items-center mb-2">
                    <p className="font-bold text-zinc-600 uppercase text-xs tracking-wider">Total Tagihan</p>
                    <p className="text-2xl font-black font-mono text-zinc-900">{formatRupiah(data.totalTagihan)}</p>
                </div>
                {Number(data.sisaBayar) > 0 && (
                    <div className="flex justify-between items-center text-red-600 bg-red-50 p-4 rounded-2xl print:bg-transparent print:p-0 mt-4 border border-red-100">
                        <p className="font-bold uppercase text-xs tracking-wider">Sisa Hutang</p>
                        <p className="text-xl font-black font-mono">{formatRupiah(data.sisaBayar)}</p>
                    </div>
                )}
             </div>

             {/* Payment History (Informative Part) */}
             {data.detail && data.detail.length > 0 && (
                 <div className="mt-8 pt-8 border-t border-zinc-100">
                     <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-widest mb-4">Riwayat Pembayaran</h3>
                     <div className="space-y-3">
                         {data.detail.map((d: any, i: number) => (
                             <div key={`pay-${i}`} className="flex justify-between items-center bg-emerald-50 p-4 rounded-2xl border border-emerald-100 print:border-none print:p-1 print:bg-transparent">
                                 <div>
                                     <p className="font-bold text-emerald-800 text-sm">Cicilan / Bayar</p>
                                     <p className="text-[10px] text-emerald-600 uppercase font-bold mt-1 tracking-wider">
                                        {new Date(d.tanggal || d.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })} • {d.metode}
                                     </p>
                                 </div>
                                 <p className="font-mono font-black text-emerald-700 text-lg">+{formatRupiah(d.jumlah)}</p>
                             </div>
                         ))}
                     </div>
                 </div>
             )}

             <div className="pt-10 text-center text-xs text-zinc-400">
                <div className="w-16 h-1 bg-zinc-200 mx-auto rounded-full mb-6 print:hidden" />
                <p className="font-medium">Dokumen ini diterbitkan secara elektronik dan sah.</p>
                <p className="mt-1">Terima kasih atas kepercayaannya menggunakan jasa {getBengkelField(bengkel, "nama")}.</p>
             </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
