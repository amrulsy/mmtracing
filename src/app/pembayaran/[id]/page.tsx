"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import Link from "next/link";
import { ArrowLeft, Download, Printer, CreditCard, CheckCircle, Clock, Receipt, Banknote, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { formatRupiah, formatCurrencyDisplay, parseCurrencyInput } from "@/lib/utils";
import type { Pembayaran, SpkItem, SpkStage, PembayaranDetail } from "@/lib/types";
import { useRole } from "@/hooks/useRole";

export default function PembayaranDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const router = useRouter();
  const { canDestructive } = useRole();
  const [invoice, setInvoice] = useState<Pembayaran | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Payment Form
  const [jumlahBayar, setJumlahBayar] = useState("");
  const [metode, setMetode] = useState("Cash");
  const [processing, setProcessing] = useState(false);
  const [refunding, setRefunding] = useState(false);

  const fetchInvoice = useCallback(() => {
    setLoading(true);
    api.get<Pembayaran>(`/pembayaran/${id}`)
      .then(res => {
        setInvoice(res.data);
        setJumlahBayar(res.data.sisaBayar?.toString() || "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const handleBayar = async () => {
    if (!invoice) return;
    const numBayar = Number(jumlahBayar.replace(/\D/g, ""));
    if (numBayar <= 0) {
      toast.warning("Nominal Tidak Valid", "Jumlah bayar harus lebih dari 0");
      return;
    }

    const sisa = invoice.sisaBayar ?? 0;
    const bayarPokok = Math.min(numBayar, sisa);
    const kembalian = numBayar > sisa ? numBayar - sisa : 0;

    setProcessing(true);
    try {
      await api.post(`/pembayaran/${invoice.id}/bayar`, {
        jumlah: bayarPokok,
        metode: metode.toLowerCase(),
      });
      toast.success('Pembayaran Berhasil', `Pembayaran berhasil dicatat. ${kembalian > 0 ? "Kembalian: " + formatRupiah(kembalian) : ""}`);
      fetchInvoice(); // Reload
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal memproses pembayaran");
    } finally {
      setProcessing(false);
    }
  };

  const handleRefund = async () => {
    if (!invoice) return;
    toast.confirm(
      `Batalkan status LUNAS untuk ${invoice.noInvoice}?\nSemua histori pembayaran, garansi, dan poin loyalitas terkait SPK ini akan dihapus.\n\nAksi ini tidak bisa diurungkan!`,
      async () => {
        setRefunding(true);
        try {
          await api.post(`/pembayaran/${invoice.id}/refund`, {});
          toast.success('Refund berhasil', 'Invoice berhasil di-refund. Garansi dan poin terkait telah dihapus.');
          fetchInvoice();
        } catch (err: unknown) {
          toast.error('Gagal melakukan refund', err instanceof Error ? err.message : '');
        } finally {
          setRefunding(false);
        }
      }
    );
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground w-8 h-8" /></div>;
  }

  if (!invoice) {
    return <div className="text-center py-20 text-muted-foreground">Invoice tidak ditemukan.</div>;
  }

  const formatDate = (d: string) => new Date(d).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const numBayar = parseCurrencyInput(jumlahBayar);
  const sisaVal = invoice.sisaBayar ?? 0;
  const kembalianLive = numBayar > sisaVal ? numBayar - sisaVal : 0;

  const statusStyle = (s: string) => {
    switch (s.toLowerCase()) {
      case "lunas": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "parsial": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      default: return "bg-rose-500/10 text-rose-600 border-rose-500/20";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/pembayaran" className="p-2 hover:bg-surface-hover rounded-xl border border-surface-border glass transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              {invoice.noInvoice}
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${statusStyle(invoice.status)}`}>
                {invoice.status.replace("_", " ")}
              </span>
            </h1>
            <p className="text-muted-foreground text-sm">{invoice.spk?.noSpk} — {invoice.spk?.pelanggan?.name || "Pelanggan Tanpa Nama"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {invoice.status === "lunas" && (
            <Link href={`/pembayaran/${invoice.id}/kwitansi`} className="flex items-center gap-2 text-sm bg-surface border border-surface-border px-3 py-2 rounded-xl hover:bg-surface-hover font-medium transition-colors">
              <Printer size={16} /> Cetak Kwitansi
            </Link>
          )}
          <button onClick={() => window.print()} className="flex items-center gap-2 text-sm bg-surface border border-surface-border px-3 py-2 rounded-xl hover:bg-surface-hover font-medium transition-colors">
            <Download size={16} /> Cetak / PDF
          </button>
          {/* GAP-4: Tombol Batalkan Lunas — hanya admin/owner */}
          {invoice.status === "lunas" && canDestructive && (
            <button
              onClick={handleRefund}
              disabled={refunding}
              className="flex items-center gap-2 text-sm bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-2 rounded-xl hover:bg-red-500/20 font-medium transition-colors disabled:opacity-50"
            >
              {refunding ? <Loader2 size={16} className="animate-spin" /> : <Banknote size={16} />}
              {refunding ? 'Memproses...' : 'Batalkan Lunas'}
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* LEFT: Invoice Detail */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Breakdown */}
          <div className="glass-panel overflow-hidden">
            <div className="p-6 border-b border-surface-border bg-surface-hover/20">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold">Rincian Tagihan</h3>
                  <p className="text-xs text-muted-foreground mt-1 capitalize">Mode: {invoice.spk?.mode} {invoice.spk?.kendaraan?.name ? `— ${invoice.spk.kendaraan.name} (${invoice.spk.kendaraan.plat})` : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Tgl Terbit</p>
                  <p className="text-sm font-semibold">{formatDate(invoice.createdAt)}</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase bg-surface-hover/50">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">Tipe/Item</th>
                    <th className="px-6 py-3 text-center font-semibold">Qty</th>
                    <th className="px-6 py-3 text-right font-semibold">Harga</th>
                    <th className="px-6 py-3 text-right font-semibold">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {invoice.spk?.items && invoice.spk.items.map((item: SpkItem, i: number) => (
                    <tr key={`item-${i}`} className="bg-surface hover:bg-surface-hover/30 transition-colors">
                      <td className="px-6 py-3 font-medium">{item.nama}</td>
                      <td className="px-6 py-3 text-center text-muted-foreground">{item.qty} {item.type === 'sparepart' ? 'pcs' : 'x'}</td>
                      <td className="px-6 py-3 text-right font-mono text-muted-foreground">{formatRupiah(item.hargaSatuan)}</td>
                      <td className="px-6 py-3 text-right font-mono font-medium">{formatRupiah(item.subtotal)}</td>
                    </tr>
                  ))}
                  {invoice.spk?.stages && invoice.spk.stages.map((stage: SpkStage, i: number) => (
                    <tr key={`stage-${i}`} className="bg-surface hover:bg-surface-hover/30 transition-colors">
                      <td className="px-6 py-3 font-medium">Tahap {stage.urutan}: {stage.nama}</td>
                      <td className="px-6 py-3 text-center text-muted-foreground">1 tahap</td>
                      <td className="px-6 py-3 text-right font-mono text-muted-foreground">{formatRupiah(stage.estimasiBiaya)}</td>
                      <td className="px-6 py-3 text-right font-mono font-medium">{formatRupiah(stage.estimasiBiaya)}</td>
                    </tr>
                  ))}
                  {(!invoice.spk?.items?.length && !invoice.spk?.stages?.length) && (
                    <tr><td colSpan={4} className="px-6 py-6 text-center text-muted-foreground">SPK Belum/Tidak Memiliki Detail Pekerjaan</td></tr>
                  )}
                </tbody>
                <tfoot className="border-t-2 border-surface-border">
                  <tr className="bg-surface-hover/30">
                    <td colSpan={3} className="px-6 py-3 text-right font-bold">Total</td>
                    <td className="px-6 py-3 text-right font-bold text-lg text-primary font-mono">{formatRupiah(invoice.totalTagihan)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Riwayat Pembayaran Aktif */}
          <div className="glass-panel p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <Receipt size={16} className="text-primary" /> Histori Transaksi Pembayaran
            </h3>
            <div className="relative">
              {invoice.detail && invoice.detail.length > 0 ? (
                <>
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-surface-border"></div>
                  {invoice.detail.map((p: PembayaranDetail, i: number) => (
                    <div key={i} className="flex gap-6 mb-4 last:mb-0 relative">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center z-10 shrink-0">
                        <CheckCircle size={14} />
                      </div>
                      <div className="flex-1 glass p-4 rounded-xl">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                          <span className="font-semibold text-sm capitalize">{p.metode}</span>
                          <span className="font-bold text-emerald-600 font-mono">{formatRupiah(p.jumlah)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDate(p.tanggal)} {p.keterangan ? `• Ref: ${p.keterangan}` : ''}</p>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="flex gap-6 relative">
                  <div className="w-8 h-8 rounded-full bg-surface-border text-muted-foreground flex items-center justify-center z-10 shrink-0 border-2 border-dashed border-surface-border">
                    <Clock size={14} />
                  </div>
                  <div className="flex-1 border-2 border-dashed border-surface-border p-4 rounded-xl bg-surface-hover/10">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-muted-foreground">Menunggu Pembayaran</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Belum ada transaksi dana masuk.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Sidebar Summary */}
        <div className="space-y-6">
          <div className="glass-panel p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Ringkasan</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Total Tagihan</span><span className="font-bold font-mono">{formatRupiah(invoice.totalTagihan)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Telah Dibayar</span><span className="font-mono text-emerald-600">{formatRupiah(invoice.totalBayar)}</span></div>
              <div className="pt-3 border-t border-surface-border flex justify-between">
                <span className={`font-bold ${invoice.status === 'lunas' ? 'text-emerald-500' : 'text-amber-600'}`}>Sisa Tagihan</span>
                <span className={`font-bold text-lg font-mono ${invoice.status === 'lunas' ? 'text-emerald-500' : 'text-amber-600'}`}>{formatRupiah(invoice.sisaBayar || 0)}</span>
              </div>
            </div>
          </div>

          {/* Proses Bayar (Hanya jika belum lunas) */}
          {invoice.status !== "lunas" ? (
            <div className="glass-panel p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Proses Bayar Single-Invoice</h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Jumlah Terima</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">Rp</span>
                    <input type="text" value={formatCurrencyDisplay(jumlahBayar)} onChange={e => {
                      const val = e.target.value.replace(/\D/g, "");
                      setJumlahBayar(val);
                    }} className="w-full bg-surface border border-surface-border rounded-xl pl-10 pr-3 py-2.5 text-sm text-right font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>
                {/* Quick amount buttons */}
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => setJumlahBayar(sisaVal.toString())} className="px-2 py-1 text-[10px] font-bold rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20">Uang Pas</button>
                  {[50000, 100000, 200000, 500000].map(amt => (
                    <button key={amt} onClick={() => setJumlahBayar(amt.toString())} className="px-2 py-1 text-[10px] font-medium rounded-lg border border-surface-border hover:bg-surface-hover">
                      {formatRupiah(amt, "compact")}
                    </button>
                  ))}
                </div>
                {/* Live kembalian */}
                <div className={`flex justify-between items-center p-2.5 rounded-xl border transition-colors ${kembalianLive > 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-surface border-surface-border"}`}>
                  <span className="text-xs text-muted-foreground">Kembalian</span>
                  <span className={`text-sm font-bold font-mono ${kembalianLive > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>{formatRupiah(kembalianLive)}</span>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Metode Pembayaran</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["Cash", "Transfer", "QRIS", "e-Wallet"].map((m, i) => (
                      <button key={i} onClick={() => setMetode(m)} className={`text-xs py-2 rounded-lg border font-medium transition-colors ${metode === m ? "bg-primary/10 text-primary border-primary/30 shadow-sm" : "border-surface-border text-muted-foreground hover:bg-surface-hover"}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={handleBayar} disabled={processing} className="w-full btn-glossy bg-primary text-primary-foreground py-3 rounded-xl font-bold shadow-glossy-primary hover:shadow-glossy-primary-dark transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50">
                  {processing ? <Loader2 className="animate-spin w-5 h-5" /> : <><CreditCard size={18} /> Konfirmasi Pembayaran</>}
                </button>
                <div className="text-center pt-2">
                  <Link href="/pembayaran/kasir" className="text-[10px] text-muted-foreground hover:text-primary transition-colors hover:underline">Gunakan Sistem Kasir Sentral (Banyak Antrean)?</Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel p-6 bg-emerald-500/5 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mb-4">
                <CheckCircle size={32} />
              </div>
              <h3 className="font-bold text-lg text-emerald-600 mb-1">Invoice Lunas</h3>
              <p className="text-sm text-muted-foreground">Semua tagihan untuk SPK ini telah dilunaskan sepenuhnya.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
