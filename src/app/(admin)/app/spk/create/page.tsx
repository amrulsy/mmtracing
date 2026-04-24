"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Plus, Trash2, Loader2, AlertCircle, Info, CheckCircle2, X, Search, UserPlus, Car, Check } from "lucide-react";
import { toast } from "@/lib/toast";
import { api } from "@/lib/api";
import type { Pelanggan, Kendaraan, Mekanik, Jasa, Sparepart } from "@/lib/types";
import { Skeleton } from "@/components/ui/loading-skeleton";

type Mode = "rutin" | "modifikasi" | "bubut";

interface StageInput {
  nama: string;
  estimasiBiaya: number;
  durasiHari: number;
}

// Item jasa/servis yang dipilih di mode rutin
interface SelectedJasa {
  jasaId: number;
  nama: string;
  harga: number;
  qty: number;
}

// Item sparepart yang dipilih di mode rutin
interface SelectedSparepart {
  sparepartId: number;
  nama: string;
  harga: number;
  qty: number;
}

const PRIORITAS = ["rendah", "normal", "tinggi", "urgent"] as const;

const VALID_MODES: Mode[] = ["rutin", "modifikasi", "bubut"];

export default function CreateSpkPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = VALID_MODES.includes(searchParams.get("mode") as Mode) ? (searchParams.get("mode") as Mode) : "rutin";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Options dari API
  const [pelangganList, setPelangganList] = useState<Pelanggan[]>([]);
  const [kendaraanList, setKendaraanList] = useState<Kendaraan[]>([]);
  const [mekanikList, setMekanikList] = useState<Mekanik[]>([]);

  // Master jasa untuk mode rutin
  const [jasaList, setJasaList] = useState<Jasa[]>([]);
  const [jasaSearch, setJasaSearch] = useState("");
  const [loadingJasa, setLoadingJasa] = useState(false);
  const [selectedJasaItems, setSelectedJasaItems] = useState<SelectedJasa[]>([]);

  // Master sparepart untuk mode rutin
  const [sparepartList, setSparepartList] = useState<Sparepart[]>([]);
  const [sparepartSearch, setSparepartSearch] = useState("");
  const [loadingSparepart, setLoadingSparepart] = useState(false);
  const [selectedSparepartItems, setSelectedSparepartItems] = useState<SelectedSparepart[]>([]);

  // Form state utama
  const [pelangganId, setPelangganId] = useState(searchParams.get("pelangganId") || "");
  const [kendaraanId, setKendaraanId] = useState(searchParams.get("kendaraanId") || "");
  const [mekanikId, setMekanikId] = useState("");
  const [prioritas, setPrioritas] = useState<"rendah" | "normal" | "tinggi" | "urgent">("normal");
  const [keluhan, setKeluhan] = useState("");

  // Modifikasi
  const [judulProyek, setJudulProyek] = useState("");
  const [spesifikasi, setSpesifikasi] = useState("");
  const [stages, setStages] = useState<StageInput[]>([{ nama: "", estimasiBiaya: 0, durasiHari: 1 }]);

  // Bubut
  const [bubutKeluhan, setBubutKeluhan] = useState("");
  const [namaBubut, setNamaBubut] = useState("");

  // Modals & Combobox
  const [showAddPelanggan, setShowAddPelanggan] = useState(false);
  const [newPelangganName, setNewPelangganName] = useState("");
  const [newPelangganPhone, setNewPelangganPhone] = useState("");
  const [addingPelanggan, setAddingPelanggan] = useState(false);

  const [showAddKendaraan, setShowAddKendaraan] = useState(false);
  const [newKendaraanName, setNewKendaraanName] = useState("");
  const [newKendaraanPlat, setNewKendaraanPlat] = useState("");
  const [addingKendaraan, setAddingKendaraan] = useState(false);

  const [pelangganSearch, setPelangganSearch] = useState("");
  const [showPelDropdown, setShowPelDropdown] = useState(false);

  const [kendaraanSearch, setKendaraanSearch] = useState("");
  const [showKenDropdown, setShowKenDropdown] = useState(false);

  // Load mekanik sekali di awal
  useEffect(() => {
    api.getPaginated<Mekanik>("/mekanik", { limit: 100 })
      .then(res => setMekanikList(res.data))
      .catch(() => toast.error("Gagal", "Gagal memuat data mekanik"))
      .finally(() => setLoadingOptions(false));
  }, []);

  // Load pelanggan dari API saat search berubah (server-side search)
  useEffect(() => {
    const timer = setTimeout(() => {
      api.getPaginated<Pelanggan>("/pelanggan", { limit: 30, search: pelangganSearch && pelangganSearch.length >= 1 ? pelangganSearch : "" })
        .then(res => setPelangganList(res.data))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [pelangganSearch]);

  // Load jasa saat mode rutin aktif atau search berubah
  useEffect(() => {
    if (mode !== "rutin") return;
    const timer = setTimeout(() => {
      setLoadingJasa(true);
      api.getPaginated<Jasa>("/jasa", { limit: 50, search: jasaSearch })
        .then(res => setJasaList(res.data))
        .catch(() => {})
        .finally(() => setLoadingJasa(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [mode, jasaSearch]);

  // Load sparepart saat mode rutin aktif atau search berubah
  useEffect(() => {
    if (mode !== "rutin") return;
    const timer = setTimeout(() => {
      setLoadingSparepart(true);
      api.getPaginated<Sparepart>("/sparepart", { limit: 50, search: sparepartSearch })
        .then(res => setSparepartList(res.data))
        .catch(() => {})
        .finally(() => setLoadingSparepart(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [mode, sparepartSearch]);

  const initialKendaraanId = searchParams.get("kendaraanId");

  // Load kendaraan ketika pelanggan berubah
  useEffect(() => {
    if (!pelangganId || mode === "bubut") {
      setKendaraanList([]);
      if (!initialKendaraanId) setKendaraanId("");
      return;
    }
    api.get<Pelanggan>(`/pelanggan/${pelangganId}`)
      .then(res => setKendaraanList(res.data.kendaraan || []))
      .catch(() => toast.error("Gagal", "Gagal memuat data kendaraan"));
  }, [pelangganId, mode, initialKendaraanId]);

  // Sync display name untuk pelangganId dari URL params
  useEffect(() => {
    if (pelangganId && !pelangganSearch) {
      const p = pelangganList.find(x => x.id.toString() === pelangganId);
      if (p) {
        setPelangganSearch(p.name);
      } else {
        // Fetch langsung jika belum ada di list
        api.get<Pelanggan>(`/pelanggan/${pelangganId}`)
          .then(res => setPelangganSearch(res.data.name))
          .catch(() => {});
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pelangganId]);
  
  useEffect(() => {
    if (kendaraanList.length > 0 && kendaraanId && !kendaraanSearch) {
       const k = kendaraanList.find(x => x.id.toString() === kendaraanId);
       if (k) setKendaraanSearch(`${k.name} - ${k.plat}`);
    }
  }, [kendaraanList, kendaraanId]);

  // ── Helpers item jasa ──────────────────────────────────────
  const addJasa = (j: Jasa) => {
    setSelectedJasaItems(prev => {
      const exists = prev.find(x => x.jasaId === j.id);
      if (exists) {
        // Tambah qty jika sudah ada
        return prev.map(x => x.jasaId === j.id ? { ...x, qty: x.qty + 1 } : x);
      }
      return [...prev, { jasaId: j.id, nama: j.name, harga: Number(j.harga), qty: 1 }];
    });

    // Auto-bundling sparepart
    if (j.sparepartBundles && j.sparepartBundles.length > 0) {
      j.sparepartBundles.forEach(bundle => {
        setSelectedSparepartItems(prevSp => {
          const existsSp = prevSp.find(x => x.sparepartId === bundle.sparepart.id);
          if (existsSp) {
            return prevSp.map(x => x.sparepartId === bundle.sparepart.id ? { ...x, qty: x.qty + bundle.qtyDefault } : x);
          }
          return [...prevSp, { sparepartId: bundle.sparepart.id, nama: bundle.sparepart.name, harga: Number(bundle.sparepart.hargaJual), qty: bundle.qtyDefault }];
        });
      });
      toast.success("Bundel Paket Aktif", `${j.sparepartBundles.length} item sparepart otomatis ditambahkan dari paket servis.`);
    }
  };

  const removeJasa = (jasaId: number) => {
    setSelectedJasaItems(prev => prev.filter(x => x.jasaId !== jasaId));
  };

  const updateJasaQty = (jasaId: number, qty: number) => {
    if (qty < 1) { removeJasa(jasaId); return; }
    setSelectedJasaItems(prev => prev.map(x => x.jasaId === jasaId ? { ...x, qty } : x));
  };

  const totalJasa = selectedJasaItems.reduce((s, x) => s + x.harga * x.qty, 0);

  // ── Helpers item sparepart ──────────────────────────────────
  const addSparepart = (sp: Sparepart) => {
    setSelectedSparepartItems(prev => {
      const exists = prev.find(x => x.sparepartId === sp.id);
      if (exists) {
        return prev.map(x => x.sparepartId === sp.id ? { ...x, qty: x.qty + 1 } : x);
      }
      return [...prev, { sparepartId: sp.id, nama: sp.name, harga: Number(sp.hargaJual), qty: 1 }];
    });
  };

  const removeSparepart = (id: number) => {
    setSelectedSparepartItems(prev => prev.filter(x => x.sparepartId !== id));
  };

  const updateSparepartQty = (id: number, qty: number) => {
    if (qty < 1) { removeSparepart(id); return; }
    setSelectedSparepartItems(prev => prev.map(x => x.sparepartId === id ? { ...x, qty } : x));
  };

  const totalSparepart = selectedSparepartItems.reduce((s, x) => s + x.harga * x.qty, 0);

  // ── Helpers stages ─────────────────────────────────────────
  const addStage = () => setStages(prev => [...prev, { nama: "", estimasiBiaya: 0, durasiHari: 1 }]);
  const removeStage = (i: number) => setStages(prev => prev.filter((_, idx) => idx !== i));
  const updateStage = (i: number, field: keyof StageInput, value: string | number) => {
    setStages(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  };

  const totalEstimasi = stages.reduce((sum, s) => sum + (Number(s.estimasiBiaya) || 0), 0);
  const formatRp = (n: number) => `Rp ${Number(n).toLocaleString("id-ID")}`;

  // ── Quick Create API Handlers ──────────────────────────────
  const handleAddPelanggan = async (e: FormEvent) => {
    e.preventDefault();
    if (!newPelangganName || !newPelangganPhone) return toast.error("Nama dan No HP wajib diisi");
    setAddingPelanggan(true);
    try {
      const res = await api.post<Pelanggan>("/pelanggan", { name: newPelangganName, phone: newPelangganPhone, type: mode === "bubut" ? "bubut" : "kendaraan" });
      setPelangganList(prev => [res.data, ...prev]);
      setPelangganId(res.data.id.toString());
      setPelangganSearch(res.data.name);
      setShowAddPelanggan(false);
      setNewPelangganName("");
      setNewPelangganPhone("");
      toast.success("Berhasil", "Pelanggan baru ditambahkan");
    } catch (err: unknown) {
      toast.error("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally { setAddingPelanggan(false); }
  };

  const handleAddKendaraan = async (e: FormEvent) => {
    e.preventDefault();
    if (!pelangganId) return toast.error("Pilih pelanggan terlebih dahulu");
    if (!newKendaraanName || !newKendaraanPlat) return toast.error("Nama dan Plat wajib diisi");
    setAddingKendaraan(true);
    try {
      const res = await api.post<Kendaraan>("/kendaraan", { pelangganId: Number(pelangganId), name: newKendaraanName, plat: newKendaraanPlat });
      setKendaraanList(prev => [res.data, ...prev]);
      setKendaraanId(res.data.id.toString());
      setKendaraanSearch(`${res.data.name} - ${res.data.plat}`);
      setShowAddKendaraan(false);
      setNewKendaraanName("");
      setNewKendaraanPlat("");
      toast.success("Berhasil", "Kendaraan baru ditambahkan");
    } catch (err: unknown) {
      toast.error("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally { setAddingKendaraan(false); }
  };

  // Server-side search sudah dilakukan, client filter hanya untuk highlight aktif
  const filteredPelanggan = pelangganList;
  const filteredKendaraan = kendaraanList.filter(k => k.name.toLowerCase().includes(kendaraanSearch.toLowerCase()) || k.plat.toLowerCase().includes(kendaraanSearch.toLowerCase()));

  // ── Submit ─────────────────────────────────────────────────
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!pelangganId) {
      setError("Pelanggan harus dipilih");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (mode === "rutin" && selectedJasaItems.length === 0 && selectedSparepartItems.length === 0) {
      setError("Pilih minimal satu jasa/tipe servis atau sparepart");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (mode === "modifikasi" && !judulProyek.trim() && !keluhan.trim()) {
      setError("Mode modifikasi membutuhkan judul proyek atau deskripsi pekerjaan");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (mode === "modifikasi" && stages.some(s => !s.nama.trim())) {
      setError("Semua tahap harus memiliki nama");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (mode === "bubut" && !bubutKeluhan.trim()) {
      setError("Deskripsi pekerjaan bubut wajib diisi");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        pelangganId: Number(pelangganId),
        mode,
        prioritas,
        keluhan,
      };
      if (kendaraanId) body.kendaraanId = Number(kendaraanId);
      if (mekanikId) body.mekanikId = Number(mekanikId);

      if (mode === "rutin") {
        // Items dari master jasa dan sparepart yang dipilih
        body.items = [
          ...selectedJasaItems.map(x => ({
            type: "jasa",
            jasaId: x.jasaId,
            nama: x.nama,
            qty: x.qty,
            hargaSatuan: Number(x.harga),
          })),
          ...selectedSparepartItems.map(x => ({
            type: "sparepart",
            sparepartId: x.sparepartId,
            nama: x.nama,
            qty: x.qty,
            hargaSatuan: Number(x.harga),
          }))
        ];
      } else if (mode === "modifikasi") {
        body.judulProyek = judulProyek;
        body.spesifikasi = spesifikasi;
        body.stages = stages.map(s => ({
          nama: s.nama,
          estimasiBiaya: Number(s.estimasiBiaya),
          durasiHari: Number(s.durasiHari),
        }));
      } else if (mode === "bubut") {
        body.keluhan = bubutKeluhan;
        if (namaBubut) body.catatan = `Nama: ${namaBubut}`;
        // Hanya kirim stages jika ada dan terisi (bubut tidak wajib punya stages)
        const validStages = stages.filter(s => s.nama.trim());
        if (validStages.length > 0) {
          body.stages = validStages.map(s => ({
            nama: s.nama,
            estimasiBiaya: Number(s.estimasiBiaya),
            durasiHari: Number(s.durasiHari),
          }));
        }
      }

      const res = await api.post<{ id: number }>("/spk", body);
      router.push(`/app/spk/${res.data.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal membuat SPK";
      setError(msg);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/app/spk" className="p-2 hover:bg-surface-hover rounded-xl border border-surface-border glass transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Buat SPK Baru</h1>
          <p className="text-muted-foreground text-sm">Pilih jenis layanan dan lengkapi detail perintah kerja.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="glass-panel overflow-hidden">
          {/* Mode Selector */}
          <div className="grid grid-cols-3 p-1 bg-surface-hover/50 border-b border-surface-border gap-1">
            {(["rutin", "modifikasi", "bubut"] as Mode[]).map(m => (
              <button
                key={m} type="button" onClick={() => setMode(m)}
                className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === m ? "bg-background shadow-sm border border-surface-border text-primary" : "hover:bg-background/50 text-muted-foreground"}`}
              >
                {m === "rutin" ? "Servis Rutin" : m === "modifikasi" ? "Modifikasi" : "Bubut Lepas"}
              </button>
            ))}
          </div>

          {/* Info badge */}
          <div className="px-6 pt-4">
            {mode === "bubut" && (
              <div className="flex items-center gap-2 p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-600 text-xs mb-2">
                <Info size={14} className="shrink-0" />
                Bubut lepas tidak memerlukan kendaraan terdaftar — pelanggan bisa walk-in.
              </div>
            )}
            {mode === "modifikasi" && (
              <div className="flex items-center gap-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-600 text-xs mb-2">
                <Info size={14} className="shrink-0" />
                Mode modifikasi memerlukan minimum DP 40% dari total estimasi biaya tahapan.
              </div>
            )}
          </div>

          {/* #14: Mobile Step Indicator */}
          <div className="flex items-center justify-center gap-2 py-3 px-6 border-b border-surface-border sm:hidden">
            {["Data Pelanggan", "Pekerjaan", "Prioritas"].map((label, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${i === 0 ? "bg-primary text-white border-primary" : "border-surface-border text-muted-foreground"}`}>
                  {i + 1}
                </div>
                <span className={`text-[10px] ${i === 0 ? "font-bold text-primary" : "text-muted-foreground"}`}>{label}</span>
                {i < 2 && <div className="w-4 h-0.5 bg-surface-border" />}
              </div>
            ))}
          </div>

          <div className="p-6 space-y-8">

            {/* ── Section 1: Pelanggan & Kendaraan ── */}
            <section>
              <h3 className="text-sm font-semibold mb-4 text-primary uppercase tracking-wider">
                1. {mode === "bubut" ? "Data Pelanggan" : "Pilih Kendaraan"}
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-medium text-muted-foreground">Pelanggan <span className="text-red-500">*</span></label>
                  {loadingOptions ? <Skeleton className="h-10 w-full" /> : (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={pelangganSearch}
                          onFocus={() => setShowPelDropdown(true)}
                          onChange={e => setPelangganSearch(e.target.value)}
                          onBlur={() => setTimeout(() => setShowPelDropdown(false), 200)}
                          placeholder="Cari nama / No HP..."
                          className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        {showPelDropdown && (
                          <div className="absolute top-11 left-0 z-50 w-full max-h-48 overflow-y-auto bg-background border border-surface-border rounded-xl shadow-lg p-1">
                            {filteredPelanggan.length === 0 ? (
                              <div className="p-2 text-xs text-muted-foreground text-center">Tidak ditemukan.</div>
                            ) : filteredPelanggan.map(p => (
                              <div
                                key={p.id}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setPelangganId(p.id.toString());
                                  setPelangganSearch(p.name);
                                  setShowPelDropdown(false);
                                }}
                                className={`px-3 py-2 text-sm rounded-lg cursor-pointer flex justify-between items-center ${pelangganId === p.id.toString() ? "bg-primary/10 text-primary" : "hover:bg-surface-hover"}`}
                              >
                                <div><p className="font-semibold">{p.name}</p><p className="text-[10px] text-muted-foreground">{p.phone}</p></div>
                                {pelangganId === p.id.toString() && <Check size={14} />}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <button type="button" onClick={() => setShowAddPelanggan(true)}
                        className="px-3 py-2 border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 rounded-xl flex items-center justify-center transition-colors" title="Tambah Pelanggan Baru">
                        <UserPlus size={16} />
                      </button>
                    </div>
                  )}
                </div>
                {mode !== "bubut" ? (
                  <div className="space-y-1.5 relative">
                    <label className="text-xs font-medium text-muted-foreground">Kendaraan</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          disabled={!pelangganId}
                          value={kendaraanSearch}
                          onFocus={() => setShowKenDropdown(true)}
                          onChange={e => setKendaraanSearch(e.target.value)}
                          onBlur={() => setTimeout(() => setShowKenDropdown(false), 200)}
                          placeholder={!pelangganId ? "Pilih pelanggan dulu..." : "Cari plat / nama kendaraan..."}
                          className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                        />
                        {showKenDropdown && pelangganId && (
                          <div className="absolute top-11 left-0 z-50 w-full max-h-48 overflow-y-auto bg-background border border-surface-border rounded-xl shadow-lg p-1">
                            {filteredKendaraan.length === 0 ? (
                              <div className="p-2 text-xs text-muted-foreground text-center">Tidak ditemukan.</div>
                            ) : filteredKendaraan.map(k => (
                              <div
                                key={k.id}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setKendaraanId(k.id.toString());
                                  setKendaraanSearch(`${k.name} - ${k.plat}`);
                                  setShowKenDropdown(false);
                                }}
                                className={`px-3 py-2 text-sm rounded-lg cursor-pointer flex justify-between items-center ${kendaraanId === k.id.toString() ? "bg-primary/10 text-primary" : "hover:bg-surface-hover"}`}
                              >
                                <div><p className="font-semibold">{k.plat}</p><p className="text-[10px] text-muted-foreground">{k.name}</p></div>
                                {kendaraanId === k.id.toString() && <Check size={14} />}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <button type="button" onClick={() => setShowAddKendaraan(true)} disabled={!pelangganId}
                        className="px-3 py-2 border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50" title="Tambah Kendaraan Baru">
                        <Car size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Nama Walk-in (opsional)</label>
                    <input type="text" value={namaBubut} onChange={e => setNamaBubut(e.target.value)}
                      placeholder="Nama jika berbeda dari akun pelanggan..."
                      className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                )}
              </div>
            </section>

            {/* ── Section 2: Detail Pekerjaan ── */}
            <section>
              <h3 className="text-sm font-semibold mb-4 text-primary uppercase tracking-wider">
                2. {mode === "rutin" ? "Keluhan & Pilih Jasa" : mode === "modifikasi" ? "Deskripsi Proyek" : "Deskripsi Pekerjaan Bubut"}
              </h3>

              {/* ---------- RUTIN ---------- */}
              {mode === "rutin" && (
                <div className="space-y-5">
                  {/* Keluhan */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Keluhan Konsumen</label>
                    <textarea value={keluhan} onChange={e => setKeluhan(e.target.value)} rows={2}
                      className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Deskripsikan keluhan kendaraan..." />
                  </div>

                  {/* Pilih Jasa dari master */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground">
                        Pilih Jasa / Tipe Servis <span className="text-red-500">*</span>
                      </label>
                      {totalJasa > 0 && (
                        <span className="text-xs font-bold text-primary">{formatRp(totalJasa)}</span>
                      )}
                    </div>

                    {/* Search box */}
                    <div className="flex items-center gap-2 bg-surface border border-surface-border rounded-xl px-3 py-2 focus-within:ring-1 focus-within:ring-primary/50">
                      <Search size={13} className="text-muted-foreground shrink-0" />
                      <input
                        type="text"
                        value={jasaSearch}
                        onChange={e => setJasaSearch(e.target.value)}
                        placeholder="Cari jasa (misal: tune up, CVT, rem)..."
                        className="bg-transparent border-none focus:outline-none text-sm w-full"
                      />
                      {loadingJasa && <Loader2 size={13} className="animate-spin text-muted-foreground" />}
                    </div>

                    {/* Daftar jasa */}
                    <div className="border border-surface-border rounded-xl overflow-hidden">
                      <div className="max-h-52 overflow-y-auto divide-y divide-surface-border">
                        {jasaList.length === 0 && !loadingJasa && (
                          <p className="text-xs text-center text-muted-foreground py-5">
                            {jasaSearch ? `Tidak ada hasil untuk "${jasaSearch}"` : "Belum ada data jasa"}
                          </p>
                        )}
                        {jasaList.map(j => {
                          const selected = selectedJasaItems.find(x => x.jasaId === j.id);
                          return (
                            <div key={j.id} className={`flex items-center justify-between px-3 py-2.5 transition-colors ${selected ? "bg-primary/5" : "hover:bg-surface-hover/40"}`}>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {selected && <CheckCircle2 size={12} className="text-primary shrink-0" />}
                                  <p className="text-sm font-medium truncate">{j.name}</p>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {j.kategori && <span className="capitalize mr-1">{j.kategori} ·</span>}
                                  {j.garansiHari ? `Garansi ${j.garansiHari} hari` : "Tanpa garansi"}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 ml-2 shrink-0">
                                <span className="text-xs font-bold text-primary">{formatRp(j.harga)}</span>
                                {selected ? (
                                  <button type="button" onClick={() => removeJasa(j.id)}
                                    className="w-7 h-7 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-colors">
                                    <X size={13} />
                                  </button>
                                ) : (
                                  <button type="button" onClick={() => addJasa(j)}
                                    className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors">
                                    <Plus size={13} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Daftar yang sudah dipilih */}
                    {selectedJasaItems.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Dipilih ({selectedJasaItems.length})</p>
                        {selectedJasaItems.map(item => (
                          <div key={item.jasaId} className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2">
                            <CheckCircle2 size={13} className="text-primary shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.nama}</p>
                              <p className="text-[10px] text-muted-foreground">{formatRp(item.harga)} × {item.qty} = <span className="font-semibold text-primary">{formatRp(item.harga * item.qty)}</span></p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button type="button" onClick={() => updateJasaQty(item.jasaId, item.qty - 1)}
                                className="w-6 h-6 rounded-lg border border-surface-border text-sm font-bold hover:bg-surface-hover flex items-center justify-center">−</button>
                              <span className="text-sm font-bold w-5 text-center">{item.qty}</span>
                              <button type="button" onClick={() => updateJasaQty(item.jasaId, item.qty + 1)}
                                className="w-6 h-6 rounded-lg border border-surface-border text-sm font-bold hover:bg-surface-hover flex items-center justify-center">+</button>
                              <button type="button" onClick={() => removeJasa(item.jasaId)}
                                className="w-6 h-6 rounded-lg text-red-500 hover:bg-red-500/10 flex items-center justify-center ml-1">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                        <div className="flex justify-between text-sm font-bold pt-1 border-t border-surface-border">
                          <span>Total Jasa Estimasi</span>
                          <span className="text-primary">{formatRp(totalJasa)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bundling Sparepart */}
                  <div className="space-y-2 pt-4 border-t border-surface-border">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground">
                        Pilih Sparepart (Opsional)
                      </label>
                      {totalSparepart > 0 && (
                        <span className="text-xs font-bold text-primary">{formatRp(totalSparepart)}</span>
                      )}
                    </div>

                    {/* Search box Sparepart */}
                    <div className="flex items-center gap-2 bg-surface border border-surface-border rounded-xl px-3 py-2 focus-within:ring-1 focus-within:ring-primary/50">
                      <Search size={13} className="text-muted-foreground shrink-0" />
                      <input
                        type="text"
                        value={sparepartSearch}
                        onChange={e => setSparepartSearch(e.target.value)}
                        placeholder="Cari sparepart..."
                        className="bg-transparent border-none focus:outline-none text-sm w-full"
                      />
                      {loadingSparepart && <Loader2 size={13} className="animate-spin text-muted-foreground" />}
                    </div>

                    {/* Daftar Sparepart */}
                    <div className="border border-surface-border rounded-xl overflow-hidden">
                      <div className="max-h-52 overflow-y-auto divide-y divide-surface-border">
                        {sparepartList.length === 0 && !loadingSparepart && (
                          <p className="text-xs text-center text-muted-foreground py-5">
                            {sparepartSearch ? `Tidak ada sparepart "${sparepartSearch}"` : "Cari data sparepart..."}
                          </p>
                        )}
                        {sparepartList.map(sp => {
                          const selected = selectedSparepartItems.find(x => x.sparepartId === sp.id);
                          return (
                            <div key={sp.id} className={`flex items-center justify-between px-3 py-2.5 transition-colors ${selected ? "bg-primary/5" : "hover:bg-surface-hover/40"}`}>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {selected && <CheckCircle2 size={12} className="text-primary shrink-0" />}
                                  <p className="text-sm font-medium truncate">{sp.name}</p>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {sp.kode && <span className="uppercase text-muted-foreground mr-1">{sp.kode} ·</span>}
                                  {sp.merk && <span className="uppercase">{sp.merk} ·</span>}
                                  Sisa Stok: {sp.stok}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 ml-2 shrink-0">
                                <span className="text-xs font-bold text-primary">{formatRp(Number(sp.hargaJual))}</span>
                                {selected ? (
                                  <button type="button" onClick={() => removeSparepart(sp.id)}
                                    className="w-7 h-7 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-colors">
                                    <X size={13} />
                                  </button>
                                ) : (
                                  <button type="button" onClick={() => addSparepart(sp)}
                                    className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors">
                                    <Plus size={13} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Daftar Sparepart Terpilih */}
                    {selectedSparepartItems.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Sparepart Terpilih ({selectedSparepartItems.length})</p>
                        {selectedSparepartItems.map(item => (
                          <div key={item.sparepartId} className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2">
                            <CheckCircle2 size={13} className="text-primary shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.nama}</p>
                              <p className="text-[10px] text-muted-foreground">{formatRp(item.harga)} × {item.qty} = <span className="font-semibold text-primary">{formatRp(item.harga * item.qty)}</span></p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button type="button" onClick={() => updateSparepartQty(item.sparepartId, item.qty - 1)}
                                className="w-6 h-6 rounded-lg border border-surface-border text-sm font-bold hover:bg-surface-hover flex items-center justify-center">−</button>
                              <span className="text-sm font-bold w-5 text-center">{item.qty}</span>
                              <button type="button" onClick={() => updateSparepartQty(item.sparepartId, item.qty + 1)}
                                className="w-6 h-6 rounded-lg border border-surface-border text-sm font-bold hover:bg-surface-hover flex items-center justify-center">+</button>
                              <button type="button" onClick={() => removeSparepart(item.sparepartId)}
                                className="w-6 h-6 rounded-lg text-red-500 hover:bg-red-500/10 flex items-center justify-center ml-1">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Summary Total Keseluruhan (Jasa + Sparepart) */}
                  {(totalJasa > 0 || totalSparepart > 0) && (
                    <div className="p-4 mt-4 bg-primary/5 border border-primary/20 rounded-xl shadow-inner">
                      <div className="flex justify-between items-center text-sm font-bold">
                        <span className="text-muted-foreground uppercase tracking-wider text-xs">Total Estimasi Servis Rutin</span>
                        <span className="text-xl text-primary">{formatRp(totalJasa + totalSparepart)}</span>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* ---------- MODIFIKASI ---------- */}
              {mode === "modifikasi" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Judul Proyek <span className="text-red-500">*</span></label>
                    <input type="text" value={judulProyek} onChange={e => setJudulProyek(e.target.value)}
                      placeholder="Contoh: Full Bore Up + Knalpot Racing"
                      className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Spesifikasi Detail</label>
                    <textarea value={spesifikasi} onChange={e => setSpesifikasi(e.target.value)} rows={3}
                      placeholder="Jelaskan spesifikasi teknis yang diinginkan pelanggan..."
                      className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Keluhan / Referensi Tambahan</label>
                    <textarea value={keluhan} onChange={e => setKeluhan(e.target.value)} rows={2}
                      placeholder="Referensi gambar, motor contoh, dll..."
                      className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>

                  {/* Tahapan */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground">Tahapan Pekerjaan</label>
                      {totalEstimasi > 0 && <span className="text-xs font-bold text-primary">Total: {formatRp(totalEstimasi)}</span>}
                    </div>
                    {stages.map((stage, i) => (
                      <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_120px_80px_auto] gap-2 items-start p-3 sm:p-0 border border-surface-border sm:border-0 rounded-xl sm:rounded-none">
                        <input type="text" value={stage.nama} onChange={e => updateStage(i, "nama", e.target.value)}
                          placeholder={`Tahap ${i + 1}: Nama pekerjaan...`}
                          className="bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                        <div className="grid grid-cols-[1fr_1fr_auto] sm:contents gap-2">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rp</span>
                            <input type="number" min={0} value={stage.estimasiBiaya || ""} onChange={e => updateStage(i, "estimasiBiaya", e.target.value)}
                              placeholder="Biaya"
                              className="w-full bg-surface border border-surface-border rounded-xl px-3 pl-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                          </div>
                          <input type="number" min={1} value={stage.durasiHari} onChange={e => updateStage(i, "durasiHari", Number(e.target.value))}
                            placeholder="Hari"
                            className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                          <button type="button" onClick={() => removeStage(i)} disabled={stages.length === 1}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl disabled:opacity-30 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="text-xs text-muted-foreground hidden sm:block">Nama · Estimasi Biaya · Durasi (hari)</div>
                    <button type="button" onClick={addStage}
                      className="w-full flex items-center justify-center gap-2 py-2 text-sm border border-dashed border-primary/30 text-primary rounded-xl hover:bg-primary/5 transition-colors">
                      <Plus size={16} /> Tambah Tahap
                    </button>
                    {totalEstimasi > 0 && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-600">
                        Minimum DP (40%): <span className="font-bold">{formatRp(Math.ceil(totalEstimasi * 0.4))}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ---------- BUBUT ---------- */}
              {mode === "bubut" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Deskripsi Pekerjaan Bubut <span className="text-red-500">*</span></label>
                    <textarea value={bubutKeluhan} onChange={e => setBubutKeluhan(e.target.value)} rows={4}
                      className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Deskripsikan pekerjaan bubut: dimensi, material, spesifikasi..." />
                  </div>
                  
                  {/* Tahapan Bubut */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground">Tahapan Pekerjaan</label>
                      {totalEstimasi > 0 && <span className="text-xs font-bold text-primary">Total: {formatRp(totalEstimasi)}</span>}
                    </div>
                    {stages.map((stage, i) => (
                      <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_120px_80px_auto] gap-2 items-start p-3 sm:p-0 border border-surface-border sm:border-0 rounded-xl sm:rounded-none">
                        <input type="text" value={stage.nama} onChange={e => updateStage(i, "nama", e.target.value)}
                          placeholder={`Tahap ${i + 1}: Nama pekerjaan...`}
                          className="bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                        <div className="grid grid-cols-[1fr_1fr_auto] sm:contents gap-2">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rp</span>
                            <input type="number" min={0} value={stage.estimasiBiaya || ""} onChange={e => updateStage(i, "estimasiBiaya", e.target.value)}
                              placeholder="Biaya"
                              className="w-full bg-surface border border-surface-border rounded-xl px-3 pl-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                          </div>
                          <input type="number" min={1} value={stage.durasiHari} onChange={e => updateStage(i, "durasiHari", Number(e.target.value))}
                            placeholder="Hari"
                            className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                          <button type="button" onClick={() => removeStage(i)} disabled={stages.length === 1}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl disabled:opacity-30 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="text-xs text-muted-foreground hidden sm:block">Nama · Estimasi Biaya · Durasi (hari)</div>
                    <button type="button" onClick={addStage}
                      className="w-full flex items-center justify-center gap-2 py-2 text-sm border border-dashed border-primary/30 text-primary rounded-xl hover:bg-primary/5 transition-colors">
                      <Plus size={16} /> Tambah Tahap
                    </button>
                    {totalEstimasi > 0 && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-600">
                        Minimum DP Opsional: <span className="font-bold">{formatRp(Math.ceil(totalEstimasi * 0.4))}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* ── Section 3: Penugasan & Prioritas ── */}
            <section>
              <h3 className="text-sm font-semibold mb-4 text-primary uppercase tracking-wider">3. Penugasan & Prioritas</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Tugaskan Mekanik</label>
                  {loadingOptions ? <Skeleton className="h-10 w-full" /> : (
                    <select value={mekanikId} onChange={e => setMekanikId(e.target.value)}
                      className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                      <option value="">Pilih Mekanik...</option>
                      {mekanikList.map(m => (
                        <option key={m.id} value={m.id} disabled={m.status === "off"}>
                          {m.name} — {m.status === "available" ? "✓ Tersedia" : m.status === "busy" ? "⚡ Sedang sibuk" : "✗ Off"}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Prioritas</label>
                  <div className="flex gap-2">
                    {PRIORITAS.map(p => (
                      <button key={p} type="button" onClick={() => setPrioritas(p)}
                        className={`flex-1 text-xs py-2 rounded-xl border transition-colors font-medium capitalize ${prioritas === p ? (
                          p === "urgent" ? "bg-red-500/20 text-red-500 border-red-500/40" :
                          p === "tinggi" ? "bg-amber-500/20 text-amber-600 border-amber-500/40" :
                          p === "rendah" ? "bg-zinc-500/20 text-zinc-500 border-zinc-500/40" :
                          "bg-primary/10 text-primary border-primary/30"
                        ) : "border-surface-border text-muted-foreground hover:bg-surface-hover"}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-surface-border bg-surface-hover/30 flex justify-end gap-3">
            <Link href="/app/spk" className="px-4 py-2 text-sm font-medium border border-surface-border rounded-xl hover:bg-surface transition-colors">
              Batal
            </Link>
            <button type="submit" disabled={submitting}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-xl shadow-glossy-primary btn-glossy disabled:opacity-70 flex items-center gap-2">
              {submitting ? (
                <><Loader2 size={18} className="animate-spin" /> Memproses...</>
              ) : (
                <><Save size={18} /> {mode === "rutin" ? "Buat SPK Servis" : mode === "modifikasi" ? "Buat SPK Modifikasi" : "Buat SPK Bubut"}</>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* QUICK CREATE MODALS */}
      {showAddPelanggan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-background border border-surface-border rounded-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-surface-border flex justify-between items-center bg-surface-hover/30">
              <h3 className="font-bold flex items-center gap-2"><UserPlus size={16} className="text-primary"/> Pelanggan Baru</h3>
              <button onClick={() => setShowAddPelanggan(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddPelanggan} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Nama <span className="text-red-500">*</span></label>
                <input type="text" value={newPelangganName} onChange={e => setNewPelangganName(e.target.value)} placeholder="Contoh: Budi Santoso" className="w-full bg-surface rounded-xl px-3 py-2.5 text-sm border focus:ring-2 focus:ring-primary/50" autoFocus />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">No. Telepon / WA <span className="text-red-500">*</span></label>
                <input type="text" value={newPelangganPhone} onChange={e => setNewPelangganPhone(e.target.value)} placeholder="Contoh: 08123456789" className="w-full bg-surface rounded-xl px-3 py-2.5 text-sm border focus:ring-2 focus:ring-primary/50" />
              </div>
              <button type="submit" disabled={addingPelanggan || !newPelangganName || !newPelangganPhone} className="w-full mt-2 py-2.5 bg-primary text-white font-medium rounded-xl disabled:opacity-50 flex justify-center items-center gap-2">
                {addingPelanggan ? <Loader2 size={16} className="animate-spin" /> : "Simpan Pelanggan"}
              </button>
            </form>
          </div>
        </div>
      )}

      {showAddKendaraan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-background border border-surface-border rounded-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-surface-border flex justify-between items-center bg-surface-hover/30">
              <h3 className="font-bold flex items-center gap-2"><Car size={16} className="text-primary"/> Kendaraan Baru</h3>
              <button onClick={() => setShowAddKendaraan(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddKendaraan} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Nama Kendaraan <span className="text-red-500">*</span></label>
                <input type="text" value={newKendaraanName} onChange={e => setNewKendaraanName(e.target.value)} placeholder="Contoh: Honda Vario 150" className="w-full bg-surface rounded-xl px-3 py-2.5 text-sm border focus:ring-2 focus:ring-primary/50" autoFocus />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Plat Nomor <span className="text-red-500">*</span></label>
                <input type="text" value={newKendaraanPlat} onChange={e => setNewKendaraanPlat(e.target.value)} placeholder="Contoh: B 1234 ABC" className="w-full bg-surface rounded-xl px-3 py-2.5 text-sm border focus:ring-2 focus:ring-primary/50 uppercase" />
              </div>
              <button type="submit" disabled={addingKendaraan || !newKendaraanName || !newKendaraanPlat} className="w-full mt-2 py-2.5 bg-primary text-white font-medium rounded-xl disabled:opacity-50 flex justify-center items-center gap-2">
                {addingKendaraan ? <Loader2 size={16} className="animate-spin" /> : "Simpan Kendaraan"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
