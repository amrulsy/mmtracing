"use client";

import { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { api } from "@/lib/api";
import { formatRupiah } from "@/lib/utils";
import type { Spk, SpkItem, SpkStage } from "@/lib/types";
import {
  PrintToolbar,
  PrintPageWrapper,
  usePrintFormat,
  ThermalSep,
  ThermalDoubleSep,
  ThermalRow,
} from "@/components/print/PrintToolbar";
import { EscPosEncoder } from "@/lib/escPosHelper";
import { loadImageToImageData } from "@/lib/imageHelper";

interface BengkelProfile {
  nama_bengkel?: string;
  NAMA_BENGKEL?: string;
  BENGKEL_LOGO?: string;
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

export default function SpkCetakPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<Spk | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bengkel, setBengkel] = useState<BengkelProfile>({});
  const [format] = usePrintFormat();
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

  // Auto-print setelah data siap render
  useEffect(() => {
    if (!data || printTriggered.current) return;
    const isSelesai = data.status === "selesai";
    const sisa = data.pembayaran?.[0]?.sisaBayar
      ?? Math.max(0, Number(data.totalHarga) - Number(data.diskon ?? 0) - Number(data.totalBayar));
    const isGatePassLocked = isSelesai && Number(sisa) > 0;
    if (!isGatePassLocked && format === "a4") {
      printTriggered.current = true;
      setTimeout(() => window.print(), 500);
    }
  }, [data, format]);

  if (loading) return <div className="p-10 text-center font-mono">Menyiapkan dokumen cetak...</div>;
  if (error || !data) return <div className="p-10 text-center font-mono text-red-500">Error: {error}</div>;

  const sisaBayar = data.pembayaran?.[0]?.sisaBayar
    ?? Math.max(0, Number(data.totalHarga) - Number(data.diskon ?? 0) - Number(data.totalBayar));
  const isSelesai = data.status === "selesai";
  const isGatePassLocked = isSelesai && Number(sisaBayar) > 0;
  const dpPersen = data.totalHarga > 0 ? Math.round((Number(data.minimumDp) / Number(data.totalHarga)) * 100) : 40;
  const documentTitle = isSelesai ? "SURAT JALAN / GATE PASS" : "WORK ORDER / ESTIMASI KERJA";
  const isGatePass = documentTitle === "SURAT JALAN / GATE PASS";
  const now = new Date();

  // Gate Pass Locked UI
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

  const handleShareWhatsApp = () => {
    if (!data) return;

    const items = data.items?.map((item, i) => `${i + 1}. ${item.nama} x${item.qty} = ${formatRupiah(item.subtotal)}`).join("\n") || "";
    const stages = data.stages?.map((s, i) => `${(data.items?.length || 0) + i + 1}. Tahap: ${s.nama} = ${formatRupiah(s.estimasiBiaya)}`).join("\n") || "";
    
    const text = `*${getBengkelField(bengkel, "nama")}*\n` +
      `${getBengkelField(bengkel, "alamat")}\n` +
      `${getBengkelField(bengkel, "telepon") ? `Telp: ${getBengkelField(bengkel, "telepon")}` : ""}\n\n` +
      `*${documentTitle}*\n` +
      `No: ${data.noSpk}\n` +
      `Tgl: ${new Date(data.createdAt).toLocaleDateString("id-ID")}\n\n` +
      `*Pelanggan:* ${data.pelanggan?.name || "-"}\n` +
      `*Kendaraan:* ${data.kendaraan?.name || "-"} (${data.kendaraan?.plat || "-"})\n` +
      `*Mekanik:* ${data.mekanik?.name || "-"}\n\n` +
      `*RINCIAN PEKERJAAN:*\n` +
      `${items}\n${stages}\n\n` +
      `*TOTAL EST. BIAYA: ${formatRupiah(data.totalHarga)}*\n` +
      `${Number(data.diskon) > 0 ? `Diskon: -${formatRupiah(data.diskon)}\n` : ""}` +
      `*SISA BAYAR: ${formatRupiah(sisaBayar)}*\n\n` +
      `_Terima kasih atas kepercayaan Anda._`;

    const encoded = encodeURIComponent(text);
    const phone = data.pelanggan?.phone?.replace(/\D/g, "") || "";
    const waUrl = `https://wa.me/${phone}?text=${encoded}`;
    window.open(waUrl, "_blank");
  };

  const handlePrintBluetooth = async (): Promise<Uint8Array> => {
    if (!data) throw new Error("Data tidak tersedia");
    
    const encoder = new EscPosEncoder();
    const width = format === "thermal-80" ? 48 : 32;

    encoder.initialize().align(1);

    if (bengkel.BENGKEL_LOGO) {
      try {
        const imgData = await loadImageToImageData(bengkel.BENGKEL_LOGO);
        encoder.image(imgData).feed(1);
      } catch (err) {
        console.error("Gagal load logo", err);
      }
    }

    encoder.size(0x11).line(getBengkelField(bengkel, "nama")).size(0x00);
    
    const tagline = getBengkelField(bengkel, "tagline");
    if (tagline) encoder.line(tagline);
    
    const alamat = getBengkelField(bengkel, "alamat");
    if (alamat) encoder.line(alamat);
    
    const telepon = getBengkelField(bengkel, "telepon");
    if (telepon) encoder.line(`Telp: ${telepon}`);

    encoder.feed(1).align(1).line(documentTitle).feed(1).align(0)
      .row("No. SPK", data.noSpk, width)
      .row("Tanggal", new Date(data.createdAt).toLocaleDateString("id-ID"), width)
      .row("Pelanggan", data.pelanggan?.name || "-", width)
      .row("Kendaraan", data.kendaraan ? `${data.kendaraan.name} (${data.kendaraan.plat})` : "-", width)
      .row("Mekanik", data.mekanik?.name || "-", width)
      .separator(width)
      .bold(1).line("RINCIAN:").bold(0);

    data.items?.forEach((item, i) => {
      encoder.line(`${i + 1}. ${item.nama} x${item.qty}`);
      encoder.align(2).line(formatRupiah(item.subtotal)).align(0);
    });

    data.stages?.forEach((stage, i) => {
      encoder.line(`${(data.items?.length || 0) + i + 1}. ${stage.nama}`);
      encoder.align(2).line(formatRupiah(stage.estimasiBiaya)).align(0);
    });

    encoder.separator(width, "=");
    
    if (!isGatePass) {
      encoder.row("ESTIMASI TOTAL", formatRupiah(data.totalHarga), width);
      if (Number(data.diskon) > 0) {
        encoder.row("DISKON", `-${formatRupiah(data.diskon)}`, width);
      }
      encoder.row("MINIMUM DP", formatRupiah(data.minimumDp), width);
    } else {
      encoder.row("TOTAL TAGIHAN", formatRupiah(Number(data.totalHarga) - Number(data.diskon || 0)), width);
      encoder.row("DIBAYAR", formatRupiah(data.totalBayar), width);
      encoder.row("SISA", formatRupiah(sisaBayar), width);
      encoder.feed(1).align(1).bold(1).line("** LUNAS **").bold(0).align(0);
    }

    encoder.feed(1)
      .align(1)
      .line("Terima kasih atas")
      .line("kepercayaan Anda")
      .feed(3)
      .initialize(); // Final reset and cut (if supported)

    return encoder.encode();
  };

  return (
    <PrintPageWrapper>
    <div className="bg-white min-h-screen text-black">
      {/* Toolbar */}
      <PrintToolbar 
        backHref={`/app/spk/${id}`} 
        title={`Cetak SPK — ${data.noSpk}`} 
        onShareWhatsApp={handleShareWhatsApp}
        onPrintBluetooth={handlePrintBluetooth}
      />

      {/* ═══════════════════════════════════
          A4 FORMAT
         ═══════════════════════════════════ */}
      <div className="a4-only">
        <div className="max-w-4xl mx-auto bg-white p-8 sm:p-12 print:p-0 print:m-0 text-sm">
          {/* Kop Surat Header */}
          <div className="border-b-2 border-black pb-4 mb-6 text-center">
            <h1 className="text-2xl font-black uppercase tracking-widest text-black">{getBengkelField(bengkel, "nama")}</h1>
            {getBengkelField(bengkel, "tagline") && (
              <p className="text-sm uppercase font-semibold text-gray-700 tracking-wider">{getBengkelField(bengkel, "tagline")}</p>
            )}
            <div className="text-xs text-gray-500 mt-2 space-y-0.5">
              {getBengkelField(bengkel, "alamat") && <p>{getBengkelField(bengkel, "alamat")}</p>}
              {getBengkelField(bengkel, "telepon") && <p>Telp: {getBengkelField(bengkel, "telepon")}</p>}
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-lg font-bold uppercase underline underline-offset-4 mb-1 border-t border-b py-1">{documentTitle}</h2>
            <p className="text-sm font-mono">{data.noSpk}</p>
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
              {data.mode === "modifikasi" ? (
                <div className="space-y-4">
                  <div><b>Judul Proyek:</b> {data.judulProyek || "-"}</div>
                  <div><b>Spesifikasi Outline:</b> {data.spesifikasi || "-"}</div>
                </div>
              ) : (
                <p className="whitespace-pre-line leading-relaxed">{data.keluhan || "Tidak ada rincian keluhan yang dicatat."}</p>
              )}
            </div>
          </div>

          {/* Rincian Item */}
          <div className="mb-8">
            <h3 className="font-bold uppercase text-xs tracking-wider mb-2 bg-black text-white px-3 py-1 inline-block">2. Rincian Pekerjaan / Suku Cadang</h3>
            <table className="w-full text-sm border-collapse">
              <thead className="border-y border-black font-semibold">
                <tr>
                  <th className="py-2 text-left">Deskripsi List</th>
                  <th className="py-2 text-center w-24">Qty/Durasi</th>
                  <th className="py-2 text-right w-40">Est. Biaya</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.items && data.items.map((item: SpkItem, i: number) => (
                  <tr key={`item-${i}`}>
                    <td className="py-2 uppercase text-xs">{item.nama}</td>
                    <td className="py-2 text-center">{item.qty} {item.type === "sparepart" ? "pcs" : "x"}</td>
                    <td className="py-2 text-right font-mono">{formatRupiah(item.subtotal)}</td>
                  </tr>
                ))}
                {data.stages && data.stages.map((stage: SpkStage, i: number) => (
                  <tr key={`stage-${i}`}>
                    <td className="py-2 font-medium uppercase text-xs">{stage.nama}</td>
                    <td className="py-2 text-center">{stage.durasiHari} hr</td>
                    <td className="py-2 text-right font-mono">{formatRupiah(stage.estimasiBiaya)}</td>
                  </tr>
                ))}
                {(!data.items?.length && !data.stages?.length) && (
                  <tr><td colSpan={isGatePass ? 3 : 4} className="py-8 border border-black text-center text-gray-400 italic">Data kosong</td></tr>
                )}
              </tbody>
              <tfoot className="border-t-2 border-black font-bold">
                <tr>
                  <td colSpan={2} className="py-2 text-right pr-4 uppercase">Subtotal</td>
                  <td className="py-2 text-right font-mono">{formatRupiah(data.totalHarga)}</td>
                </tr>
                {Number(data.diskon) > 0 && (
                  <tr>
                    <td colSpan={2} className="py-1 text-right pr-4 uppercase">Diskon</td>
                    <td className="py-1 text-right font-mono text-red-600">-{formatRupiah(data.diskon)}</td>
                  </tr>
                )}
                <tr>
                  <td colSpan={2} className="py-1 text-right pr-4 uppercase">Minimum DP ({dpPersen}%)</td>
                  <td className="py-1 text-right font-mono">{formatRupiah(data.minimumDp)}</td>
                </tr>
              </tfoot>
            </table>
            {isGatePass && (
              <div className="mt-4 p-3 bg-gray-100 border border-gray-300 font-bold uppercase text-center tracking-widest text-lg">
                * SELURUH TAGIHAN LUNAS DIBAYARKAN *
              </div>
            )}
          </div>

          {/* Signature */}
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
            <p>3. Estimasi biaya dapat berubah (bertambah/berkurang) secara proporsional sesuai dengan kondisi tak terduga yang ditemukan saat pengerjaan.</p>
            {data.mode === "modifikasi" && (
              <p className="font-bold text-black mt-1">4. KHUSUS MODIFIKASI: Down Payment (DP) tidak dapat dikembalikan penuh bila pekerjaan sudah dimulai.</p>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════
          THERMAL FORMAT
         ═══════════════════════════════════ */}
      <div className="thermal-only">
        <div className="thermal-receipt mx-auto bg-white p-3 print:p-0 text-xs">
          {/* Header */}
          <div className="text-center mb-1">
            <p className="text-sm font-black uppercase tracking-wide">{getBengkelField(bengkel, "nama")}</p>
            {getBengkelField(bengkel, "tagline") && (
              <p className="text-[9px] uppercase tracking-wider text-gray-600">{getBengkelField(bengkel, "tagline")}</p>
            )}
            {getBengkelField(bengkel, "alamat") && (
              <p className="text-[9px] text-gray-500 mt-0.5">{getBengkelField(bengkel, "alamat")}</p>
            )}
            {getBengkelField(bengkel, "telepon") && (
              <p className="text-[9px] text-gray-500">Telp: {getBengkelField(bengkel, "telepon")}</p>
            )}
          </div>

          <ThermalDoubleSep />

          {/* Document Title */}
          <div className="text-center my-1">
            <p className="text-[10px] font-bold uppercase tracking-wider">{documentTitle}</p>
          </div>

          <ThermalSep />

          {/* SPK Info */}
          <div className="space-y-0.5 text-[10px]">
            <ThermalRow label="No. SPK" value={data.noSpk} bold />
            <ThermalRow label="Tanggal" value={new Date(data.createdAt).toLocaleDateString("id-ID")} />
            <ThermalRow label="Pelanggan" value={data.pelanggan?.name || "—"} />
            {data.pelanggan?.phone && <ThermalRow label="Telp" value={data.pelanggan.phone} />}
            {data.kendaraan && (
              <ThermalRow label="Kendaraan" value={`${data.kendaraan.name} (${data.kendaraan.plat})`} />
            )}
            <ThermalRow label="Mekanik" value={data.mekanik?.name || "-"} />
            <ThermalRow label="Mode" value={data.mode.toUpperCase()} />
          </div>

          <ThermalSep />

          {/* Keluhan */}
          {data.keluhan && (
            <>
              <p className="text-[9px] font-bold uppercase mb-0.5">Keluhan:</p>
              <p className="text-[9px] leading-tight mb-1">{data.keluhan.slice(0, 120)}{data.keluhan.length > 120 ? "..." : ""}</p>
              <ThermalSep />
            </>
          )}

          {data.mode === "modifikasi" && data.judulProyek && (
            <>
              <p className="text-[9px] font-bold uppercase mb-0.5">Proyek: {data.judulProyek}</p>
              {data.spesifikasi && <p className="text-[9px] leading-tight mb-1">{data.spesifikasi.slice(0, 120)}{data.spesifikasi.length > 120 ? "..." : ""}</p>}
              <ThermalSep />
            </>
          )}

          {/* Items */}
          <p className="text-[9px] font-bold uppercase mb-1">Rincian Pekerjaan:</p>
          <div className="space-y-0.5">
            {data.items && data.items.map((item: SpkItem, i: number) => (
              <div key={`t-item-${i}`}>
                <p className="text-[10px] truncate">{i + 1}. {item.nama} x{item.qty}</p>
                <p className="text-[10px] text-right font-mono">{formatRupiah(item.subtotal)}</p>
              </div>
            ))}
            {data.stages && data.stages.map((stage: SpkStage, i: number) => (
              <div key={`t-stage-${i}`}>
                <p className="text-[10px] truncate">{(data.items?.length || 0) + i + 1}. {stage.nama}</p>
                <p className="text-[10px] text-right font-mono">{formatRupiah(stage.estimasiBiaya)}</p>
              </div>
            ))}
          </div>

          <ThermalDoubleSep />

          {/* Totals */}
          <div className="space-y-0.5">
            {!isGatePass ? (
              <>
                <ThermalRow label="ESTIMASI TOTAL" value={formatRupiah(data.totalHarga)} bold />
                {Number(data.diskon) > 0 && (
                  <ThermalRow label="DISKON" value={`-${formatRupiah(data.diskon)}`} />
                )}
                <ThermalRow label="MINIMUM DP" value={formatRupiah(data.minimumDp)} />
              </>
            ) : (
              <>
                <ThermalRow label="TOTAL TAGIHAN" value={formatRupiah(Number(data.totalHarga) - Number(data.diskon || 0))} bold />
                <ThermalRow label="DIBAYAR" value={formatRupiah(data.totalBayar)} />
                <ThermalRow label="SISA" value={formatRupiah(sisaBayar)} />
              </>
            )}
          </div>
          {isGatePass && (
            <div className="text-center mt-2">
              <p className="text-[10px] font-bold uppercase tracking-wide">** LUNAS **</p>
            </div>
          )}

          <ThermalSep />

          {/* Footer */}
          <div className="text-center text-[8px] text-gray-500 mt-1 space-y-0.5">
            <p>Estimasi biaya dapat berubah</p>
            <p>sesuai kondisi saat pengerjaan</p>
            <p className="font-medium mt-1">Terima kasih atas kepercayaan Anda</p>
            <p className="mt-1 text-[7px]">
              Dicetak: {now.toLocaleDateString("id-ID")} {now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>
      </div>
    </div>
    </PrintPageWrapper>
  );
}
