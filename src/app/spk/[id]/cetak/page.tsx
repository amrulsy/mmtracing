"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer, Loader2, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import type { Spk } from "@/lib/types";

interface BengkelProfile {
  nama?: string;
  alamat?: string;
  telepon?: string;
  whatsapp?: string;
  email?: string;
  pemilik?: string;
}

function InfoRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex text-sm">
      <span className="w-28 text-gray-500 print:text-black shrink-0">{label}</span>
      <span className={`font-medium text-black ${mono ? "font-mono" : ""}`}>: {value || "—"}</span>
    </div>
  );
}

export default function CetakSpkPage() {
  const params = useParams();
  const id = params.id as string;

  const [spk, setSpk] = useState<Spk | null>(null);
  const [bengkel, setBengkel] = useState<BengkelProfile>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.get<Spk>(`/spk/${id}`),
      api.get<BengkelProfile>("/settings/profile"),
    ])
      .then(([spkRes, bengkelRes]) => {
        setSpk(spkRes.data);
        setBengkel(bengkelRes.data ?? {});
      })
      .catch((err) => setError(err.message || "Gagal memuat data"))
      .finally(() => setLoading(false));
  }, [id]);

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

  const statusLabel: Record<string, string> = {
    antri: "Antri",
    dikerjakan: "Dalam Pengerjaan",
    kendala: "Ada Kendala",
    selesai: "Selesai",
    dibatalkan: "Dibatalkan",
  };

  // ── Loading / Error ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-muted-foreground animate-in fade-in">
        <Loader2 size={32} className="animate-spin text-primary" />
        <p className="text-sm">Memuat dokumen SPK...</p>
      </div>
    );
  }

  if (error || !spk) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 animate-in fade-in">
        <AlertTriangle size={32} className="text-red-500" />
        <p className="text-muted-foreground text-sm">{error || "Data SPK tidak ditemukan"}</p>
        <Link href={`/spk/${id}`} className="text-primary text-sm font-medium hover:underline">
          ← Kembali ke SPK
        </Link>
      </div>
    );
  }

  // ── Hitung total ──────────────────────────────────────────────
  const hasItems = spk.items && spk.items.length > 0;
  const hasStages = spk.stages && spk.stages.length > 0;
  const totalHarga = Number(spk.totalHarga ?? 0);
  const minimumDp = Number(spk.minimumDp ?? 0);

  // Estimasi selesai dari stages: jumlah durasi hari
  let estimasiHari = 0;
  if (hasStages) {
    estimasiHari = spk.stages!.reduce((s, st) => s + (st.durasiHari ?? 0), 0);
  }
  const estimasiSelesai = spk.startedAt
    ? (() => {
        const d = new Date(spk.startedAt);
        d.setDate(d.getDate() + estimasiHari);
        return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
      })()
    : estimasiHari > 0
    ? `± ${estimasiHari} hari`
    : "—";

  const bengkelNama = bengkel.nama || "BENGKEL MM TRACING";
  const bengkelAlamat = bengkel.alamat || "—";
  const bengkelTelepon = bengkel.telepon || "—";
  const bengkelWa = bengkel.whatsapp || bengkel.telepon || "—";

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* ── Kontrol (hidden saat print) ─────────────────────────── */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link
            href={`/spk/${id}`}
            className="p-2 hover:bg-surface-hover rounded-xl border border-surface-border glass transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Preview Cetak SPK</h1>
            <p className="text-xs text-muted-foreground">{spk.noSpk}</p>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 text-sm bg-primary text-primary-foreground px-4 py-2 rounded-xl font-medium shadow-glossy-primary hover:shadow-glossy-primary-dark btn-glossy"
        >
          <Printer size={16} /> Cetak / Print
        </button>
      </div>

      {/* ── Dokumen Cetak ───────────────────────────────────────── */}
      <div className="bg-white border border-surface-border rounded-2xl print:border-none print:rounded-none max-w-3xl mx-auto p-8 text-black print:shadow-none shadow-lg">

        {/* Header Bengkel */}
        <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight uppercase">{bengkelNama}</h1>
            <p className="text-xs mt-1 text-gray-600">{bengkelAlamat}</p>
            {bengkelTelepon !== "—" && (
              <p className="text-xs text-gray-600">Telp: {bengkelTelepon} {bengkelWa !== bengkelTelepon ? `| WA: ${bengkelWa}` : ""}</p>
            )}
            {bengkel.email && <p className="text-xs text-gray-600">{bengkel.email}</p>}
          </div>
          <div className="text-right">
            <p className="text-lg font-bold uppercase tracking-wide">Surat Perintah Kerja</p>
            <p className="text-sm font-mono font-bold mt-1 bg-gray-100 px-3 py-1 rounded inline-block">{spk.noSpk}</p>
            <p className="text-xs text-gray-600 mt-1">{formatDate(spk.createdAt)}</p>
            <span className="inline-block mt-1 text-[10px] font-bold uppercase px-2 py-0.5 bg-gray-200 rounded tracking-wider">
              {statusLabel[spk.status] ?? spk.status}
            </span>
          </div>
        </div>

        {/* Info Grid: Pelanggan + Kendaraan */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="space-y-1.5">
            <h3 className="font-bold text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-300 pb-1 mb-2">Data Pelanggan</h3>
            <InfoRow label="Nama" value={spk.pelanggan?.name} />
            <InfoRow label="Telepon" value={spk.pelanggan?.phone} />
            {spk.pelanggan?.address && <InfoRow label="Alamat" value={spk.pelanggan.address} />}
          </div>
          <div className="space-y-1.5">
            {spk.kendaraan ? (
              <>
                <h3 className="font-bold text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-300 pb-1 mb-2">Data Kendaraan</h3>
                <InfoRow label="Kendaraan" value={spk.kendaraan.name} />
                <InfoRow label="No. Polisi" value={spk.kendaraan.plat} mono />
                {spk.kendaraan.tahun && <InfoRow label="Tahun" value={spk.kendaraan.tahun} />}
                {spk.kendaraan.warna && <InfoRow label="Warna" value={spk.kendaraan.warna} />}
                {spk.kendaraan.noMesin && <InfoRow label="No. Mesin" value={spk.kendaraan.noMesin} mono />}
              </>
            ) : (
              <>
                <h3 className="font-bold text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-300 pb-1 mb-2">Info Pekerjaan</h3>
                {spk.judulProyek && <InfoRow label="Judul" value={spk.judulProyek} />}
                {spk.spesifikasi && <InfoRow label="Spesifikasi" value={spk.spesifikasi} />}
              </>
            )}
          </div>
        </div>

        {/* Jenis Pekerjaan & Keluhan */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Jenis Pekerjaan:</span>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-200 border border-gray-400 uppercase">{spk.mode}</span>
            {spk.prioritas && spk.prioritas !== "normal" && (
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 border border-red-300 uppercase text-red-700">{spk.prioritas}</span>
            )}
          </div>
          {spk.judulProyek && spk.kendaraan && (
            <p className="text-sm text-gray-700 mb-1"><span className="font-semibold">Judul Proyek:</span> {spk.judulProyek}</p>
          )}
          {spk.keluhan && (
            <p className="text-sm border border-gray-300 rounded-lg p-3 bg-gray-50 text-gray-800">
              <span className="font-semibold">Keluhan / Keterangan:</span> {spk.keluhan}
            </p>
          )}
          {spk.spesifikasi && spk.kendaraan && (
            <p className="text-sm border border-gray-300 rounded-lg p-3 bg-gray-50 text-gray-800 mt-2">
              <span className="font-semibold">Spesifikasi:</span> {spk.spesifikasi}
            </p>
          )}
        </div>

        {/* ── Tabel Tahapan (mode modifikasi/bubut dengan stages) ── */}
        {hasStages && (
          <div className="mb-6">
            <h3 className="font-bold text-[11px] uppercase tracking-wider text-gray-500 mb-2">
              Tahapan &amp; Estimasi Pekerjaan
            </h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-y-2 border-black">
                  <th className="py-2 text-left font-bold w-8">No</th>
                  <th className="py-2 text-left font-bold">Tahapan Pekerjaan</th>
                  <th className="py-2 text-center font-bold w-20">Durasi</th>
                  <th className="py-2 text-right font-bold w-32">Estimasi Biaya</th>
                </tr>
              </thead>
              <tbody>
                {spk.stages!.map((stage) => (
                  <tr key={stage.id} className="border-b border-gray-300">
                    <td className="py-2 text-gray-600">{stage.urutan}</td>
                    <td className="py-2">
                      <span className={stage.status === "done" ? "line-through text-gray-400" : ""}>{stage.nama}</span>
                      {stage.status === "done" && (
                        <span className="ml-2 text-[10px] text-green-700 font-bold uppercase bg-green-100 px-1.5 py-0.5 rounded">✓ Selesai</span>
                      )}
                    </td>
                    <td className="py-2 text-center text-gray-600">{stage.durasiHari} hari</td>
                    <td className="py-2 text-right font-mono">{formatRp(stage.estimasiBiaya)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-black">
                  <td colSpan={3} className="py-2 text-right font-bold">TOTAL ESTIMASI</td>
                  <td className="py-2 text-right font-bold font-mono text-base">{formatRp(totalHarga)}</td>
                </tr>
                {minimumDp > 0 && (
                  <tr>
                    <td colSpan={3} className="py-1 text-right text-gray-500 text-xs">DP Minimum (40%)</td>
                    <td className="py-1 text-right font-mono font-semibold">{formatRp(minimumDp)}</td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        )}

        {/* ── Tabel Item (sparepart / jasa) ──────────────────────── */}
        {hasItems && (
          <div className="mb-6">
            <h3 className="font-bold text-[11px] uppercase tracking-wider text-gray-500 mb-2">
              Rincian Pekerjaan &amp; Sparepart
            </h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-y-2 border-black">
                  <th className="py-2 text-left font-bold w-8">No</th>
                  <th className="py-2 text-left font-bold">Uraian</th>
                  <th className="py-2 text-center font-bold w-12">Tipe</th>
                  <th className="py-2 text-center font-bold w-12">Qty</th>
                  <th className="py-2 text-right font-bold w-28">Harga</th>
                  <th className="py-2 text-right font-bold w-28">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {spk.items!.map((item, i) => (
                  <tr key={item.id} className="border-b border-gray-300">
                    <td className="py-2 text-gray-600">{i + 1}</td>
                    <td className="py-2">
                      <span className={item.status === "done" ? "line-through text-gray-400" : ""}>{item.nama}</span>
                      {item.status === "done" && (
                        <span className="ml-2 text-[10px] text-green-700 font-bold uppercase bg-green-100 px-1.5 py-0.5 rounded">✓</span>
                      )}
                    </td>
                    <td className="py-2 text-center">
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border border-gray-400 bg-gray-100">
                        {item.type === "sparepart" ? "Part" : "Jasa"}
                      </span>
                    </td>
                    <td className="py-2 text-center">{item.qty}</td>
                    <td className="py-2 text-right font-mono text-xs">{formatRp(Number(item.hargaSatuan))}</td>
                    <td className="py-2 text-right font-mono">{formatRp(Number(item.subtotal))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-black">
                  <td colSpan={5} className="py-2 text-right font-bold">TOTAL</td>
                  <td className="py-2 text-right font-bold font-mono text-base">{formatRp(totalHarga)}</td>
                </tr>
                {minimumDp > 0 && (
                  <tr>
                    <td colSpan={5} className="py-1 text-right text-gray-500 text-xs">DP Minimum (40%)</td>
                    <td className="py-1 text-right font-mono font-semibold">{formatRp(minimumDp)}</td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        )}

        {/* Tidak ada item / stage */}
        {!hasItems && !hasStages && (
          <div className="mb-6 border border-gray-300 rounded-lg p-4 text-center text-gray-500 text-sm">
            Belum ada rincian pekerjaan.
          </div>
        )}

        {/* Catatan */}
        {spk.catatan && (
          <div className="mb-5 p-3 border border-gray-300 rounded-lg bg-yellow-50">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Catatan / Kendala</p>
            <p className="text-sm text-gray-800">{spk.catatan}</p>
          </div>
        )}

        {/* Detail Mekanik & Status */}
        <div className="grid grid-cols-2 gap-6 mb-8 text-sm">
          <div className="space-y-1">
            <InfoRow label="Mekanik" value={spk.mekanik?.name ?? "Belum ditugaskan"} />
            <InfoRow label="Mulai" value={formatDate(spk.startedAt)} />
            {(hasStages || spk.startedAt) && (
              <InfoRow label="Est. Selesai" value={estimasiSelesai} />
            )}
            {spk.completedAt && <InfoRow label="Selesai" value={formatDate(spk.completedAt)} />}
          </div>
          <div className="space-y-1">
            <InfoRow label="Dibuat oleh" value={spk.createdBy?.name ?? "—"} />
            <InfoRow label="Status" value={statusLabel[spk.status] ?? spk.status} />
            <InfoRow label="Progres" value={`${spk.progress ?? 0}%`} />
          </div>
        </div>

        {/* Tanda Tangan */}
        <div className="grid grid-cols-3 gap-8 text-center text-sm mt-10 pt-4 border-t-2 border-black">
          <div>
            <p className="font-medium mb-16">Pelanggan</p>
            <div className="border-b border-black mx-4" />
            <p className="text-xs text-gray-600 mt-1">( {spk.pelanggan?.name ?? "—"} )</p>
          </div>
          <div>
            <p className="font-medium mb-16">Service Advisor</p>
            <div className="border-b border-black mx-4" />
            <p className="text-xs text-gray-600 mt-1">( {spk.createdBy?.name ?? "—"} )</p>
          </div>
          <div>
            <p className="font-medium mb-16">Pemilik Bengkel</p>
            <div className="border-b border-black mx-4" />
            <p className="text-xs text-gray-600 mt-1">( {bengkel.pemilik ?? "—"} )</p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-[10px] text-center text-gray-400 mt-8">
          Dokumen ini dicetak otomatis oleh Sistem MM Tracing &bull; {spk.noSpk} &bull; {formatDate(new Date().toISOString())}
        </p>
        <p className="text-[10px] text-center text-gray-400">
          Berlaku sebagai bukti perintah kerja resmi {bengkelNama}.
        </p>
      </div>
    </div>
  );
}
