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

 if (loading) return <div className="p-10 text-center font-mono">Menyiapkan dokumen kwitansi...</div>;
 if (error || !data) return <div className="p-10 text-center font-mono text-red-500">Error: {error}</div>;

 const statusLabel = data.status === "lunas" ? "LUNAS" : data.status === "parsial" ? "PARSIAL" : "BELUM BAYAR";

 const handleShareWhatsApp = () => {
 if (!data) return;

 const items = data.spk?.items?.map((item, i) => `${i + 1}. ${item.nama}\n   ${item.qty} x ${formatRupiah(Number(item.subtotal)/Number(item.qty))} = ${formatRupiah(item.subtotal)}`).join("\n") || "";
 const stages = data.spk?.stages?.map((s, i) => `${(data.spk?.items?.length || 0) + i + 1}. ${s.nama} = ${formatRupiah(s.estimasiBiaya)}`).join("\n") || "";

 const text = `*${getBengkelField(bengkel, "nama")}*\n` +
 `${getBengkelField(bengkel, "alamat")}\n` +
 `${getBengkelField(bengkel, "telepon") ? `Telp: ${getBengkelField(bengkel, "telepon")}` : ""}\n\n` +
 `*KWITANSI / INVOICE ${data.status === "lunas" ? "LUNAS" : "PARSIAL"}*\n` +
 `No: ${data.noInvoice}\n` +
 `Tgl: ${new Date(data.createdAt).toLocaleDateString("id-ID")}\n` +
 `Ref SPK: ${data.spk?.noWo || "-"}\n\n` +
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
 .row("Ref. WO", data.spk?.noWo || "-", width)
 .row("Pelanggan", data.spk?.pelanggan?.name || "-", width)
 .row("Kendaraan", data.spk?.kendaraan ? `${data.spk.kendaraan.name} (${data.spk.kendaraan.plat})` : "-", width)
 .separator(width)
 .bold(1).line("RINCIAN:").bold(0);

 data.spk?.items?.forEach((item, i) => {
 encoder.line(`${i + 1}. ${item.nama}`);
 const unitPrice = Number(item.subtotal) / Number(item.qty);
 encoder.align(2).line(`${item.qty} x ${formatRupiah(unitPrice)} = ${formatRupiah(item.subtotal)}`).align(0);
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
 <ThermalRow label="Ref. WO" value={data.spk?.noWo || "—"} />
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
 <p className="text-[10px] truncate">{i + 1}. {item.nama}</p>
 <div className="flex justify-between items-center">
 <p className="text-[9px] text-gray-500">{item.qty} x {formatRupiah(Number(item.subtotal) / Number(item.qty))}</p>
 <p className="text-[10px] text-right font-mono font-medium">{formatRupiah(item.subtotal)}</p>
 </div>
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
