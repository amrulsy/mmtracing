"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CreditCard, Banknote, QrCode, Wallet, Printer, CheckCircle, Search, Loader2, User, Car, Phone, Tag, X } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { useSSE } from "@/hooks/useSSE";
import { formatRupiah, formatCurrencyDisplay, parseCurrencyInput } from "@/lib/utils";
import type { Pembayaran, SpkItem, SpkStage } from "@/lib/types";

const QUICK_AMOUNTS = [50_000, 100_000, 200_000, 500_000, 1_000_000];
const METODE_LIST = [
  { icon: Banknote, label: "Cash", key: "1" },
  { icon: CreditCard, label: "Transfer", key: "2" },
  { icon: QrCode, label: "QRIS", key: "3" },
  { icon: Wallet, label: "E-Wallet", key: "4" },
];

export default function KasirPage() {
  const [invoices, setInvoices] = useState<Pembayaran[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const searchParams = useSearchParams();
  const urlId = searchParams?.get('id');

  // Payment Form State
  const [jumlahBayar, setJumlahBayar] = useState("");
  const [metode, setMetode] = useState("Cash");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [mobileTab, setMobileTab] = useState<'antrian' | 'bayar'>('antrian');
  const [showSuccessModal, setShowSuccessModal] = useState<{
    jumlah: number; metode: string; kembalian: number; isLunas: boolean; invoiceId: number; noInvoice: string;
  } | null>(null);

  const [showQrisModal, setShowQrisModal] = useState<{ jumlah: number, invoiceId: number } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const executeBayarRef = useRef<() => void>(() => {});

  // Auto-refresh via SSE
  useSSE((event) => {
    if (event.type?.startsWith('spk:') || event.type?.startsWith('pembayaran:')) {
      fetchQueue();
    }
  });

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = () => {
    api.getPaginated<Pembayaran>("/pembayaran", { limit: 50 })
      .then(res => {
        const active = res.data.filter(inv =>
          inv.status !== "lunas" && inv.spk?.status !== "dibatalkan"
        );
        setInvoices(active);
        
        let targetId = selectedId;
        if (urlId && !selectedId) {
          const match = active.find(inv => inv.id.toString() === urlId);
          if (match) {
            targetId = match.id;
            // auto select on mobile too
            setTimeout(() => setMobileTab('bayar'), 100); 
          }
        }
        
        if (active.length > 0 && !targetId) {
          targetId = active[0].id;
        }
        setSelectedId(targetId);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const selected = invoices.find(inv => inv.id === selectedId);

  useEffect(() => {
    if (selected) {
      if ((selected.spk?.mode === 'modifikasi' || selected.spk?.mode === 'bubut') && Number(selected.totalBayar) === 0 && (selected.spk?.minimumDp ?? 0) > 0) {
        setJumlahBayar(selected.spk?.minimumDp.toString());
      } else {
        setJumlahBayar(selected.sisaBayar?.toString() || "");
      }
    }
  }, [selectedId, selected?.sisaBayar, selected?.spk]);

  const numBayar = parseCurrencyInput(jumlahBayar);
  const sisa = selected?.sisaBayar ?? 0;
  const kembalian = numBayar > sisa ? numBayar - sisa : 0;

  const filteredInvoices = invoices.filter(inv =>
    inv.noInvoice.toLowerCase().includes(search.toLowerCase()) ||
    (inv.spk?.noSpk ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (inv.spk?.pelanggan?.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (showSuccessModal) {
      if (e.key === "Escape") setShowSuccessModal(null);
      return;
    }
    // Don't capture when typing in search
    const activeEl = document.activeElement;
    const isInput = activeEl?.tagName === "INPUT" || activeEl?.tagName === "TEXTAREA";

    if (e.key === "Enter" && !e.shiftKey && selected && numBayar > 0 && !processing) {
      e.preventDefault();
      if (metode === "QRIS") {
        handleBayarPrep();
      } else {
        executeBayarRef.current();
      }
    }
    if (isInput) return; // Other shortcuts only work outside inputs

    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const currentIdx = filteredInvoices.findIndex(inv => inv.id === selectedId);
      const nextIdx = e.key === "ArrowUp" ? Math.max(0, currentIdx - 1) : Math.min(filteredInvoices.length - 1, currentIdx + 1);
      if (filteredInvoices[nextIdx]) setSelectedId(filteredInvoices[nextIdx].id);
    }
    if (["1", "2", "3", "4"].includes(e.key)) {
      const m = METODE_LIST.find(ml => ml.key === e.key);
      if (m) setMetode(m.label);
    }
    if (e.key === "Escape") {
      setJumlahBayar(selected?.sisaBayar?.toString() || "");
    }
  }, [selected, selectedId, numBayar, processing, filteredInvoices, showSuccessModal]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleBayarPrep = () => {
    if (!selected) return;
    if (numBayar <= 0) {
      toast.warning("Nominal Terlalu Kecil", "Jumlah bayar harus lebih dari 0");
      return;
    }

    const bayarPokok = Math.min(numBayar, Number(sisa));
    if (metode === "QRIS") {
      setShowQrisModal({ jumlah: bayarPokok, invoiceId: selected.id });
      return;
    }

    executeBayar(bayarPokok);
  };

  const executeBayar = async (bayarPokokAmount: number = Math.min(numBayar, Number(sisa))) => {
    if (!selected) return;
    const isLunasAfter = bayarPokokAmount >= sisa;
    const changeAmount = numBayar > sisa ? numBayar - sisa : 0;

    setProcessing(true);
    setShowQrisModal(null); // Tutup QRIS jika ada
    try {
      await api.post(`/pembayaran/${selected.id}/bayar`, {
        jumlah: bayarPokokAmount,
        metode: metode.toLowerCase(),
      });

      // Show success modal
      setShowSuccessModal({
        jumlah: bayarPokokAmount,
        metode,
        kembalian: changeAmount,
        isLunas: isLunasAfter,
        invoiceId: selected.id,
        noInvoice: selected.noInvoice,
      });

      // Refresh antrian
      const res = await api.getPaginated<Pembayaran>("/pembayaran", { limit: 50 });
      const active = res.data.filter(inv =>
        inv.status !== "lunas" && inv.spk?.status !== "dibatalkan"
      );
      setInvoices(active);

      const stillActive = active.find(inv => inv.id === selected.id);
      setSelectedId(stillActive ? stillActive.id : (active[0]?.id ?? null));

      if (!stillActive && isLunasAfter) {
        setMobileTab('antrian');
      }
    } catch (err: unknown) {
      toast.error("Pembayaran Gagal", err instanceof Error ? err.message : "Gagal memproses pembayaran");
    } finally {
      setProcessing(false);
    }
  };
  executeBayarRef.current = executeBayar;

  const handleCurrencyInput = (raw: string) => {
    const num = raw.replace(/\D/g, "");
    setJumlahBayar(num);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex items-center gap-4">
        <Link href="/app/pembayaran" className="p-2 hover:bg-surface-hover rounded-xl border border-surface-border glass transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kasir / POS</h1>
          <p className="text-muted-foreground text-sm">Proses pembayaran cepat untuk SPK yang antri bayar. <span className="hidden sm:inline text-[10px] text-muted-foreground/60">Shortcut: ↑↓ navigasi • 1-4 metode • Enter bayar • Esc reset</span></p>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex gap-2 lg:hidden">
        <button
          onClick={() => setMobileTab('antrian')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${mobileTab === 'antrian' ? 'bg-primary text-white shadow-glossy-primary' : 'bg-surface border border-surface-border'}`}
        >
          Antrian ({filteredInvoices.length})
        </button>
        <button
          onClick={() => setMobileTab('bayar')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${mobileTab === 'bayar' ? 'bg-primary text-white shadow-glossy-primary' : 'bg-surface border border-surface-border'}`}
        >
          {selected ? 'Proses Bayar' : 'Pilih Invoice'}
        </button>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* LEFT: Antrian Bayar */}
        <div className={`lg:col-span-2 glass-panel flex flex-col lg:h-[calc(100vh-14rem)] ${mobileTab !== 'antrian' ? 'hidden lg:flex' : ''}`}>
          <div className="p-4 border-b border-surface-border">
            <div className="flex items-center gap-2 bg-surface-hover px-3 py-2 rounded-lg border border-surface-border focus-within:ring-1 focus-within:ring-primary transition-all">
              <Search size={18} className="text-muted-foreground" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari No SPK atau Pelanggan..." className="bg-transparent border-none focus:outline-none text-sm w-full" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : filteredInvoices.length === 0 ? (
              search ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm font-medium mb-1">Tidak ditemukan</p>
                  <p className="text-xs text-muted-foreground">Tidak ada invoice yang cocok dengan pencarian &ldquo;{search}&rdquo;</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                    <CheckCircle size={28} className="text-emerald-500" />
                  </div>
                  <p className="text-sm font-medium mb-1">Semua Tagihan Lunas 🎉</p>
                  <p className="text-xs text-muted-foreground mb-4">Tidak ada invoice yang menunggu pembayaran saat ini.</p>
                  <Link href="/app/pembayaran" className="text-xs text-primary font-medium hover:underline">
                    Lihat Riwayat Pembayaran →
                  </Link>
                </div>
              )
            ) : filteredInvoices.map((item) => (
              <div key={item.id} onClick={() => { setSelectedId(item.id); setMobileTab('bayar'); }} className={`p-4 rounded-xl cursor-pointer transition-all ${item.id === selectedId ? "bg-primary/10 border-2 border-primary/30 shadow-glossy-primary scale-[1.01]" : "glass border border-surface-border hover:bg-surface-hover"}`}>
                <div className="flex justify-between items-start mb-1">
                  <span className="font-mono text-xs font-bold text-primary">{item.spk?.noSpk}</span>
                  <div className="flex items-center gap-1.5">
                    {item.spk?.status === "selesai" && (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 flex items-center gap-0.5">
                        <CheckCircle size={8} /> Siap Diambil
                      </span>
                    )}
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${item.spk?.mode === "modifikasi" ? "bg-purple-500/10 text-purple-600" : item.spk?.mode === "bubut" ? "bg-orange-500/10 text-orange-600" : "bg-blue-500/10 text-blue-600"}`}>{item.spk?.mode}</span>
                  </div>
                </div>
                <p className="text-sm font-semibold">{item.spk?.pelanggan?.name}</p>
                <div className="flex justify-between mt-2">
                  <p className="text-xs text-muted-foreground">{item.noInvoice}</p>
                  <p className="text-sm font-bold text-amber-600">Sisa: {formatRupiah(item.sisaBayar, "compact")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Payment Interface */}
        <div className={`lg:col-span-3 space-y-6 ${mobileTab !== 'bayar' ? 'hidden lg:block' : ''}`}>
          {selected ? (
            <>
              {/* #8: Info Pelanggan Lengkap */}
              <div className="glass-panel p-4 flex items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <User size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{selected.spk?.pelanggan?.name || "—"}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground mt-1">
                    {selected.spk?.pelanggan?.phone && (
                      <span className="flex items-center gap-1"><Phone size={10} /> {selected.spk.pelanggan.phone}</span>
                    )}
                    {selected.spk?.kendaraan && (
                      <span className="flex items-center gap-1"><Car size={10} /> {selected.spk.kendaraan.name} ({selected.spk.kendaraan.plat})</span>
                    )}
                    <span className="flex items-center gap-1"><Tag size={10} /> {selected.spk?.mode} {selected.spk?.prioritas !== "normal" ? `• ${selected.spk?.prioritas}` : ""}</span>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ${selected.status === 'belum_bayar' ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'}`}>
                  {selected.status.replace("_", " ").toUpperCase()}
                </span>
              </div>

              {/* Detail Item Rincian */}
              <div className="glass-panel overflow-hidden">
                <div className="p-5 border-b border-surface-border bg-surface-hover/20">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-bold">{selected.spk?.noSpk} — {selected.noInvoice}</h3>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Total Biaya SPK</p>
                      <p className="text-xl font-bold font-mono text-foreground">{formatRupiah(selected.totalTagihan)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-1">Sudah Dibayar</p>
                      <p className="text-lg font-bold font-mono text-emerald-600">{formatRupiah(selected.totalBayar)}</p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground uppercase bg-surface-hover/50 border-b border-surface-border">
                      <tr>
                        <th className="px-6 py-3 text-left font-semibold">Tipe/Item</th>
                        <th className="px-6 py-3 text-center font-semibold">Qty</th>
                        <th className="px-6 py-3 text-right font-semibold">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {selected.spk?.items && selected.spk.items.map((item: SpkItem, i: number) => (
                        <tr key={`item-${i}`} className="bg-surface hover:bg-surface-hover/30">
                          <td className="px-6 py-3 font-medium">{item.nama}</td>
                          <td className="px-6 py-3 text-center text-muted-foreground">{item.qty} {item.type === 'sparepart' ? 'pcs' : 'x'}</td>
                          <td className="px-6 py-3 text-right font-mono">{formatRupiah(item.subtotal)}</td>
                        </tr>
                      ))}
                      {selected.spk?.stages && selected.spk.stages.map((stage: SpkStage, i: number) => (
                        <tr key={`stage-${i}`} className="bg-surface hover:bg-surface-hover/30">
                          <td className="px-6 py-3 font-medium">Tahap {stage.urutan}: {stage.nama}</td>
                          <td className="px-6 py-3 text-center text-muted-foreground">1 tahap</td>
                          <td className="px-6 py-3 text-right font-mono">{formatRupiah(stage.estimasiBiaya)}</td>
                        </tr>
                      ))}
                      {(!selected.spk?.items?.length && !selected.spk?.stages?.length) && (
                        <tr><td colSpan={3} className="px-6 py-6 text-center text-muted-foreground text-xs">SPK ini tidak memiliki rincian Jasa/Tahapan</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Panel */}
              <div className="glass-panel p-6 border-2 border-primary/20 bg-primary/5">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Total */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Sisa Tagihan</p>
                    <p className="text-4xl font-bold text-primary font-mono">{formatRupiah(selected.sisaBayar)}</p>

                    <div className="mt-4 space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Uang Diterima / Nominal Dibayar <span className="text-red-500">*</span></label>
                        {/* #4: Masked money input */}
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">Rp</span>
                          <input
                            ref={inputRef}
                            type="text"
                            value={formatCurrencyDisplay(jumlahBayar)}
                            onChange={e => handleCurrencyInput(e.target.value)}
                            className="w-full bg-background border border-surface-border rounded-xl pl-10 pr-4 py-3 text-lg font-mono font-bold text-right focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                      </div>

                      {/* Quick amount buttons */}
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => setJumlahBayar(sisa.toString())}
                          className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                        >
                          Uang Pas
                        </button>
                        {QUICK_AMOUNTS.map(amt => (
                          <button
                            key={amt}
                            onClick={() => setJumlahBayar(amt.toString())}
                            className="px-2.5 py-1 text-[10px] font-medium rounded-lg border border-surface-border hover:bg-surface-hover transition-colors"
                          >
                            {formatRupiah(amt, "compact")}
                          </button>
                        ))}
                      </div>

                      {/* DP minimum warning */}
                      {(selected.spk?.mode === 'modifikasi' || selected.spk?.mode === 'bubut') && Number(selected.totalBayar) === 0 && Number(selected.spk?.minimumDp) > 0 && (
                        <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                          <span className="text-amber-500 mt-0.5">⚠️</span>
                          <div>
                            <p className="text-xs font-semibold text-amber-700">Minimum DP {selected.spk.mode} (40%)</p>
                            <p className="text-sm font-bold text-amber-600 font-mono">{formatRupiah(selected.spk.minimumDp)}</p>
                            <p className="text-[10px] text-amber-600/80 mt-0.5">SPK baru bisa dikerjakan setelah DP terpenuhi.</p>
                          </div>
                        </div>
                      )}

                      {/* #5: Live kembalian */}
                      <div className={`flex justify-between items-center p-3 rounded-xl border transition-colors ${kembalian > 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-background border-surface-border"}`}>
                        <span className="text-sm text-muted-foreground">Kembalian</span>
                        <span className={`text-xl font-bold font-mono ${kembalian > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>{formatRupiah(kembalian)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Metode Bayar */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">Pilih Metode Pembayaran <span className="text-[10px]">(shortcut 1-4)</span></p>
                    <div className="grid grid-cols-2 gap-3">
                      {METODE_LIST.map((m) => (
                        <button key={m.label} onClick={() => setMetode(m.label)} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 font-medium text-sm transition-all ${
                          metode === m.label
                            ? "border-primary bg-primary/10 text-primary shadow-glossy-primary"
                            : "border-surface-border text-muted-foreground hover:border-primary/30 hover:bg-surface-hover"
                        }`}>
                          <m.icon size={24} />
                          <span>{m.label}</span>
                          <span className="text-[9px] text-muted-foreground/60">{m.key}</span>
                        </button>
                      ))}
                    </div>

                    <button onClick={handleBayarPrep} disabled={processing || numBayar <= 0} className="w-full mt-6 btn-glossy bg-primary text-primary-foreground py-4 rounded-xl font-bold text-lg shadow-glossy-primary hover:shadow-glossy-primary-dark transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                      {processing ? <Loader2 className="animate-spin" /> : <><CheckCircle size={22} /> Proses Pembayaran</>}
                    </button>

                    {/* Shortcut ke Kwitansi jika sisa Rp 0 */}
                    {sisa <= 0 && (
                      <Link
                        href={`/app/pembayaran/${selected.id}/kwitansi`}
                        className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl border border-primary/30 text-primary font-bold hover:bg-primary/5 transition-all text-sm"
                      >
                        <Printer size={18} /> Cetak Kwitansi
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-surface-border rounded-2xl bg-surface/50">
              <Banknote size={48} className="mb-4 opacity-50" />
              <p className="text-sm">Pilih tagihan dari daftar antrian sebelah kiri</p>
              <p className="text-xs mt-1 text-muted-foreground/60">Gunakan ↑↓ untuk navigasi</p>
            </div>
          )}
        </div>
      </div>

      {/* #7: Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-background border border-surface-border rounded-2xl p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-5 ${showSuccessModal.isLunas ? "bg-emerald-500/20" : "bg-blue-500/20"}`}>
              <CheckCircle size={40} className={showSuccessModal.isLunas ? "text-emerald-500" : "text-blue-500"} />
            </div>
            <h3 className="text-xl font-bold mb-1">
              {showSuccessModal.isLunas ? "Invoice Lunas! 🎉" : "Pembayaran Berhasil"}
            </h3>
            <p className="text-sm text-muted-foreground mb-5">{showSuccessModal.noInvoice}</p>

            <div className="space-y-2 text-sm bg-surface rounded-xl p-4 mb-5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dibayar</span>
                <span className="font-bold font-mono">{formatRupiah(showSuccessModal.jumlah)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Metode</span>
                <span className="font-medium">{showSuccessModal.metode}</span>
              </div>
              {showSuccessModal.kembalian > 0 && (
                <div className="flex justify-between pt-2 border-t border-surface-border">
                  <span className="font-bold text-emerald-600">Kembalian</span>
                  <span className="font-bold text-emerald-600 font-mono text-lg">{formatRupiah(showSuccessModal.kembalian)}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {showSuccessModal.isLunas && (
                <Link
                  href={`/app/pembayaran/${showSuccessModal.invoiceId}/kwitansi`}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors"
                >
                  <Printer size={18} /> Cetak Kwitansi
                </Link>
              )}
              <button
                onClick={() => setShowSuccessModal(null)}
                className="w-full py-3 rounded-xl border border-surface-border text-sm font-medium hover:bg-surface-hover transition-colors"
              >
                Kembali ke Antrian
              </button>
            </div>
          </div>
        </div>
      )}

      {/* #8: Modal QRIS Simulasi */}
      {showQrisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-background border border-surface-border rounded-2xl p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold">Scan QRIS</h3>
              <p className="text-sm text-muted-foreground mt-1">Arahkan scan dari bank/e-wallet Anda</p>
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-inner mb-6 mx-auto w-48 h-48 border-2 border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden group">
              <QrCode size={120} className="text-black" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-400/20 to-transparent translate-y-[-100%] animate-[scan_2s_ease-in-out_infinite]" />
            </div>

            <div className="bg-surface rounded-xl p-4 mb-6 text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Bayar</p>
              <p className="text-2xl font-bold font-mono text-primary">{formatRupiah(showQrisModal.jumlah)}</p>
            </div>

            <button 
              onClick={() => executeBayar(showQrisModal.jumlah)}
              disabled={processing}
              className="w-full py-4 rounded-xl font-bold bg-[#E84E1B] text-white hover:bg-[#E84E1B]/90 transition-colors shadow-lg flex items-center justify-center gap-2"
            >
              {processing ? <Loader2 className="animate-spin" /> : "Simulasikan Pembayaran Sukses"}
            </button>
            <button
              onClick={() => setShowQrisModal(null)}
              disabled={processing}
              className="w-full mt-3 py-3 rounded-xl border border-surface-border text-sm font-medium hover:bg-surface-hover transition-colors"
            >
              Batalkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
