"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus, Trash2, Loader2, Car, User } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { isValidPlat, normalizePlat } from "@/lib/validators";
import type { Pelanggan } from "@/lib/types";

interface KendaraanInput {
  uid: string;
  plat: string;
  name: string;
  merk: string;
  tahun: string;
  warna: string;
  noRangka: string;
  noMesin: string;
  odometer: string;
}

// Merk hanya helper untuk auto-fill nama kendaraan (tidak disimpan terpisah di DB).
const MERKS = [
  "Honda", "Yamaha", "Suzuki", "Kawasaki", "KTM", "TVS", "Royal Enfield",
  "Toyota", "Daihatsu", "Mitsubishi", "Nissan", "Hyundai", "Wuling", "Lainnya",
];

export default function TambahKendaraanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Pelanggan data
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState<"kendaraan" | "bubut" | "both">("kendaraan");

  // Kendaraan list
  const [kendaraanList, setKendaraanList] = useState<KendaraanInput[]>([
    { uid: "1", plat: "", name: "", merk: "", tahun: "", warna: "", noRangka: "", noMesin: "", odometer: "" }
  ]);

  const addKendaraan = () => {
    setKendaraanList(prev => [...prev, { uid: Math.random().toString(36).slice(2), plat: "", name: "", merk: "", tahun: "", warna: "", noRangka: "", noMesin: "", odometer: "" }]);
  };

  const removeKendaraan = (uid: string) => {
    if (kendaraanList.length === 1) return;
    setKendaraanList(prev => prev.filter(k => k.uid !== uid));
  };

  const updateKendaraan = (uid: string, field: keyof KendaraanInput, value: string) => {
    setKendaraanList(prev => prev.map(k => {
      if (k.uid !== uid) return k;
      const updated = { ...k, [field]: value };
      // Auto-fill name from merk if name is empty
      if (field === "merk" && !k.name) updated.name = value;
      return updated;
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return toast.error("Wajib Diisi", "Nama dan nomor WhatsApp wajib diisi.");

    let kendaraanPayload: Array<Record<string, unknown>> = [];
    if (type !== "bubut") {
      const hasInvalidKendaraan = kendaraanList.some(k => !k.plat.trim() || !k.name.trim());
      if (hasInvalidKendaraan) return toast.error("Data Kendaraan Tidak Lengkap", "Plat dan nama kendaraan wajib diisi.");

      const invalidPlat = kendaraanList.find(k => !isValidPlat(k.plat));
      if (invalidPlat) return toast.error("Format Plat Tidak Valid", `"${invalidPlat.plat}" bukan format plat yang valid. Contoh: B 1234 ABC`);

      kendaraanPayload = kendaraanList.map(k => ({
        plat: normalizePlat(k.plat),
        name: k.name.trim(),
        tahun: k.tahun || undefined,
        warna: k.warna || undefined,
        noRangka: k.noRangka || undefined,
        noMesin: k.noMesin || undefined,
        odometer: k.odometer ? Number(k.odometer) : undefined,
      }));
    }

    setLoading(true);
    try {
      // Transactional: pelanggan + kendaraan dibuat atomik di backend
      await api.post<Pelanggan>("/pelanggan/with-kendaraan", {
        name: name.trim(),
        phone: phone.trim(),
        email: email || undefined,
        address: address || undefined,
        type,
        kendaraan: kendaraanPayload,
      });

      toast.success("Berhasil Didaftarkan!", `Data ${name} berhasil disimpan.`);
      router.push("/app/kendaraan");
    } catch (err: unknown) {
      toast.error("Gagal Menyimpan", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/app/kendaraan" className="p-2 hover:bg-surface-hover rounded-xl border border-surface-border glass transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tambah Pelanggan Baru</h1>
          <p className="text-muted-foreground text-sm">Registrasi pelanggan beserta data kendaraan ke dalam sistem.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Data Pelanggan */}
        <div className="glass-panel p-6 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <User size={18} className="text-primary" />
            <h3 className="text-sm font-bold text-primary uppercase tracking-wider">1. Data Pelanggan</h3>
          </div>

          {/* Tipe Pelanggan */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Tipe Pelanggan</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { val: "kendaraan", label: "🚗 Kendaraan", desc: "Servis & modifikasi motor/mobil" },
                { val: "bubut", label: "🔧 Bubut Lepas", desc: "Hanya jasa bubut, tanpa kendaraan" },
                { val: "both", label: "🚗🔧 Keduanya", desc: "Kendaraan + jasa bubut" },
              ] as { val: "kendaraan" | "bubut" | "both"; label: string; desc: string }[]).map(t => (
                <button
                  key={t.val} type="button"
                  onClick={() => setType(t.val)}
                  className={`p-3 rounded-xl border text-left transition-all ${type === t.val ? "border-primary/50 bg-primary/5 shadow-sm" : "border-surface-border hover:bg-surface-hover"}`}
                >
                  <p className="text-sm font-semibold">{t.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Nama Lengkap <span className="text-red-500">*</span></label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Nama pelanggan..." className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">No. WhatsApp <span className="text-red-500">*</span></label>
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="08xx-xxxx-xxxx" className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Email (Opsional)</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@contoh.com" className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Alamat</label>
              <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Alamat lengkap pelanggan..." className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[70px]" />
            </div>
          </div>
        </div>

        {/* Section 2: Data Kendaraan (only jika bukan murni bubut) */}
        {type !== "bubut" && (
          <div className="glass-panel p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Car size={18} className="text-primary" />
                <h3 className="text-sm font-bold text-primary uppercase tracking-wider">2. Data Kendaraan</h3>
              </div>
              <button type="button" onClick={addKendaraan} className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors">
                <Plus size={13} /> Tambah Kendaraan
              </button>
            </div>

            {kendaraanList.map((k, idx) => (
              <div key={k.uid} className="border border-surface-border rounded-2xl p-4 space-y-4 bg-surface-hover/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-muted-foreground">Kendaraan {idx + 1}</span>
                  <button type="button" onClick={() => removeKendaraan(k.uid)} disabled={kendaraanList.length === 1} className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-30 disabled:pointer-events-none">
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Nomor Polisi <span className="text-red-500">*</span></label>
                    <input type="text" value={k.plat} onChange={e => updateKendaraan(k.uid, "plat", e.target.value)} placeholder="AB 1234 CD" required className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono uppercase" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Merk</label>
                    <select value={k.merk} onChange={e => updateKendaraan(k.uid, "merk", e.target.value)} className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                      <option value="">-- Pilih Merk --</option>
                      {MERKS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Model / Tipe <span className="text-red-500">*</span></label>
                    <input type="text" value={k.name} onChange={e => updateKendaraan(k.uid, "name", e.target.value)} placeholder="Vario 150, Avanza, dll." required className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Tahun</label>
                    <input type="number" value={k.tahun} onChange={e => updateKendaraan(k.uid, "tahun", e.target.value)} placeholder="2024" min="1980" max="2030" className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Warna</label>
                    <input type="text" value={k.warna} onChange={e => updateKendaraan(k.uid, "warna", e.target.value)} placeholder="Hitam Doff" className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">No. Rangka</label>
                    <input type="text" value={k.noRangka} onChange={e => updateKendaraan(k.uid, "noRangka", e.target.value)} placeholder="Opsional" className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">No. Mesin</label>
                    <input type="text" value={k.noMesin} onChange={e => updateKendaraan(k.uid, "noMesin", e.target.value)} placeholder="Opsional" className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Odometer (km)</label>
                    <input type="number" min="0" value={k.odometer} onChange={e => updateKendaraan(k.uid, "odometer", e.target.value)} placeholder="mis. 12500" className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Link href="/app/kendaraan" className="px-4 py-2.5 text-sm font-medium border border-surface-border rounded-xl hover:bg-surface transition-colors">Batal</Link>
          <button type="submit" disabled={loading} className="px-6 py-2.5 text-sm font-bold bg-primary text-primary-foreground rounded-xl shadow-glossy-primary hover:shadow-glossy-primary-dark transition-all flex items-center gap-2 btn-glossy disabled:opacity-70">
            {loading ? <><Loader2 size={18} className="animate-spin" /> Menyimpan...</> : <><Save size={18} /> Simpan Data</>}
          </button>
        </div>
      </form>
    </div>
  );
}
