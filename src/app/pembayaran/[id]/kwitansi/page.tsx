"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer, Download, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import type { Pembayaran, PembayaranDetail, SpkItem, SpkStage } from "@/lib/types";

interface BengkelProfile {
  nama?: string;
  alamat?: string;
  telepon?: string;
  whatsapp?: string;
  email?: string;
  pemilik?: string;
}

export default function KwitansiPage() {
  const params = useParams();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<Pembayaran | null>(null);
  const [bengkel, setBengkel] = useState<BengkelProfile>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.get<Pembayaran>(`/pembayaran/${id}`),
      api.get<BengkelProfile>("/settings/profile"),
    ])
      .then(([invRes, bengkelRes]) => {
        setInvoice(invRes.data);
        setBengkel(bengkelRes.data ?? {});
      })
      .catch((err) => setError(err.message || "Gagal memuat data"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-muted-foreground animate-in fade-in">
        <Loader2 size={32} className="animate-spin text-primary" />
        <p className="text-sm">Memuat kwitansi...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 animate-in fade-in">
        <AlertTriangle size={32} className="text-red-500" />
        <p className="text-muted-foreground text-sm">{error || "Data invoice tidak ditemukan"}</p>
        <Link href={`/pembayaran/${id}`} className="text-primary text-sm font-medium hover:underline">
          ← Kembali
        </Link>
      </div>
    );
  }

  const formatRp = (n: number | undefined | null) =>
    `Rp ${Number(n ?? 0).toLocaleString("id-ID")}`;

  const formatDate = (d: string | null | undefined) =>
    d
      ? new Date(d).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "—";

  const formatDateTime = (d: string | null | undefined) =>
    d
      ? new Date(d).toLocaleString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

  const formatDateShort = (d: string | null | undefined) =>
    d
      ? new Date(d).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
        })
      : "";

  const spk = invoice.spk;
  const pelanggan = spk?.pelanggan;
  const kendaraan = spk?.kendaraan;
  const items = spk?.items ?? [];
  const stages = spk?.stages ?? [];
  const details: PembayaranDetail[] = (invoice as any).detail ?? invoice.details ?? [];
  const isLunas = invoice.status === "lunas";

  const bengkelNama = bengkel.nama || "BENGKEL MM TRACING";
  const bengkelAlamat = bengkel.alamat || "—";
  const bengkelTelepon = bengkel.telepon || "—";

  // Rincian items (dari items ATAU stages)
  const rincianRows = items.length > 0
    ? items.map((item: SpkItem) => ({
        uraian: item.nama,
        qty: item.qty,
        satuan: item.type === "sparepart" ? "pcs" : "x",
        subtotal: Number(item.subtotal),
      }))
    : stages.map((stage: SpkStage) => ({
        uraian: `Tahap ${stage.urutan}: ${stage.nama}`,
        qty: 1,
        satuan: "tahap",
        subtotal: Number(stage.estimasiBiaya),
      }));

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Controls (hidden saat print) */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link href={`/pembayaran/${id}`} className="p-2 hover:bg-surface-hover rounded-xl border border-surface-border glass transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Cetak Kwitansi</h1>
            <p className="text-xs text-muted-foreground">{invoice.noInvoice}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="flex items-center gap-2 text-sm bg-surface border border-surface-border px-3 py-2 rounded-xl hover:bg-surface-hover font-medium transition-colors">
            <Download size={16} /> Download PDF
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 text-sm bg-primary text-primary-foreground px-4 py-2 rounded-xl font-medium shadow-glossy-primary hover:shadow-glossy-primary-dark btn-glossy">
            <Printer size={16} /> Cetak
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 print:grid-cols-1">
        {/* ── A4 Receipt ── */}
        <div className="bg-white dark:bg-zinc-950 border border-surface-border rounded-2xl print:border-none max-w-lg mx-auto p-8 text-black dark:text-white w-full">
          {/* Header Bengkel */}
          <div className="text-center border-b-2 border-black dark:border-white pb-4 mb-4">
            <h1 className="text-xl font-black tracking-tight">{bengkelNama}</h1>
            <p className="text-xs">{bengkelAlamat}</p>
            {bengkelTelepon !== "—" && <p className="text-xs">Telp: {bengkelTelepon}</p>}
          </div>

          <div className="text-center mb-4">
            <p className="text-sm font-bold uppercase tracking-wider">KWITANSI PEMBAYARAN</p>
            <p className="text-xs font-mono text-muted-foreground print:text-black mt-1">{invoice.noInvoice}</p>
          </div>

          {/* Info Pelanggan & Kendaraan */}
          <div className="text-sm space-y-1 mb-4">
            <div className="flex justify-between"><span className="text-muted-foreground print:text-black">Tanggal</span><span>{formatDate(invoice.createdAt)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground print:text-black">Pelanggan</span><span className="font-medium">{pelanggan?.name || "—"}</span></div>
            {kendaraan && (
              <div className="flex justify-between"><span className="text-muted-foreground print:text-black">Kendaraan</span><span>{kendaraan.name} ({kendaraan.plat})</span></div>
            )}
            <div className="flex justify-between"><span className="text-muted-foreground print:text-black">No. SPK</span><span className="font-mono">{spk?.noSpk || "—"}</span></div>
          </div>

          {/* Tabel Rincian */}
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="border-y border-black dark:border-white print:border-black text-xs">
                <th className="py-1.5 text-left">Uraian</th>
                <th className="py-1.5 text-center">Qty</th>
                <th className="py-1.5 text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {rincianRows.length > 0 ? (
                rincianRows.map((r, i) => (
                  <tr key={i} className="border-b border-surface-border print:border-gray-200">
                    <td className="py-1.5">{r.uraian}</td>
                    <td className="py-1.5 text-center">{r.qty} {r.satuan}</td>
                    <td className="py-1.5 text-right font-mono">{formatRp(r.subtotal)}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={3} className="py-3 text-center text-muted-foreground">Tidak ada rincian</td></tr>
              )}
            </tbody>
          </table>

          {/* Ringkasan Pembayaran */}
          <div className="border-t-2 border-black dark:border-white print:border-black pt-2 space-y-1 text-sm">
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span className="font-mono">{formatRp(invoice.totalTagihan)}</span>
            </div>
            {details.map((p: PembayaranDetail, i: number) => (
              <div key={i} className="flex justify-between text-emerald-600">
                <span>{p.metode ? p.metode.charAt(0).toUpperCase() + p.metode.slice(1) : "Bayar"} ({formatDateShort(p.tanggal)})</span>
                <span className="font-mono">- {formatRp(p.jumlah)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold border-t border-surface-border print:border-gray-300 pt-2 mt-2">
              <span>Sisa Tagihan</span>
              <span className={`font-mono ${isLunas ? "text-emerald-600" : "text-amber-600"}`}>
                {isLunas ? `${formatRp(0)} (LUNAS)` : formatRp(invoice.sisaBayar)}
              </span>
            </div>
          </div>

          {/* Badge Lunas */}
          {isLunas && (
            <div className="flex items-center justify-center gap-2 mt-4 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-600 text-sm font-bold print:bg-gray-100 print:text-black print:border-gray-400">
              <CheckCircle size={16} /> LUNAS
            </div>
          )}

          {/* Tanda Tangan */}
          <div className="grid grid-cols-2 gap-8 text-center text-xs mt-8">
            <div>
              <p className="mb-12">Pelanggan</p>
              <div className="border-b border-black dark:border-white print:border-black mx-2"></div>
              <p className="text-muted-foreground print:text-black mt-1">( {pelanggan?.name || "—"} )</p>
            </div>
            <div>
              <p className="mb-12">Kasir</p>
              <div className="border-b border-black dark:border-white print:border-black mx-2"></div>
              <p className="text-muted-foreground print:text-black mt-1">( {bengkel.pemilik || "—"} )</p>
            </div>
          </div>

          <p className="text-[8px] text-center text-muted-foreground print:text-black mt-6">
            Kwitansi ini sebagai bukti pembayaran yang sah. Dicetak otomatis oleh Sistem MM Tracing.
          </p>
        </div>

        {/* ── Thermal Receipt Preview (58mm) ── */}
        <div className="print:hidden">
          <h3 className="text-sm font-bold mb-3 text-muted-foreground">Preview Struk Thermal (58mm)</h3>
          <div className="max-w-[250px] mx-auto bg-white dark:bg-zinc-900 border border-surface-border rounded-xl p-4 font-mono text-[10px] text-black dark:text-white leading-relaxed shadow-lg">
            <p className="text-center font-bold text-xs">{bengkelNama}</p>
            <p className="text-center">{bengkelAlamat}</p>
            {bengkelTelepon !== "—" && <p className="text-center">Telp: {bengkelTelepon}</p>}
            <p className="text-center mt-2">================================</p>
            <p>INV  : {invoice.noInvoice}</p>
            <p>TGL  : {formatDateTime(invoice.createdAt)}</p>
            <p className="text-center">================================</p>
            <p>PLG  : {pelanggan?.name || "—"}</p>
            {kendaraan && <p>KNDR : {kendaraan.name} {kendaraan.plat}</p>}
            <p>SPK  : {spk?.noSpk || "—"}</p>
            <p className="text-center">--------------------------------</p>
            <div className="space-y-0.5">
              {rincianRows.map((r, i) => {
                // Truncate nama to fit thermal width
                const nama = r.uraian.length > 18 ? r.uraian.substring(0, 18) : r.uraian;
                return <p key={i}>{nama.padEnd(20)}{formatRp(r.subtotal)}</p>;
              })}
            </div>
            <p className="text-center">================================</p>
            <p className="font-bold">TOTAL      :    {formatRp(invoice.totalTagihan)}</p>
            {details.map((p: PembayaranDetail, i: number) => (
              <p key={i}>{(p.metode?.toUpperCase() || "BAYAR").padEnd(12)}: -{formatRp(p.jumlah)}</p>
            ))}
            <p className="text-center">================================</p>
            <p className="font-bold text-center">{isLunas ? "** LUNAS **" : `SISA: ${formatRp(invoice.sisaBayar)}`}</p>
            <p className="text-center mt-2">Terima kasih atas</p>
            <p className="text-center">kepercayaan Anda!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
