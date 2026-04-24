"use client";

import { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, LockKeyhole } from "lucide-react";
import { api } from "@/lib/api";
import { formatRupiah } from "@/lib/utils";
import type { Spk, SpkItem, SpkStage } from "@/lib/types";

interface BengkelProfile {
  nama_bengkel?: string;
  tagline?: string;
  alamat?: string;
  telepon?: string;
}

export default function SpkCetakPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<Spk | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bengkel, setBengkel] = useState<BengkelProfile>({});
  const printTriggered = useRef(false);

  useEffect(() => {
    Promise.all([
      api.get<Spk>(`/spk/${id}`),
      api.get<BengkelProfile>("/settings/profile"),
    ])
      .then(([spkRes, profileRes]) => {
        setData(spkRes.data);
        setBengkel(profileRes.data ?? {});
      })
      .catch(err => setError(err.message || "Gagal memuat SPK"))
      .finally(() => setLoading(false));
  }, [id]);

  // Auto-print setelah data siap render (menggantikan setTimeout yang tidak reliable)
  useEffect(() => {
    if (!data || printTriggered.current) return;
    const isSelesai = data.status === "selesai";
    const sisa = data.pembayaran?.[0]?.sisaBayar
      ?? Math.max(0, Number(data.totalHarga) - Number(data.diskon ?? 0) - Number(data.totalBayar));
    const isGatePassLocked = isSelesai && Number(sisa) > 0;
    if (!isGatePassLocked) {
      printTriggered.current = true;
      window.print();
    }
  }, [data]);

  if (loading) return <div className="p-10 text-center font-mono">Menyiapkan dokumen cetak...</div>;
  if (error || !data) return <div className="p-10 text-center font-mono text-red-500">Error: {error}</div>;

  // Hitung sisaBayar dengan memperhitungkan diskon
  const sisaBayar = data.pembayaran?.[0]?.sisaBayar
    ?? Math.max(0, Number(data.totalHarga) - Number(data.diskon ?? 0) - Number(data.totalBayar));
  const isSelesai = data.status === "selesai";
  
  // Logic Gate Pass Lock:
  // SPK berstatus Selesai, tapi masih ada sisa pembayaran.
  const isGatePassLocked = isSelesai && Number(sisaBayar) > 0;
  const dpPersen = data.totalHarga > 0 ? Math.round((Number(data.minimumDp) / Number(data.totalHarga)) * 100) : 40;
  
  const documentTitle = isSelesai ? "SURAT JALAN / GATE PASS" : "WORK ORDER / ESTIMASI KERJA";

  if (isGatePassLocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-4">
        <div className="max-w-md w-full bg-background border-2 border-red-500 rounded-2xl p-8 text-center space-y-4 shadow-xl">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500">
            <LockKeyhole size={36} />
          </div>
          <h2 className="text-2xl font-bold text-red-600">Gate Pass Terkunci</h2>
          <p className="text-sm text-muted-foreground">
            Kendaraan untuk SPK <b>{data.noSpk}</b> tidak dapat dikeluarkan karena status tagihan belum <b>Lunas</b>.
          </p>
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 text-left">
            <p className="text-sm flex justify-between"><span className="text-muted-foreground">Sisa Bayar:</span> <span className="font-bold font-mono text-red-600">{formatRupiah(sisaBayar)}</span></p>
          </div>
          <div className="flex flex-col gap-2 pt-4">
            {data.pembayaran?.[0]?.id ? (
              <Link href={`/app/pembayaran/kasir?id=${data.pembayaran[0].id}`} className="bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary/90 flex justify-center">
                Pergi ke Kasir
              </Link>
            ) : (
              <Link href={`/app/pembayaran`} className="bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary/90 flex justify-center">
                Buat Invoice Pembayaran
              </Link>
            )}
            <Link href={`/app/spk/${data.id}`} className="py-3 rounded-xl text-muted-foreground font-medium border border-surface-border hover:bg-surface-hover flex justify-center">
              Kembali ke Detail SPK
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen text-black">
      {/* UI Control Block (Hidden on Print) */}
      <div className="print:hidden p-4 bg-surface border-b border-surface-border flex items-center justify-between shadow-sm">
        <div className="flex gap-4">
          <Link href={`/app/spk/${id}`} className="px-3 py-1.5 rounded-lg border border-surface-border bg-background hover:bg-surface-hover flex items-center gap-2 text-sm font-medium">
            <ArrowLeft size={16} /> Kembali
          </Link>
          <button onClick={() => window.print()} className="px-4 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 flex items-center gap-2 text-sm font-medium">
            <Printer size={16} /> Print Cetak
          </button>
        </div>
      </div>

      {/* Printable Area - A4 Size Concept */}
      <div className="max-w-4xl mx-auto bg-white p-8 sm:p-12 print:p-0 print:m-0 text-sm">
        
        {/* Kop Surat Header */}
        <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-widest leading-none">{bengkel.nama_bengkel || "BENGKEL"}</h1>
            <p className="text-sm uppercase font-semibold text-gray-700 tracking-wider">{bengkel.tagline || ""}</p>
            <p className="text-xs text-gray-500 mt-2 max-w-[250px]">{bengkel.alamat || ""}{bengkel.telepon ? ` — Telp: ${bengkel.telepon}` : ""}</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold uppercase underline underline-offset-4 mb-2">{documentTitle}</h2>
            <p className="font-mono text-lg">{data.noSpk}</p>
          </div>
        </div>

        {/* Info Header */}
        <div className="grid grid-cols-2 gap-8 mb-8 border border-black p-4 rounded-lg bg-gray-50/50">
          <div>
             <table className="w-full">
              <tbody>
                <tr><td className="w-24 text-gray-700 pb-2 font-medium">Pelanggan</td><td className="font-bold pb-2 uppercase">: {data.pelanggan?.name || "—"}</td></tr>
                <tr><td className="text-gray-700 pb-2 font-medium">Telepon</td><td className="font-medium pb-2">: {data.pelanggan?.phone || "—"}</td></tr>
                <tr><td className="text-gray-700 pb-2 font-medium">Tanggal Masuk</td><td className="font-medium pb-2">: {new Date(data.createdAt).toLocaleDateString("id-ID")}</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <table className="w-full">
              <tbody>
                <tr><td className="w-24 text-gray-700 pb-2 font-medium">Kendaraan</td><td className="font-bold pb-2 uppercase">: {data.kendaraan ? data.kendaraan.name : "—"}</td></tr>
                <tr><td className="text-gray-700 pb-2 font-medium">No. Polisi</td><td className="font-bold font-mono pb-2 uppercase">: {data.kendaraan ? data.kendaraan.plat : "—"}</td></tr>
                <tr><td className="text-gray-700 pb-2 font-medium">Mekanik</td><td className="font-medium pb-2 uppercase">: {data.mekanik?.name || "BELUM DITENTUKAN"}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Keluhan & Request */}
        <div className="mb-6">
          <h3 className="font-bold uppercase text-xs tracking-wider mb-2 bg-black text-white px-3 py-1 inline-block">1. Deskripsi Kerja / Keluhan</h3>
          <div className="border border-black p-4 min-h-[80px]">
            {data.mode === 'modifikasi' ? (
               <div className="space-y-4">
                  <div><b>Judul Proyek:</b> {data.judulProyek || "-"}</div>
                  <div><b>Spesifikasi Outline:</b> {data.spesifikasi || "-"}</div>
               </div>
            ) : (
                <p className="whitespace-pre-line leading-relaxed">{data.keluhan || "Tidak ada rincian keluhan yang dicatat."}</p>
            )}
          </div>
        </div>

        {/* Rincian Tagihan */}
        <div className="mb-8">
          <h3 className="font-bold uppercase text-xs tracking-wider mb-2 bg-black text-white px-3 py-1 inline-block">2. Rincian Pekerjaan / Suku Cadang</h3>
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-100 border border-black text-black">
              <tr>
                <th className="py-2 px-3 border border-black text-left w-12 text-center">No</th>
                <th className="py-2 px-3 border border-black text-left">Deskripsi List</th>
                <th className="py-2 px-3 border border-black text-center w-24">Qty/Durasi</th>
                {documentTitle !== "SURAT JALAN / GATE PASS" && <th className="py-2 px-3 border border-black text-right w-40">Est. Biaya</th>}
              </tr>
            </thead>
            <tbody>
              {data.items && data.items.map((item: SpkItem, i: number) => (
                <tr key={`item-${i}`}>
                   <td className="py-2 px-3 border border-black text-center">{i+1}</td>
                  <td className="py-2 px-3 border border-black uppercase text-xs">{item.nama}</td>
                  <td className="py-2 px-3 border border-black text-center">{item.qty} {item.type === 'sparepart' ? 'pcs' : 'x'}</td>
                  {documentTitle !== "SURAT JALAN / GATE PASS" && <td className="py-2 px-3 border border-black text-right font-mono">{formatRupiah(item.subtotal)}</td>}
                </tr>
              ))}
              {data.stages && data.stages.map((stage: SpkStage, i: number) => (
                <tr key={`stage-${i}`}>
                  <td className="py-2 px-3 border border-black text-center">{(data.items?.length || 0) + i + 1}</td>
                  <td className="py-2 px-3 border border-black font-medium uppercase text-xs">Tahap {stage.urutan}: {stage.nama}</td>
                  <td className="py-2 px-3 border border-black text-center">{stage.durasiHari} hr</td>
                  {documentTitle !== "SURAT JALAN / GATE PASS" && <td className="py-2 px-3 border border-black text-right font-mono">{formatRupiah(stage.estimasiBiaya)}</td>}
                </tr>
              ))}
              {(!data.items?.length && !data.stages?.length) && (
                <tr><td colSpan={documentTitle !== "SURAT JALAN / GATE PASS" ? 4 : 3} className="py-8 border border-black text-center text-gray-400 italic">Data kosong</td></tr>
              )}
            </tbody>
            {documentTitle !== "SURAT JALAN / GATE PASS" && (
                <tfoot className="font-bold bg-gray-50">
                <tr>
                    <td colSpan={3} className="py-2 px-3 text-right uppercase border border-black">Subtotal</td>
                    <td className="py-2 px-3 text-right font-mono border border-black">{formatRupiah(data.totalHarga)}</td>
                </tr>
                <tr>
                    <td colSpan={3} className="py-2 px-3 text-right uppercase border border-black">Minimum DP Rekomendasi ({dpPersen}%)</td>
                    <td className="py-2 px-3 text-right font-mono border border-black text-gray-500">{formatRupiah(data.minimumDp)}</td>
                </tr>
                </tfoot>
            )}
          </table>
          {documentTitle === "SURAT JALAN / GATE PASS" && (
             <div className="mt-4 p-3 bg-gray-100 border border-gray-300 font-bold uppercase text-center tracking-widest text-lg">
                * SELURUH TAGIHAN LUNAS DIBAYARKAN *
             </div>
          )}
        </div>

        {/* Footer / Signature */}
        <div className="grid grid-cols-3 gap-8 text-sm text-center pt-8 mt-12 mb-4">
           <div>
            <p className="mb-20 text-gray-500 font-medium">Hormat Kami (Admin/Kasir),</p>
            <p className="font-bold uppercase underline underline-offset-4">{data.createdBy?.name || "MORO MOTOR"}</p>
          </div>
          <div>
            <p className="mb-20 text-gray-500 font-medium">Disetujui Oleh Pelanggan,</p>
            <p className="font-bold uppercase underline underline-offset-4">{data.pelanggan?.name || "Nama Pelanggan"}</p>
          </div>
          <div>
            <p className="mb-20 text-gray-500 font-medium">Ditangani Oleh (Mekanik),</p>
            <p className="font-bold uppercase underline underline-offset-4">{data.mekanik?.name || "..............................."}</p>
          </div>
        </div>

        {/* TNC */}
        <div className="border-t border-dashed border-gray-400 pt-4 text-[10px] text-gray-500 leading-relaxed text-justify">
           <p className="font-bold mb-1 underline">Syarat & Ketentuan Umum:</p>
           <p>1. Pihak bengkel tidak bertanggung jawab atas kehilangan atau kerusakan barang berharga yang ditinggalkan di dalam kendaraan.</p>
           <p>2. Kendaraan atau sparepart yang ditinggalkan lebih dari 30 hari tanpa konfirmasi menjadi bukan tanggung jawab pihak bengkel.</p>
           <p>3. Estimasi biaya dapat berubah (bertambah/berkurang) secara proporsional sesuai dengan kondisi tak terduga yang ditemukan saat pengerjaan. Jika ada penambahan, admin akan menghubungi via Telepon/WhatsApp.</p>
           {data.mode === 'modifikasi' && (
              <p className="font-bold text-black mt-1">4. KHUSUS MODIFIKASI: Down Payment (DP) tidak dapat dikembalikan penuh bila pekerjaan sudah dimulai. Pembatalan sepihak dikenakan penalty material.</p>
           )}
        </div>
      </div>
    </div>
  );
}
