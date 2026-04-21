"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";

function JasaFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const isEdit = !!editId;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    kode: "",
    name: "",
    kategori: "Servis Rutin",
    harga: 0,
    estimasiWaktu: "",
    garansiHari: 0,
    deskripsi: ""
  });

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
            deskripsi: d.deskripsi || ""
          });
        })
        .catch(err => toast.error("Gagal", err.message || "Gagal memuat jasa"))
        .finally(() => setLoading(false));
    }
  }, [editId, isEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "harga" || name === "garansiHari" ? Number(value) : value
    }));
  };

  const handleSave = async () => {
    if (!formData.name) return toast.error("Validasi gagal", "Nama jasa wajib diisi");
    
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/jasa/${editId}`, formData);
        toast.success("Berhasil", "Data jasa diperbarui");
      } else {
        await api.post("/jasa", { ...formData, kode: formData.kode || undefined });
        toast.success("Berhasil", "Jasa baru ditambahkan");
      }
      router.push("/master/jasa");
    } catch (err: any) {
      toast.error("Gagal menyimpan", err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground"><Loader2 className="animate-spin inline mr-2"/> Memuat data dari server...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out max-w-3xl mx-auto mb-10">
      <div className="flex items-center gap-4">
        <Link href="/master/jasa" className="p-2 hover:bg-surface-hover rounded-xl border border-surface-border glass transition-colors"><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{isEdit ? "Edit Jasa" : "Tambah Jasa Baru"}</h1>
          <p className="text-muted-foreground text-sm">Lengkapi data jasa/layanan untuk katalog bengkel.</p>
        </div>
      </div>

      <div className="glass-panel p-6 space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
           <div className="space-y-1.5 md:col-span-2">
             <label className="text-xs font-medium text-muted-foreground">Nama Jasa / Layanan <span className="text-red-500">*</span></label>
             <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Contoh: Tune Up Standard Motor" className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
           </div>
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
            <input type="number" min="0" name="harga" value={formData.harga} onChange={handleChange} placeholder="0" className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Estimasi Durasi (Opsional)</label>
            <input type="text" name="estimasiWaktu" value={formData.estimasiWaktu} onChange={handleChange} placeholder="Cth: 30 menit / 1 Hari" className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Garansi (Hari)</label>
            <input type="number" name="garansiHari" value={formData.garansiHari} onChange={handleChange} min="0" placeholder="0 = tanpa garansi" className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm text-center font-mono focus:outline-none focus:ring-1 focus:ring-primary/50" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Deskripsi Pekerjaan / Keterangan</label>
          <textarea name="deskripsi" value={formData.deskripsi} onChange={handleChange} placeholder="Detail prosedur kerja..." className="w-full bg-surface border border-surface-border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 min-h-[100px] resize-y" />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Link href="/master/jasa" className="px-4 py-2.5 text-sm font-medium border border-surface-border rounded-xl hover:bg-surface transition-colors">Batal</Link>
        <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 text-sm font-bold bg-primary text-primary-foreground rounded-xl shadow-glossy-primary hover:shadow-glossy-primary-dark transition-all flex items-center gap-2 btn-glossy disabled:opacity-70 disabled:hover:bg-primary">
          {saving ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Simpan Jasa</>}
        </button>
      </div>
    </div>
  );
}

export default function TambahJasaPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground"><Loader2 className="animate-spin inline mr-2"/> Menyiapkan antarmuka...</div>}>
      <JasaFormContent />
    </Suspense>
  );
}
