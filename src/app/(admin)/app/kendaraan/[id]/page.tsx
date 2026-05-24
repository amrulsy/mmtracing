"use client";

import { useEffect, useState, use, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft, Save, Loader2, Car, User, History, Edit, Trash2,
  AlertTriangle, Gauge, Calendar, Palette, Hash, Wrench, Printer, Bell,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { useAuth } from "@/lib/auth";
import { formatRupiah, formatTanggal } from "@/lib/utils";
import { isValidPlat, normalizePlat } from "@/lib/validators";
import { PhotoUploader } from "@/components/ui/photo-uploader";
import type { Kendaraan, Spk } from "@/lib/types";

interface KendaraanDetail extends Kendaraan {
  spk?: Spk[];
  inspeksi?: Array<{ id: number; tanggal: string; catatan?: string | null }>;
}

export default function DetailKendaraanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.roleName === "Admin";

  const [data, setData] = useState<KendaraanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    name: "", plat: "", tahun: "", warna: "",
    noRangka: "", noMesin: "", odometer: "",
    photoUrl: "" as string | null,
    nextServiceDate: "",
    nextServiceKm: "",
  });
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get<KendaraanDetail>(`/kendaraan/${id}`)
      .then((res) => setData(res.data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Gagal memuat data kendaraan"))
      .finally(() => setLoading(false));
  }, [id]);

  // Esc untuk tutup modal edit
  useEffect(() => {
    if (!showEdit) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setShowEdit(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showEdit]);

  const openEdit = () => {
    if (!data) return;
    setForm({
      name: data.name,
      plat: data.plat,
      tahun: data.tahun || "",
      warna: data.warna || "",
      noRangka: data.noRangka || "",
      noMesin: data.noMesin || "",
      odometer: data.odometer?.toString() || "",
      photoUrl: data.photoUrl || null,
      nextServiceDate: data.nextServiceDate ? data.nextServiceDate.slice(0, 10) : "",
      nextServiceKm: data.nextServiceKm?.toString() || "",
    });
    setShowEdit(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!data) return;
    if (!form.name.trim() || !form.plat.trim()) {
      return toast.error("Wajib Diisi", "Nama dan plat kendaraan wajib diisi.");
    }
    if (!isValidPlat(form.plat)) {
      return toast.error("Format Plat Tidak Valid", `"${form.plat}" bukan format plat yang valid. Contoh: B 1234 ABC`);
    }
    setSaving(true);
    try {
      const res = await api.put<KendaraanDetail>(`/kendaraan/${data.id}`, {
        name: form.name.trim(),
        plat: normalizePlat(form.plat),
        tahun: form.tahun || undefined,
        warna: form.warna || undefined,
        noRangka: form.noRangka || undefined,
        noMesin: form.noMesin || undefined,
        odometer: form.odometer ? Number(form.odometer) : undefined,
        photoUrl: form.photoUrl || "",
        nextServiceDate: form.nextServiceDate ? new Date(form.nextServiceDate).toISOString() : null,
        nextServiceKm: form.nextServiceKm ? Number(form.nextServiceKm) : null,
      });
      setData({ ...data, ...res.data });
      toast.success("Berhasil", "Data kendaraan diperbarui.");
      setShowEdit(false);
    } catch (err: unknown) {
      toast.error("Gagal Menyimpan", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!data) return;
    const spkCount = data.spk?.length ?? 0;
    if (spkCount > 0) {
      return toast.error("Tidak Dapat Dihapus", `Kendaraan masih terhubung dengan ${spkCount} SPK.`);
    }
    toast.confirm(
      `Yakin ingin menghapus kendaraan "${data.name} (${data.plat})"? Tindakan ini tidak bisa dibatalkan.`,
      async () => {
        setDeleting(true);
        try {
          await api.delete(`/kendaraan/${data.id}`);
          toast.success("Dihapus", "Kendaraan berhasil dihapus.");
          router.push("/app/kendaraan");
        } catch (err: unknown) {
          toast.error("Gagal Menghapus", err instanceof Error ? err.message : "Terjadi kesalahan");
        } finally {
          setDeleting(false);
        }
      }
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <AlertTriangle size={32} className="text-red-500" />
        <p className="text-muted-foreground text-sm">{error || "Kendaraan tidak ditemukan"}</p>
        <Link href="/app/kendaraan" className="text-primary text-sm font-medium hover:underline">
          Kembali ke daftar
        </Link>
      </div>
    );
  }

  const spkList = data.spk ?? [];
  const inspeksiList = data.inspeksi ?? [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/app/kendaraan" className="p-2 hover:bg-surface-hover rounded-xl border border-surface-border glass transition-colors flex-shrink-0">
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight truncate">{data.name}</h1>
            <p className="text-muted-foreground text-sm font-mono">{data.plat}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowQR(true)}
            aria-label="Tampilkan QR Code"
            className="flex items-center gap-1.5 text-sm font-medium bg-surface border border-surface-border hover:bg-surface-hover px-3 py-2 rounded-xl"
          >
            <Printer size={14} /> QR
          </button>
          <button
            onClick={openEdit}
            className="flex items-center gap-1.5 text-sm font-medium bg-surface border border-surface-border hover:bg-surface-hover px-3 py-2 rounded-xl"
          >
            <Edit size={14} /> Edit
          </button>
          <Link
            href={`/app/spk/create?pelangganId=${data.pelangganId}&kendaraanId=${data.id}`}
            className="flex items-center gap-1.5 text-sm font-bold bg-primary text-primary-foreground px-3 py-2 rounded-xl shadow-glossy-primary hover:shadow-glossy-primary-dark btn-glossy"
          >
            <Wrench size={14} /> Buat SPK
          </Link>
        </div>
      </div>

      {/* Foto & reminder servis */}
      {(data.photoUrl || data.nextServiceDate || data.nextServiceKm) && (
        <div className="glass-panel p-4 flex items-center gap-4">
          {data.photoUrl && (
            <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-surface-hover">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.photoUrl} alt={data.name} className="w-full h-full object-cover" />
            </div>
          )}
          {(data.nextServiceDate || data.nextServiceKm) && (() => {
            const nextDate = data.nextServiceDate ? new Date(data.nextServiceDate) : null;
            const today = new Date();
            const isOverdue = !!(nextDate && nextDate < today);
            const daysLeft = nextDate ? Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
            return (
              <div className={`flex-1 flex items-center gap-3 p-3 rounded-xl ${isOverdue ? "bg-red-500/5 border border-red-500/20" : "bg-amber-500/5 border border-amber-500/20"}`}>
                <Bell size={20} className={isOverdue ? "text-red-600" : "text-amber-600"} />
                <div className="min-w-0">
                  <p className={`text-xs font-bold ${isOverdue ? "text-red-600" : "text-amber-600"}`}>
                    {isOverdue ? "Servis Sudah Lewat" : "Reminder Servis Berikutnya"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {data.nextServiceDate && `${formatTanggal(data.nextServiceDate)}${daysLeft !== null && !isOverdue ? ` (${daysLeft} hari lagi)` : isOverdue ? ` (terlewat ${Math.abs(daysLeft!)} hari)` : ""}`}
                    {data.nextServiceKm && ` • Target ${data.nextServiceKm.toLocaleString("id-ID")} km`}
                  </p>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Info Pemilik */}
      {data.pelanggan && (
        <Link
          href="/app/kendaraan"
          className="glass-panel p-4 flex items-center gap-4 hover:bg-surface-hover/40 transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
            <User size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Pemilik Kendaraan</p>
            <p className="font-semibold truncate">{data.pelanggan.name}</p>
            <p className="text-xs text-muted-foreground">{data.pelanggan.phone}</p>
          </div>
        </Link>
      )}

      {/* Spesifikasi */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
          <Car size={20} className="text-primary" /> Spesifikasi Kendaraan
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InfoItem icon={<Calendar size={14} />} label="Tahun" value={data.tahun} />
          <InfoItem icon={<Palette size={14} />} label="Warna" value={data.warna} />
          <InfoItem icon={<Gauge size={14} />} label="Odometer" value={data.odometer ? `${data.odometer.toLocaleString("id-ID")} km` : undefined} />
          <InfoItem icon={<Hash size={14} />} label="No. Rangka" value={data.noRangka} mono />
          <InfoItem icon={<Hash size={14} />} label="No. Mesin" value={data.noMesin} mono />
          <InfoItem icon={<Calendar size={14} />} label="Terdaftar Sejak" value={formatTanggal(data.createdAt)} />
        </div>
      </div>

      {/* Riwayat SPK */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
          <History size={20} className="text-primary" /> Riwayat Servis ({spkList.length})
        </h3>
        {spkList.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-surface-border rounded-xl">
            <p className="text-sm text-muted-foreground">Belum ada riwayat SPK</p>
          </div>
        ) : (
          <div className="space-y-2">
            {spkList.map((spk) => (
              <Link
                key={spk.id}
                href={`/app/spk/${spk.id}`}
                className="flex items-center justify-between p-3 border border-surface-border rounded-xl hover:bg-surface-hover transition-colors gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold">{spk.noSpk}</span>
                    <StatusBadge status={spk.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {formatTanggal(spk.tanggal)}
                    {spk.mekanik && ` • ${spk.mekanik.name}`}
                    {spk.keluhan && ` • ${spk.keluhan}`}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold">{formatRupiah(spk.totalHarga, "compact")}</p>
                  <p className="text-[10px] text-muted-foreground">Progress {spk.progress}%</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Riwayat Inspeksi */}
      {inspeksiList.length > 0 && (
        <div className="glass-panel p-6">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
            <Wrench size={20} className="text-primary" /> Riwayat Inspeksi
          </h3>
          <div className="space-y-2">
            {inspeksiList.map((i) => (
              <div key={i.id} className="p-3 border border-surface-border rounded-xl">
                <p className="text-sm font-medium">{formatTanggal(i.tanggal)}</p>
                {i.catatan && <p className="text-xs text-muted-foreground mt-1">{i.catatan}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin: Delete */}
      {isAdmin && (
        <div className="glass-panel p-4 border-red-500/20 border bg-red-500/5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-bold text-red-600">Hapus Kendaraan</p>
              <p className="text-xs text-muted-foreground">Hanya dapat dilakukan jika tidak ada SPK terkait.</p>
            </div>
            <button
              onClick={handleDelete}
              disabled={deleting || spkList.length > 0}
              className="flex items-center gap-2 text-xs font-bold px-4 py-2 bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/30 rounded-xl transition-colors disabled:opacity-40 disabled:pointer-events-none flex-shrink-0"
            >
              <Trash2 size={14} /> {deleting ? "Menghapus..." : "Hapus"}
            </button>
          </div>
          {spkList.length > 0 && (
            <p className="text-[10px] text-amber-600 mt-2 flex items-center gap-1">
              <AlertTriangle size={10} /> Kendaraan memiliki {spkList.length} SPK dan tidak dapat dihapus.
            </p>
          )}
        </div>
      )}

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-1 text-black">{data.name}</h3>
            <p className="font-mono text-sm mb-4 text-gray-600">{data.plat}</p>
            <div className="flex justify-center mb-4 p-4 bg-white">
              <QRCodeSVG value={typeof window !== "undefined" ? `${window.location.origin}/app/kendaraan/${data.id}` : ""} size={220} level="M" />
            </div>
            <p className="text-[10px] text-gray-500 mb-4">Scan untuk buka detail kendaraan di sistem MMT Racing</p>
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="flex-1 px-4 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-xl flex items-center justify-center gap-2">
                <Printer size={14} /> Cetak
              </button>
              <button onClick={() => setShowQR(false)} className="flex-1 px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded-xl">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-surface border border-surface-border shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-surface-border flex justify-between items-center bg-surface-hover/50">
              <h3 className="font-bold text-lg text-primary">Edit Kendaraan</h3>
              <button onClick={() => setShowEdit(false)} aria-label="Tutup" className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex justify-center pb-2">
                <PhotoUploader value={form.photoUrl} onChange={(url) => setForm({ ...form, photoUrl: url })} size={100} shape="rounded" label="Upload foto kendaraan" />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Nomor Polisi" required>
                  <input type="text" value={form.plat} onChange={e => setForm({ ...form, plat: e.target.value })} required placeholder="AB 1234 CD"
                    className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono uppercase" />
                </Field>
                <Field label="Nama / Tipe" required>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                    className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </Field>
                <Field label="Tahun">
                  <input type="number" min="1980" max="2030" value={form.tahun} onChange={e => setForm({ ...form, tahun: e.target.value })}
                    className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </Field>
                <Field label="Warna">
                  <input type="text" value={form.warna} onChange={e => setForm({ ...form, warna: e.target.value })}
                    className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </Field>
                <Field label="Odometer (km)">
                  <input type="number" min="0" value={form.odometer} onChange={e => setForm({ ...form, odometer: e.target.value })}
                    className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </Field>
                <Field label="No. Rangka">
                  <input type="text" value={form.noRangka} onChange={e => setForm({ ...form, noRangka: e.target.value })}
                    className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono" />
                </Field>
                <Field label="No. Mesin">
                  <input type="text" value={form.noMesin} onChange={e => setForm({ ...form, noMesin: e.target.value })}
                    className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono" />
                </Field>
                <Field label="Reminder Servis (Tanggal)">
                  <input type="date" value={form.nextServiceDate} onChange={e => setForm({ ...form, nextServiceDate: e.target.value })}
                    className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </Field>
                <Field label="Reminder Servis (km)">
                  <input type="number" min="0" value={form.nextServiceKm} onChange={e => setForm({ ...form, nextServiceKm: e.target.value })}
                    placeholder="mis. 50000"
                    className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </Field>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-surface-border">
                <button type="button" onClick={() => setShowEdit(false)}
                  className="px-4 py-2 text-sm font-medium border border-surface-border rounded-xl hover:bg-surface-hover">
                  Batal
                </button>
                <button type="submit" disabled={saving}
                  className="px-5 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-xl shadow-glossy-primary hover:shadow-glossy-primary-dark transition-all disabled:opacity-70 flex items-center gap-2">
                  {saving ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : <><Save size={16} /> Simpan</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
        {icon} {label}
      </p>
      <p className={`text-sm font-semibold ${mono ? "font-mono" : ""}`}>{value || "—"}</p>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    antri: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    dikerjakan: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    kendala: "bg-red-500/10 text-red-600 border-red-500/20",
    selesai: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    dibatalkan: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  };
  return (
    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${colors[status] || colors.antri}`}>
      {status}
    </span>
  );
}
