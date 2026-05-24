"use client";

import { useState, useEffect, use, useRef } from "react";
import { api } from "@/lib/api";
import { formatRupiah } from "@/lib/utils";
import type { Pembayaran, PembayaranDetail, SpkItem, SpkStage } from "@/lib/types";
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

interface PembayaranWithDetail extends Pembayaran {
  detail: PembayaranDetail[];
}

export default function KwitansiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<PembayaranWithDetail | null>(null);
  const [bengkel, setBengkel] = useState<BengkelProfile>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [format] = usePrintFormat();
  const printTriggered = useRef(false);
  const now = new Date();

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
    if (!data || printTriggered.current || format !== "a4") return;
    printTriggered.current = true;
    setTimeout(() => window.print(), 500);
  }, [data, format]);

  if (loading) return <div className="p-10 text-center font-mono">Menyiapkan dokumen kwitansi...</div>;
  if (error || !data) return <div className="p-10 text-center font-mono text-red-500">Error: {error}</div>;

  const statusLabel = data.status === "lunas" ? "LUNAS" : data.status === "parsial" ? "PARSIAL" : "BELUM BAYAR";

  const handleShareWhatsApp = () => {
    if (!data) return;

    const items = data.spk?.items?.map((item, i) => `${i + 1}. ${item.nama} x${item.qty} = ${formatRupiah(item.subtotal)}`).join("\n") || "";
    const stages = data.spk?.stages?.map((s, i) => `${(data.spk?.items?.length || 0) + i + 1}. ${s.nama} = ${formatRupiah(s.estimasiBiaya)}`).join("\n") || "";

    const text = `*${getBengkelField(bengkel, "nama")}*\n` +
      `${getBengkelField(bengkel, "alamat")}\n` +
      `${getBengkelField(bengkel, "telepon") ? `Telp: ${getBengkelField(bengkel, "telepon")}` : ""}\n\n` +
      `*KWITANSI / INVOICE ${data.status === "lunas" ? "LUNAS" : "PARSIAL"}*\n` +
      `No: ${data.noInvoice}\n` +
      `Tgl: ${new Date(data.createdAt).toLocaleDateString("id-ID")}\n` +
      `Ref SPK: ${data.spk?.noSpk || "-"}\n\n` +
      `*Pelanggan:* ${data.spk?.pelanggan?.name || "-"}\n` +
      `*Kendaraan:* ${data.spk?.kendaraan?.name || "-"} (${data.spk?.kendaraan?.plat || "-"})\n\n` +
      `*RINCIAN:* \n` +
      `${items}\n${stages}\n\n` +
      `*TOTAL TAGIHAN: ${formatRupiah(data.totalTagihan)}*\n` +
      `*TOTAL DIBAYAR: ${formatRupiah(data.totalBayar)}*\n` +
      `*SISA TAGIHAN: ${formatRupiah(data.sisaBayar)}*\n\n` +
      `_Kwitansi ini adalah bukti pembayaran sah._\n` +
      `_Terima kasih atas kunjungan Anda._`;

    const encoded = encodeURIComponent(text);
    const phone = data.spk?.pelanggan?.phone?.replace(/\D/g, "") || "";
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

    encoder.feed(1).align(1).line("KWITANSI / INVOICE").feed(1).align(0)
      .row("No. Invoice", data.noInvoice, width)
      .row("Tanggal", new Date(data.createdAt).toLocaleDateString("id-ID"), width)
      .row("Ref. SPK", data.spk?.noSpk || "-", width)
      .row("Pelanggan", data.spk?.pelanggan?.name || "-", width)
      .row("Kendaraan", data.spk?.kendaraan ? `${data.spk.kendaraan.name} (${data.spk.kendaraan.plat})` : "-", width)
      .separator(width)
      .bold(1).line("RINCIAN:").bold(0);

    data.spk?.items?.forEach((item, i) => {
      encoder.line(`${i + 1}. ${item.nama} x${item.qty}`);
      encoder.align(2).line(formatRupiah(item.subtotal)).align(0);
    });

    data.spk?.stages?.forEach((stage, i) => {
      encoder.line(`${(data.spk?.items?.length || 0) + i + 1}. ${stage.nama}`);
      encoder.align(2).line(formatRupiah(stage.estimasiBiaya)).align(0);
    });

    encoder.separator(width, "=");
    
    if (Number(data.spk?.diskon) > 0) {
      encoder.row("DISKON", `-${formatRupiah(data.spk?.diskon)}`, width);
    }
    encoder.row("TOTAL TAGIHAN", formatRupiah(data.totalTagihan), width);
    encoder.row("DIBAYAR", formatRupiah(data.totalBayar), width);
    encoder.row("SISA", formatRupiah(data.sisaBayar), width);

    if (data.status === "lunas") {
      encoder.feed(1).align(1).bold(1).line("** LUNAS **").bold(0).align(0);
    }

    if (data.detail && data.detail.length > 0) {
      encoder.feed(1).align(0).bold(1).line("Riwayat Bayar:").bold(0);
      data.detail.forEach(trx => {
        const dateStr = new Date(trx.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
        encoder.row(`${dateStr} ${trx.metode.toUpperCase()}`, formatRupiah(trx.jumlah), width);
      });
    }

    encoder.feed(1)
      .align(1)
      .line("Terima kasih atas")
      .line("kepercayaan Anda")
      .feed(3)
      .initialize();

    return encoder.encode();
  };

  return (
    <PrintPageWrapper>
    <div className="bg-white min-h-screen text-black">
      {/* Toolbar */}
      <PrintToolbar 
        backHref={`/app/pembayaran/${id}`} 
        title={`Kwitansi — ${data.noInvoice}`} 
        onShareWhatsApp={handleShareWhatsApp}
        onPrintBluetooth={handlePrintBluetooth}
      />

      {/* ═══════════════════════════════════
          A4 FORMAT
         ═══════════════════════════════════ */}
      <div className="a4-only">
        <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 print:p-0 print:m-0">
          {/* Kop Surat */}
          <div className="border-b-2 border-black pb-4 mb-6 text-center">
            <h1 className="text-2xl font-black uppercase tracking-widest text-black">{getBengkelField(bengkel, "nama")}</h1>
            {getBengkelField(bengkel, "tagline") && <p className="text-sm uppercase font-semibold text-gray-700 tracking-wider">{getBengkelField(bengkel, "tagline")}</p>}
            <div className="text-xs text-gray-500 mt-2 space-y-0.5">
              {getBengkelField(bengkel, "alamat") && <p>{getBengkelField(bengkel, "alamat")}</p>}
              {getBengkelField(bengkel, "telepon") && <p>Telp: {getBengkelField(bengkel, "telepon")}</p>}
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
                  <tr><td className="text-gray-500 pb-1">Status</td><td className="font-bold uppercase pb-1">: <span className={data.status === "lunas" ? "text-emerald-600" : "text-amber-600"}>{statusLabel}</span></td></tr>
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
                {Number(data.spk?.diskon) > 0 && (
                  <tr>
                    <td colSpan={2} className="py-1 text-right pr-4 uppercase text-gray-700">Diskon</td>
                    <td className="py-1 text-right font-mono text-red-600">-{formatRupiah(data.spk?.diskon)}</td>
                  </tr>
                )}
                <tr>
                  <td colSpan={2} className="py-3 text-right pr-4 uppercase text-gray-700">Total Tagihan</td>
                  <td className="py-3 text-right font-mono text-base">{formatRupiah(data.totalTagihan)}</td>
                </tr>
                <tr>
                  <td colSpan={2} className="py-1 text-right pr-4 uppercase text-gray-700">Total Dibayar</td>
                  <td className="py-1 text-right font-mono text-base text-emerald-700">{formatRupiah(data.totalBayar)}</td>
                </tr>
                <tr>
                  <td colSpan={2} className="py-1 text-right pr-4 uppercase text-gray-700">Sisa Tagihan</td>
                  <td className={`py-1 text-right font-mono text-base ${Number(data.sisaBayar) > 0 ? "text-red-600" : "text-emerald-600"}`}>{formatRupiah(data.sisaBayar)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Riwayat Pembayaran */}
          {data.detail && data.detail.length > 0 && (
            <div className="mb-12">
              <h3 className="font-bold text-sm uppercase mb-3 text-gray-700">Riwayat Transaksi</h3>
              <table className="w-full text-sm">
                <thead className="border-y border-gray-300">
                  <tr>
                    <th className="py-2 text-left">Tanggal</th>
                    <th className="py-2 text-left">Metode</th>
                    <th className="py-2 text-left">Keterangan</th>
                    <th className="py-2 text-right">Jumlah</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.detail.map((trx) => (
                    <tr key={trx.id}>
                      <td className="py-1.5">{new Date(trx.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td className="py-1.5 uppercase font-medium">{trx.metode}</td>
                      <td className="py-1.5 text-gray-500">{trx.keterangan || "—"}</td>
                      <td className="py-1.5 text-right font-mono font-bold">{formatRupiah(trx.jumlah)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
            <p>Terima kasih atas kepercayaan Anda pada {getBengkelField(bengkel, "nama")}.</p>
            <p>Kwitansi ini adalah bukti pembayaran yang sah. Harap disimpan dengan baik.</p>
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

          {/* Title */}
          <div className="text-center my-1">
            <p className="text-[10px] font-bold uppercase tracking-wider">KWITANSI / INVOICE</p>
          </div>

          <ThermalSep />

          {/* Invoice Info */}
          <div className="space-y-0.5 text-[10px]">
            <ThermalRow label="No. Invoice" value={data.noInvoice} bold />
            <ThermalRow label="Tanggal" value={new Date(data.createdAt).toLocaleDateString("id-ID")} />
            <ThermalRow label="Ref. SPK" value={data.spk?.noSpk || "—"} />
            <ThermalRow label="Pelanggan" value={data.spk?.pelanggan?.name || "—"} />
            {data.spk?.pelanggan?.phone && <ThermalRow label="Telp" value={data.spk.pelanggan.phone} />}
            {data.spk?.kendaraan && (
              <ThermalRow label="Kendaraan" value={`${data.spk.kendaraan.name} (${data.spk.kendaraan.plat})`} />
            )}
          </div>

          <ThermalSep />

          {/* Items */}
          <p className="text-[9px] font-bold uppercase mb-1">Rincian:</p>
          <div className="space-y-0.5">
            {data.spk?.items && data.spk.items.map((item: SpkItem, i: number) => (
              <div key={`t-item-${i}`}>
                <p className="text-[10px] truncate">{i + 1}. {item.nama} x{item.qty}</p>
                <p className="text-[10px] text-right font-mono">{formatRupiah(item.subtotal)}</p>
              </div>
            ))}
            {data.spk?.stages && data.spk.stages.map((stage: SpkStage, i: number) => (
              <div key={`t-stage-${i}`}>
                <p className="text-[10px] truncate">{(data.spk?.items?.length || 0) + i + 1}. {stage.nama}</p>
                <p className="text-[10px] text-right font-mono">{formatRupiah(stage.estimasiBiaya)}</p>
              </div>
            ))}
          </div>

          <ThermalDoubleSep />

          {/* Totals */}
          <div className="space-y-0.5">
            {Number(data.spk?.diskon) > 0 && (
              <ThermalRow label="DISKON" value={`-${formatRupiah(data.spk?.diskon)}`} />
            )}
            <ThermalRow label="TOTAL TAGIHAN" value={formatRupiah(data.totalTagihan)} bold />
            <ThermalRow label="DIBAYAR" value={formatRupiah(data.totalBayar)} bold />
            <ThermalRow
              label="SISA"
              value={formatRupiah(data.sisaBayar)}
              bold
              className={Number(data.sisaBayar) === 0 ? "" : ""}
            />
          </div>

          {data.status === "lunas" && (
            <>
              <ThermalSep />
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-wide">** LUNAS **</p>
              </div>
            </>
          )}

          {/* Payment History */}
          {data.detail && data.detail.length > 0 && (
            <>
              <ThermalSep />
              <p className="text-[9px] font-bold uppercase mb-0.5">Riwayat Bayar:</p>
              {data.detail.map((trx) => (
                <div key={trx.id} className="flex justify-between text-[9px] leading-relaxed">
                  <span>
                    {new Date(trx.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })} {trx.metode.toUpperCase()}
                  </span>
                  <span className="font-mono font-bold">{formatRupiah(trx.jumlah)}</span>
                </div>
              ))}
            </>
          )}

          <ThermalDoubleSep />

          {/* Footer */}
          <div className="text-center text-[8px] text-gray-500 mt-1 space-y-0.5">
            <p className="font-medium">Terima kasih atas kepercayaan Anda</p>
            <p>pada {getBengkelField(bengkel, "nama")}</p>
            <p>Kwitansi ini bukti pembayaran sah</p>
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
