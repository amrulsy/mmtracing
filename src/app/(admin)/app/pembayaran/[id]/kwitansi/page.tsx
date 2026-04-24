"use client";

import { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { api } from "@/lib/api";
import { formatRupiah } from "@/lib/utils";
import type { Pembayaran, PembayaranDetail, SpkItem, SpkStage } from "@/lib/types";

interface BengkelProfile {
  NAMA_BENGKEL?: string;
  TAGLINE?: string;
  ALAMAT?: string;
  NO_TELEPON?: string;
}

interface PembayaranWithDetail extends Pembayaran {
  detail: PembayaranDetail[];
}

export default function KwitansiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<PembayaranWithDetail | null>(null);
  const [bengkel, setBengkel] = useState<BengkelProfile>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const printTriggered = useRef(false);

  useEffect(() => {
    Promise.all([
      api.get<PembayaranWithDetail>(`/pembayaran/${id}`),
      api.get<BengkelProfile>("/settings/profile"),
    ])
      .then(([payRes, profileRes]) => {
        setData(payRes.data);
        setBengkel(profileRes.data ?? {});
      })
      .catch(err => setError(err instanceof Error ? err.message : "Gagal memuat data"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!data || printTriggered.current) return;
    printTriggered.current = true;
    window.print();
  }, [data]);

  if (loading) return <div className="p-10 text-center font-mono">Menyiapkan dokumen kwitansi...</div>;
  if (error || !data) return <div className="p-10 text-center font-mono text-red-500">Error: {error}</div>;

  return (
    <div className="bg-white min-h-screen text-black">
      {/* UI Control Block (Hidden on Print) */}
      <div className="print:hidden p-4 bg-surface border-b border-surface-border flex items-center justify-between shadow-sm">
        <div className="flex gap-4">
          <Link href={`/app/pembayaran/${id}`} className="px-3 py-1.5 rounded-lg border border-surface-border bg-background hover:bg-surface-hover flex items-center gap-2 text-sm font-medium">
            <ArrowLeft size={16} /> Kembali
          </Link>
          <button onClick={() => window.print()} className="px-4 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 flex items-center gap-2 text-sm font-medium">
            <Printer size={16} /> Print Ulang
          </button>
        </div>
        <p className="text-xs text-muted-foreground mr-4">Gunakan Ctrl+P / Cmd+P untuk cetak</p>
      </div>

      {/* Printable Area - A5 / Thermal Receipt Width Concept */}
      {/* Container ini didesain flexibel: lebar max A4 but looks good di A5 */}
      <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 print:p-0 print:m-0">
        
        {/* Kop Surat */}
        <div className="border-b-2 border-black pb-4 mb-6 text-center">
          <h1 className="text-2xl font-black uppercase tracking-widest text-black">{bengkel.NAMA_BENGKEL || "BENGKEL"}</h1>
          {bengkel.TAGLINE && <p className="text-sm uppercase font-semibold text-gray-700 tracking-wider">{bengkel.TAGLINE}</p>}
          <div className="text-xs text-gray-500 mt-2 space-y-0.5">
            {bengkel.ALAMAT && <p>{bengkel.ALAMAT}</p>}
            {bengkel.NO_TELEPON && <p>Telp: {bengkel.NO_TELEPON}</p>}
          </div>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-lg font-bold uppercase underline underline-offset-4 mb-1 border-t border-b py-1">INVOICE / KWITANSI</h2>
          <p className="text-sm font-mono">{data.noInvoice}</p>
        </div>

        {/* Info Header */}
        <div className="grid grid-cols-2 gap-8 text-sm mb-8">
          <div>
            <table className="w-full">
              <tbody>
                <tr><td className="w-24 text-gray-500 pb-1">Tanggal</td><td className="font-medium pb-1">: {new Date(data.createdAt).toLocaleDateString("id-ID")}</td></tr>
                <tr><td className="text-gray-500 pb-1">Status</td><td className="font-bold uppercase pb-1">: {data.status.replace("_", " ")}</td></tr>
                <tr><td className="text-gray-500 pb-1">Ref. SPK</td><td className="font-mono font-bold pb-1">: {data.spk?.noSpk || "—"}</td></tr>
              </tbody>
            </table>
          </div>
          <div>
             <table className="w-full">
              <tbody>
                <tr><td className="w-24 text-gray-500 pb-1">Pelanggan</td><td className="font-bold pb-1">: {data.spk?.pelanggan?.name || "—"}</td></tr>
                <tr><td className="text-gray-500 pb-1">Telepon</td><td className="font-medium pb-1">: {data.spk?.pelanggan?.phone || "—"}</td></tr>
                <tr><td className="text-gray-500 pb-1">Kendaraan</td><td className="font-medium pb-1">: {data.spk?.kendaraan ? `${data.spk.kendaraan.name} (${data.spk.kendaraan.plat})` : "—"}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Rincian Tagihan */}
        <div className="mb-8">
          <h3 className="font-bold text-sm uppercase mb-3 text-gray-700">Rincian Pekerjaan / Item</h3>
          <table className="w-full text-sm">
            <thead className="border-y border-black font-semibold">
              <tr>
                <th className="py-2 text-left">Deskripsi</th>
                <th className="py-2 text-center w-16">Qty</th>
                <th className="py-2 text-right w-32">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.spk?.items && data.spk.items.map((item: SpkItem, i: number) => (
                <tr key={`item-${i}`}>
                  <td className="py-2">{item.nama}</td>
                  <td className="py-2 text-center">{item.qty}</td>
                  <td className="py-2 text-right font-mono">{formatRupiah(item.subtotal)}</td>
                </tr>
              ))}
              {data.spk?.stages && data.spk.stages.map((stage: SpkStage, i: number) => (
                <tr key={`stage-${i}`}>
                  <td className="py-2 font-medium">Tahap {stage.urutan}: {stage.nama}</td>
                  <td className="py-2 text-center">1</td>
                  <td className="py-2 text-right font-mono">{formatRupiah(stage.estimasiBiaya)}</td>
                </tr>
              ))}
              {(!data.spk?.items?.length && !data.spk?.stages?.length) && (
                <tr><td colSpan={3} className="py-4 text-center text-gray-400 italic">Tidak ada rincian spesifik</td></tr>
              )}
            </tbody>
            <tfoot className="border-t-2 border-black font-bold">
              <tr>
                <td colSpan={2} className="py-3 text-right pr-4 uppercase text-gray-700">Total Tagihan</td>
                <td className="py-3 text-right font-mono text-base">{formatRupiah(data.totalTagihan)}</td>
              </tr>
              <tr>
                <td colSpan={2} className="py-1 text-right pr-4 uppercase text-gray-700">Total Dibayar</td>
                <td className="py-1 text-right font-mono text-base">{formatRupiah(data.totalBayar)}</td>
              </tr>
              <tr>
                <td colSpan={2} className="py-1 text-right pr-4 uppercase text-gray-700">Sisa Tagihan</td>
                <td className="py-1 text-right font-mono text-base">{formatRupiah(data.sisaBayar)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Riwayat Pembayaran */}
        {data.detail && data.detail.length > 0 && (
          <div className="mb-12">
            <h3 className="font-bold text-sm uppercase mb-3 text-gray-700">Riwayat Transaksi</h3>
            <div className="border border-gray-300 rounded-lg p-4">
              {data.detail.map((trx) => (
                <div key={trx.id} className="flex justify-between items-center text-sm py-1 border-b border-gray-100 last:border-0 last:pb-0">
                  <span className="text-gray-600">
                    {new Date(trx.tanggal).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' })} — <span className="uppercase font-medium">{trx.metode}</span>
                  </span>
                  <span className="font-mono font-bold">{formatRupiah(trx.jumlah)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer / Signature */}
        <div className="grid grid-cols-2 gap-8 text-sm text-center pt-8 mt-12">
          <div>
            <p className="mb-16 text-gray-500">Hormat Kami,</p>
            <p className="font-bold uppercase underline underline-offset-4">Kasir / Admin</p>
          </div>
          <div>
            <p className="mb-16 text-gray-500">Pelanggan,</p>
            <p className="font-bold uppercase underline underline-offset-4">{data.spk?.pelanggan?.name || "Nama Pelanggan"}</p>
          </div>
        </div>

        <div className="mt-12 text-center text-xs text-gray-400 italic print:text-[10px]">
          <p>Terima kasih atas kepercayaan Anda pada Moro Motor Tracing.</p>
          <p>Kwitansi ini adalah bukti pembayaran yang sah. Harap disimpan dengan baik.</p>
        </div>
      </div>
    </div>
  );
}
