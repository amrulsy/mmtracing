"use client";

import { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { api } from "@/lib/api";
import { formatRupiah } from "@/lib/utils";
import type { WorkOrder, SpkItem, SpkStage } from "@/lib/types";
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
 const [data, setData] = useState<WorkOrder | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState("");
 const [bengkel, setBengkel] = useState<BengkelProfile>({});
 const [format] = usePrintFormat();
 const printTriggered = useRef(false);

 useEffect(() => {
 Promise.all([
 api.get<WorkOrder>(`/work-order/${id}`),
 api.get<BengkelProfile>("/settings/profile"),
 ])
 .then(([spkRes, profileRes]) => {
 setData(spkRes.data);
 setBengkel(profileRes.data ?? {});
 })
 .catch(err => setError(err.message || "Gagal memuat Work Order"))
 .finally(() => setLoading(false));
 }, [id]);

 if (loading) return <div className="p-10 text-center font-mono">Menyiapkan dokumen cetak...</div>;
 if (error || !data) return <div className="p-10 text-center font-mono text-red-500">Error: {error}</div>;

 const sisaBayar = data.pembayaran?.[0]?.sisaBayar
 ?? Math.max(0, Number(data.totalHarga) - Number(data.diskon ?? 0) - Number(data.totalBayar));
 const isSelesai = data.status === "selesai";
 const isGatePassLocked = isSelesai && Number(sisaBayar) > 0;
 const documentTitle = "WORK ORDER";
 const isGatePass = false;
 const now = new Date();

 const handleShareWhatsApp = () => {
 if (!data) return;

 const items = data.items?.map((item, i) => `${i + 1}. ${item.nama} x${item.qty} = ${formatRupiah(item.subtotal)}`).join("\n") || "";
 const stages = data.stages?.map((s, i) => `${(data.items?.length || 0) + i + 1}. Tahap: ${s.nama} = ${formatRupiah(s.estimasiBiaya)}`).join("\n") || "";
 
 const text = `*${getBengkelField(bengkel, "nama")}*\n` +
 `${getBengkelField(bengkel, "alamat")}\n` +
 `${getBengkelField(bengkel, "telepon") ? `Telp: ${getBengkelField(bengkel, "telepon")}` : ""}\n\n` +
 `*${documentTitle}*\n` +
 `No: ${data.noWo}\n` +
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
 .row("No. WO", data.noWo, width)
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
 backHref={`/app/work-order/${id}`} 
 title={`Cetak Work Order — ${data.noWo}`} 
 onShareWhatsApp={handleShareWhatsApp}
 onPrintBluetooth={handlePrintBluetooth}
 />

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

 {/* WorkOrder Info */}
 <div className="space-y-0.5 text-[10px]">
 <ThermalRow label="No. WO" value={data.noWo} bold />
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
