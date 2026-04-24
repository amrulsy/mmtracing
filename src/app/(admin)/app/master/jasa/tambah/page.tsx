"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, Loader2, Plus, Trash2, Package } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";

interface BundleItem {
  tempId: string;
  sparepartId: number | "";
  qtyDefault: number;
}

interface SparepartOption {
  id: number;
  name: string;
  kode: string;
  hargaJual: number;
  satuan: string;
}

function JasaFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const isEdit = !!editId;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [spareparts, setSpareparts] = useState<SparepartOption[]>([]);
  const [sparepartLoading, setSparepartLoading] = useState(true);
  const [bundles, setBundles] = useState<BundleItem[]>([]);

  const [formData, setFormData] = useState({
    kode: "",
    name: "",
    kategori: "Servis Rutin",
    harga: 0,
    estimasiWaktu: "",
    garansiHari: 0,
  });

  useEffect(() => {
    api.getPaginated<SparepartOption>("/sparepart", { limit: 1000 })
      .then(res => setSpareparts(res.data || []))
      .catch(() => {})
      .finally(() => setSparepartLoading(false));
  }, []);

  useEffect(() => {
    if (isEdit) {
      api.get(`/jasa/${editId}`)
        .then(res => {
          const d = res.data as any;
          setFormData({
            kode: d.kode || "",
            name: d.name || "",
            kategori: d.kategori || "Servis Rutin",
            harga: Number(d.harga) || 0,
            estimasiWaktu: d.estimasiWaktu || "",
            garansiHari: d.garansiHari || 0,
          });
          setBundles(
            (d.sparepartBundles || []).map((b: any, i: number) => ({
              tempId: `existing-${i}-${b.sparepartId}`,
              sparepartId: b.sparepart?.id ?? b.sparepartId,
              qtyDefault: b.qtyDefault || 1,
            }))
          );
        })
        .catch((err: unknown) => toast.error("Gagal", err instanceof Error ? err.message : "Gagal memuat jasa"))
        .finally(() => setLoading(false));
    }
  }, [editId, isEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "harga" || name === "garansiHari" ? Number(value) : value,
    }));
  };

  const addBundle = () => setBundles(prev => [...prev, { tempId: `new-${Date.now()}`, sparepartId: "", qtyDefault: 1 }]);
  const removeBundle = (tempId: string) => setBundles(prev => prev.filter(b => b.tempId !== tempId));
  const updateBundle = (tempId: string, field: "sparepartId" | "qtyDefault", value: number | "") => {
    setBundles(prev => prev.map(b => b.tempId === tempId ? { ...b, [field]: value } : b));
  };

  const formatRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

  const estimasiBahan = bundles.reduce((sum, b) => {
    const sp = spareparts.find(s => s.id === b.sparepartId);
    return sum + (sp ? sp.hargaJual * b.qtyDefault : 0);
  }, 0);

  const handleSave = async () => {
    if (!formData.name) return toast.error("Validasi gagal", "Nama jasa wajib diisi");

    const validBundles = bundles.filter(b => b.sparepartId !== "");
    const ids = validBundles.map(b => b.sparepartId);
    if (ids.length !== new Set(ids).size)
      return toast.error("Validasi gagal", "Tidak boleh ada sparepart duplikat dalam bundle");
    if (validBundles.some(b => b.qtyDefault < 1))
      return toast.error("Validasi gagal", "Qty bundle minimal 1");

    setSaving(true);
    try {
      const payload = {
        ...formData,
        kode: formData.kode || undefined,
        sparepartBundles: validBundles.map(b => ({
          sparepartId: b.sparepartId as number,
          qtyDefault: b.qtyDefault,
        })),
      };
      if (isEdit) {
        await api.put(`/jasa/${editId}`, payload);
        toast.success("Berhasil", "Data jasa diperbarui");
      } else {
        await api.post("/jasa", payload);
        toast.success("Berhasil", "Jasa baru ditambahkan");
      }
      router.push("/app/master/jasa");
    } catch (err: unknown) {
      toast.error("Gagal menyimpan", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground"><Loader2 className="animate-spin inline mr-2" /> Memuat data dari server...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out max-w-3xl mx-auto mb-10">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/app/master/jasa" className="p-2 hover:bg-surface-hover rounded-xl border border-surface-border glass transition-colors"><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{isEdit ? "Edit Jasa" : "Tambah Jasa Baru"}</h1>
          <p className="text-muted-foreground text-sm">Lengkapi data jasa/layanan untuk katalog bengkel.</p>
        </div>
      </div>

      {/* Form Utama */}
      <div className="glass-panel p-6 space-y-5">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Nama Jasa / Layanan <span className="text-red-500">*</span></label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Contoh: Tune Up Standard Motor" className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Kategori Jasa</label>
            <select name="kategori" value={formData.kategori} onChange={handleChange} className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50">
              <option value="Servis Rutin">Servis Rutin</option>
              <option value="Servis Besar">Servis Besar</option>
              <option value="Servis Ringan">Servis Ringan</option>
              <option value="Modifikasi / Bubut">Modifikasi / Bubut</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Kode Jasa (Opsional)</label>
            <input type="text" name="kode" value={formData.kode} onChange={handleChange} placeholder="Kosongkan untuk otomatis (JS-XXX)" className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tarif Jasa (Rp) <span className="text-red-500">*</span></label>
            <input type="number" min="0" name="harga" value={formData.harga} onChange={handleChange} className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Estimasi Durasi (Opsional)</label>
            <input type="text" name="estimasiWaktu" value={formData.estimasiWaktu} onChange={handleChange} placeholder="Cth: 30 menit / 1 Hari" className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Garansi (Hari)</label>
            <input type="number" min="0" name="garansiHari" value={formData.garansiHari} onChange={handleChange} placeholder="0 = tanpa garansi" className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm text-center font-mono focus:outline-none focus:ring-1 focus:ring-primary/50" />
          </div>
        </div>
      </div>

      {/* Sparepart Bundle Section */}
      <div className="glass-panel p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2"><Package size={15} className="text-primary" /> Paket Sparepart Bawaan</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Sparepart yang otomatis ditambahkan ke SPK saat jasa ini dipilih.</p>
          </div>
          <button onClick={addBundle} disabled={sparepartLoading}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-primary/40 text-primary hover:bg-primary/5 font-medium shrink-0 disabled:opacity-50 transition-colors">
            <Plus size={13} /> Tambah
          </button>
        </div>

        {sparepartLoading ? (
          <div className="py-5 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 size={13} className="animate-spin" /> Memuat katalog sparepart...
          </div>
        ) : bundles.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground border-2 border-dashed border-surface-border rounded-xl">
            Belum ada paket sparepart. Klik <strong>Tambah</strong> untuk menambahkan.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="hidden sm:grid grid-cols-[1fr_72px_120px_32px] gap-2 px-1 text-[10px] font-semibold uppercase text-muted-foreground">
              <span>Sparepart</span>
              <span className="text-center">Qty</span>
              <span className="text-right">Harga / satuan</span>
              <span />
            </div>

            {bundles.map(b => {
              const sp = spareparts.find(s => s.id === b.sparepartId);
              const isDup = b.sparepartId !== "" && bundles.filter(x => x.sparepartId === b.sparepartId).length > 1;
              return (
                <div key={b.tempId} className={`grid grid-cols-[1fr_72px_120px_32px] gap-2 items-center p-1 rounded-xl transition-colors ${isDup ? "bg-red-500/5 ring-1 ring-red-400/40" : ""}`}>
                  <select
                    value={b.sparepartId}
                    onChange={e => updateBundle(b.tempId, "sparepartId", e.target.value ? Number(e.target.value) : "")}
                    className={`w-full bg-surface border ${isDup ? "border-red-400" : "border-surface-border"} rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50`}>
                    <option value="">-- Pilih Sparepart --</option>
                    {spareparts.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.kode})</option>
                    ))}
                  </select>
                  <input
                    type="number" min="1" value={b.qtyDefault}
                    onChange={e => updateBundle(b.tempId, "qtyDefault", Math.max(1, Number(e.target.value)))}
                    className="w-full bg-surface border border-surface-border rounded-lg px-2 py-2 text-xs text-center font-mono focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  <div className="text-right text-xs font-mono leading-tight">
                    {sp ? (
                      <>
                        <p className="font-bold">{formatRp(sp.hargaJual)}</p>
                        <p className="text-[9px] text-muted-foreground">/{sp.satuan}</p>
                      </>
                    ) : <span className="text-muted-foreground">—</span>}
                  </div>
                  <button onClick={() => removeBundle(b.tempId)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}

            <div className="flex items-center justify-between pt-3 border-t border-surface-border">
              <span className="text-xs text-muted-foreground">
                {bundles.filter(b => b.sparepartId !== "").length} sparepart · estimasi biaya bahan
              </span>
              <span className="text-sm font-bold font-mono text-primary">{formatRp(estimasiBahan)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Link href="/app/master/jasa" className="px-4 py-2.5 text-sm font-medium border border-surface-border rounded-xl hover:bg-surface transition-colors">Batal</Link>
        <button onClick={handleSave} disabled={saving}
          className="px-6 py-2.5 text-sm font-bold bg-primary text-primary-foreground rounded-xl shadow-glossy-primary hover:shadow-glossy-primary-dark transition-all flex items-center gap-2 btn-glossy disabled:opacity-70 disabled:hover:bg-primary">
          {saving ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Simpan Jasa</>}
        </button>
      </div>
    </div>
  );
}

export default function TambahJasaPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground"><Loader2 className="animate-spin inline mr-2" /> Menyiapkan antarmuka...</div>}>
      <JasaFormContent />
    </Suspense>
  );
}
