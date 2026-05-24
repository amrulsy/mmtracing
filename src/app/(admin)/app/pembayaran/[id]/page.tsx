"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, CheckCircle, Clock, Banknote, CreditCard, Tag, User, Car, Phone, CalendarClock, MessageCircle, AlertTriangle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { formatRupiah } from "@/lib/utils";
import type { Pembayaran, PembayaranDetail } from "@/lib/types";

interface PembayaranWithDetail extends Pembayaran {
  detail: PembayaranDetail[];
}

export default function PembayaranDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<PembayaranWithDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [waLoading, setWaLoading] = useState(false);

  const isLunas = data?.status === "lunas";

  const fetchDetail = () => {
    setLoading(true);
    api.get<PembayaranWithDetail>(`/pembayaran/${id}`)
      .then(res => setData(res.data))
      .catch(err => setError(err.message || "Gagal memuat detail pembayaran"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleRefund = async () => {
    if (!confirm("⚠️ PERINGATAN ⚠️\n\nApakah Anda yakin ingin membatalkan/refund transaksi ini?\nSeluruh riwayat pembayaran, garansi, dan point terkait SPK ini akan direset.")) return;
    
    setProcessing(true);
    try {
      await api.post(`/pembayaran/${id}/refund`, {});
      toast.success("Refund Berhasil", "Tagihan telah direset ke belum bayar.");
      fetchDetail(); // reload
    } catch (err: unknown) {
      toast.error("Refund Gagal", err instanceof Error ? err.message : "Pastikan Anda memiliki akses Admin.");
    } finally {
      setProcessing(false);
    }
  };

  const handleSendWA = async () => {
    const phone = data?.spk?.pelanggan?.phone;
    if (!phone) {
      toast.warning("Gagal", "Nomor HP pelanggan tidak tersedia.");
      return;
    }
    const pin = phone.slice(-4);
    const pubUrl = `${window.location.origin}/pub/pembayaran/${data.publicId}/kwitansi`;
    
    const message = `Halo ${data.spk?.pelanggan?.name || 'Pelanggan'},
    
Berikut adalah link E-Kwitansi / Invoice digital dari Moro Motor Tracing untuk SPK *${data.spk?.noSpk}*:
${pubUrl}

*🔐 PIN Akses:* ${pin}
(Gunakan 4 digit terakhir nomor HP Anda)

Total Transaksi: ${formatRupiah(data.totalTagihan)}
Status: ${isLunas ? 'LUNAS ✅' : 'BELUM LUNAS ❌'}

Terima kasih atas kepercayaannya. Harap simpan e-kwitansi ini sebagai bukti pembayaran dan garansi (jika ada).`;

    setWaLoading(true);
    try {
      await api.post('/whatsapp/test', { phone, message });
      toast.success("Terkirim", "E-Kwitansi sedang dikirim via WhatsApp.");
    } catch (err: unknown) {
      toast.error("Gagal Kirim", err instanceof Error ? err.message : "Pastikan bot WhatsApp aktif dan Anda adalah Admin.");
    } finally {
      setWaLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><span className="animate-spin text-muted-foreground"><Clock size={32} /></span></div>;
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <span className="text-red-500 font-bold">Terjadi Kesalahan</span>
        <p className="text-muted-foreground text-sm">{error || "Data tidak ditemukan"}</p>
        <Link href="/app/pembayaran" className="text-primary hover:underline text-sm font-medium">Kembali ke Daftar</Link>
      </div>
    );
  }

  const sisa = Number(data.sisaBayar);

  const getMethodIcon = (metode: string) => {
    const m = metode.toLowerCase();
    if (m === "cash") return <Banknote size={16} />;
    return <CreditCard size={16} />;
  };

  const statusColor = isLunas ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : data.status === "parsial" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-red-500/10 text-red-600 border-red-500/20";

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/app/pembayaran" className="p-2 hover:bg-surface-hover rounded-xl border border-surface-border glass transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight font-mono">{data.noInvoice}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${statusColor}`}>
                {data.status.replace("_", " ")}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Tercatat pada {new Date(data.createdAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isLunas && (
            <Link href={`/app/pembayaran/kasir?id=${data.id}`} className="flex items-center gap-2 px-4 py-2 font-bold rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors text-sm shadow-sm">
              Bayar Sekarang
            </Link>
          )}
          <Link href={`/app/pembayaran/${data.id}/kwitansi`} className="flex items-center gap-2 px-4 py-2 font-bold rounded-xl border border-surface-border hover:bg-surface-hover transition-colors text-sm">
            <Printer size={16} /> Cetak Kwitansi
          </Link>
          <button onClick={handleSendWA} disabled={waLoading} className="flex items-center gap-2 px-3 py-2 font-bold rounded-xl border border-surface-border bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors text-sm shadow-sm disabled:opacity-50">
            {waLoading ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
            Kirim WA
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="glass-panel p-5 space-y-4 h-fit border-t-4 border-t-primary">
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Total Tagihan</p>
            <p className="text-3xl font-bold font-mono text-foreground">{formatRupiah(data.totalTagihan)}</p>
          </div>
          <div className="pt-4 border-t border-surface-border/50">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Sudah Dibayar</p>
            <p className="text-xl font-bold font-mono text-emerald-600">{formatRupiah(data.totalBayar)}</p>
          </div>
          <div className="pt-4 border-t border-surface-border/50">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Sisa Tagihan</p>
            <p className={`text-xl font-bold font-mono ${sisa > 0 ? "text-amber-600" : "text-muted-foreground"}`}>{formatRupiah(sisa)}</p>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          {/* Info Pelanggan & SPK */}
          <div className="glass-panel p-5 grid sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5"><User size={14} /> Pelanggan</h3>
              <div>
                <p className="font-bold text-base">{data.spk?.pelanggan?.name || "—"}</p>
                {data.spk?.pelanggan?.phone && <p className="text-sm flex items-center gap-1.5 text-muted-foreground mt-1"><Phone size={12} /> {data.spk.pelanggan.phone}</p>}
              </div>
            </div>
            <div className="space-y-3 sm:border-l sm:border-surface-border/50 sm:pl-4">
              <h3 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5"><Tag size={14} /> Referensi SPK</h3>
              <div>
                <Link href={`/app/spk/${data.spkId}`} className="font-bold text-base text-primary hover:underline font-mono">{data.spk?.noSpk || "—"}</Link>
                {data.spk?.kendaraan && <p className="text-sm flex items-center gap-1.5 text-muted-foreground mt-1"><Car size={12} /> {data.spk.kendaraan.name} ({data.spk.kendaraan.plat})</p>}
              </div>
            </div>
          </div>

          {/* Riwayat Pembayaran (Cicilan) */}
          <div className="glass-panel overflow-hidden">
            <div className="p-4 border-b border-surface-border bg-surface-hover/30 flex items-center gap-2">
              <CalendarClock size={18} className="text-muted-foreground" />
              <h3 className="font-bold">Riwayat Transaksi</h3>
            </div>
            {data.detail && data.detail.length > 0 ? (
              <div className="divide-y divide-surface-border/50">
                {data.detail.map((trx, idx) => (
                  <div key={trx.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-hover/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                        {getMethodIcon(trx.metode)}
                      </div>
                      <div>
                        <p className="font-bold font-mono text-emerald-600">{formatRupiah(trx.jumlah)}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span className="capitalize font-medium">{trx.metode}</span>
                          <span>•</span>
                          <span>{new Date(trx.tanggal).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </div>
                    </div>
                    {trx.keterangan && (
                      <span className="text-xs text-muted-foreground bg-surface px-2.5 py-1 rounded-md border border-surface-border/50 self-start sm:self-auto max-w-[200px] truncate" title={trx.keterangan}>
                        {trx.keterangan}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">Belum ada riwayat transaksi / pembayaran untuk tagihan ini.</div>
            )}
            
            {isLunas && (
              <div className="p-4 bg-emerald-500/5 border-t border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
                  <CheckCircle size={18} /> Tagihan telah dilunasi (Lunas)
                </div>
                <button 
                  onClick={handleRefund} 
                  disabled={processing}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-100 hover:bg-red-200 border border-red-300 rounded-lg transition-colors"
                >
                  {processing ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
                  Void / Batal Transaksi
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
