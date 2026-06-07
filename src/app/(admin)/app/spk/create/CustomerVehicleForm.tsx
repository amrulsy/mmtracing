import { useState, useEffect, type FormEvent } from "react";
import { UserPlus, Car, CheckCircle2, Search, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { api } from "@/lib/api";
import type { Pelanggan, Kendaraan } from "@/lib/types";

interface CustomerVehicleFormProps {
  mode: "rutin" | "modifikasi" | "bubut";
  pelangganId: string;
  setPelangganId: (id: string) => void;
  kendaraanId: string;
  setKendaraanId: (id: string) => void;
  odometerMasuk: string;
  setOdometerMasuk: (val: string) => void;
  pelangganSearch: string;
  setPelangganSearch: (val: string) => void;
  kendaraanSearch: string;
  setKendaraanSearch: (val: string) => void;
}

export function CustomerVehicleForm({
  mode,
  pelangganId, setPelangganId,
  kendaraanId, setKendaraanId,
  odometerMasuk, setOdometerMasuk,
  pelangganSearch, setPelangganSearch,
  kendaraanSearch, setKendaraanSearch
}: CustomerVehicleFormProps) {
  const [pelangganList, setPelangganList] = useState<Pelanggan[]>([]);
  const [kendaraanList, setKendaraanList] = useState<Kendaraan[]>([]);
  
  const [showPelDropdown, setShowPelDropdown] = useState(false);
  const [showKenDropdown, setShowKenDropdown] = useState(false);

  // Modals Add
  const [showAddPelanggan, setShowAddPelanggan] = useState(false);
  const [newPelangganName, setNewPelangganName] = useState("");
  const [newPelangganPhone, setNewPelangganPhone] = useState("");
  const [addingPelanggan, setAddingPelanggan] = useState(false);

  const [showAddKendaraan, setShowAddKendaraan] = useState(false);
  const [newKendaraanName, setNewKendaraanName] = useState("");
  const [newKendaraanPlat, setNewKendaraanPlat] = useState("");
  const [addingKendaraan, setAddingKendaraan] = useState(false);

  // Load pelanggan
  useEffect(() => {
    const timer = setTimeout(() => {
      api.getPaginated<Pelanggan>("/pelanggan", { limit: 30, search: pelangganSearch && pelangganSearch.length >= 1 ? pelangganSearch : "" })
        .then(res => setPelangganList(res.data))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [pelangganSearch]);

  // Load kendaraan by pelangganId
  useEffect(() => {
    if (pelangganId && mode !== "bubut") {
      api.getPaginated<Kendaraan>("/kendaraan", { pelangganId: Number(pelangganId) })
        .then(res => {
          setKendaraanList(res.data);
          if (!kendaraanId && res.data.length === 1) {
            setKendaraanId(res.data[0].id.toString());
            setKendaraanSearch(`${res.data[0].name} - ${res.data[0].plat}`);
          }
        })
        .catch(() => {});
    } else {
      setKendaraanList([]);
      setKendaraanId("");
      setKendaraanSearch("");
    }
  }, [pelangganId, mode, kendaraanId, setKendaraanId]);

  // Load selected initial values
  useEffect(() => {
    if (pelangganId && !pelangganSearch) {
      api.get<{ data: Pelanggan }>(`/pelanggan/${pelangganId}`)
        .then(res => setPelangganSearch(res.data.data.name))
        .catch(() => {});
    }
    if (kendaraanId && !kendaraanSearch) {
      api.get<{ data: Kendaraan }>(`/kendaraan/${kendaraanId}`)
        .then(res => setKendaraanSearch(`${res.data.data.name} - ${res.data.data.plat}`))
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Pelanggan */}
        <div className="space-y-1.5 relative">
          <label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
            <span>Pelanggan <span className="text-red-500">*</span></span>
            <button type="button" onClick={() => setShowAddPelanggan(true)} className="text-[10px] text-primary hover:underline flex items-center gap-1">
              <UserPlus size={10} /> Pelanggan Baru
            </button>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground">
              {pelangganId ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Search size={16} />}
            </div>
            <input type="text" placeholder="Cari nama / WA..." value={pelangganSearch}
              onChange={e => { setPelangganSearch(e.target.value); setPelangganId(""); setShowPelDropdown(true); }}
              onFocus={() => setShowPelDropdown(true)}
              onBlur={() => setTimeout(() => setShowPelDropdown(false), 200)}
              className={`w-full bg-surface border rounded-xl pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${pelangganId ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' : 'border-surface-border'}`} />
          </div>
          {showPelDropdown && (
            <div className="absolute z-[100] w-full mt-1 bg-surface border border-surface-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
              {pelangganList.map(p => (
                <button key={p.id} type="button"
                  onMouseDown={() => { setPelangganId(p.id.toString()); setPelangganSearch(p.name); setShowPelDropdown(false); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-surface-hover/50 border-b border-surface-border last:border-0">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-[10px] text-muted-foreground">{p.phone}</div>
                </button>
              ))}
              {pelangganList.length === 0 && <div className="p-3 text-center text-xs text-muted-foreground">Tidak ditemukan</div>}
            </div>
          )}
        </div>

        {/* Kendaraan (Only for Kendaraan mode) */}
        {mode !== "bubut" && (
          <div className="space-y-1.5 relative">
            <label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Kendaraan</span>
              <button type="button" onClick={() => setShowAddKendaraan(true)} disabled={!pelangganId}
                className="text-[10px] text-primary hover:underline flex items-center gap-1 disabled:opacity-50 disabled:hover:no-underline">
                <Car size={10} /> Kendaraan Baru
              </button>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground">
                {kendaraanId ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Search size={16} />}
              </div>
              <input type="text" placeholder={pelangganId ? "Cari plat / merk..." : "Pilih pelanggan dulu"} value={kendaraanSearch} disabled={!pelangganId}
                onChange={e => { setKendaraanSearch(e.target.value); setKendaraanId(""); setShowKenDropdown(true); }}
                onFocus={() => { if (pelangganId) setShowKenDropdown(true); }}
                onBlur={() => setTimeout(() => setShowKenDropdown(false), 200)}
                className={`w-full bg-surface border rounded-xl pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${kendaraanId ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' : 'border-surface-border'} disabled:opacity-50 disabled:cursor-not-allowed`} />
            </div>
            {showKenDropdown && pelangganId && (
              <div className="absolute z-[100] w-full mt-1 bg-surface border border-surface-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {kendaraanList.filter(k => k.name.toLowerCase().includes(kendaraanSearch.toLowerCase()) || k.plat.toLowerCase().includes(kendaraanSearch.toLowerCase())).map(k => (
                  <button key={k.id} type="button"
                    onMouseDown={() => { setKendaraanId(k.id.toString()); setKendaraanSearch(`${k.name} - ${k.plat}`); setShowKenDropdown(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-surface-hover/50 border-b border-surface-border last:border-0">
                    <div className="font-medium">{k.plat}</div>
                    <div className="text-[10px] text-muted-foreground">{k.name}</div>
                  </button>
                ))}
                {kendaraanList.length === 0 && <div className="p-3 text-center text-xs text-muted-foreground">Belum ada kendaraan</div>}
              </div>
            )}
          </div>
        )}

        {/* Odometer */}
        {mode !== "bubut" && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Odometer (KM)</label>
            <input type="number" min={0} value={odometerMasuk} onChange={e => setOdometerMasuk(e.target.value)}
              placeholder="Jarak tempuh saat masuk..."
              className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddPelanggan && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background border border-surface-border rounded-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-surface-border bg-surface flex justify-between items-center">
              <h3 className="font-bold">Pelanggan Baru</h3>
              <button type="button" onClick={() => setShowAddPelanggan(false)} className="text-muted-foreground hover:text-foreground">&times;</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Nama Pelanggan <span className="text-red-500">*</span></label>
                <input type="text" value={newPelangganName} onChange={e => setNewPelangganName(e.target.value)} className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm" autoFocus />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">No WhatsApp <span className="text-red-500">*</span></label>
                <input type="text" value={newPelangganPhone} onChange={e => setNewPelangganPhone(e.target.value)} className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm" placeholder="08..." />
              </div>
              <button type="button" onClick={handleAddPelanggan} disabled={addingPelanggan || !newPelangganName || !newPelangganPhone} className="w-full py-2 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50 flex justify-center items-center gap-2">
                {addingPelanggan && <Loader2 size={14} className="animate-spin" />} Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddKendaraan && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background border border-surface-border rounded-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-surface-border bg-surface flex justify-between items-center">
              <h3 className="font-bold">Kendaraan Baru</h3>
              <button type="button" onClick={() => setShowAddKendaraan(false)} className="text-muted-foreground hover:text-foreground">&times;</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Merk / Tipe Kendaraan <span className="text-red-500">*</span></label>
                <input type="text" value={newKendaraanName} onChange={e => setNewKendaraanName(e.target.value)} className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm" placeholder="Honda Vario 150" autoFocus />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Plat Nomor <span className="text-red-500">*</span></label>
                <input type="text" value={newKendaraanPlat} onChange={e => setNewKendaraanPlat(e.target.value)} className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm uppercase" placeholder="AB 1234 CD" />
              </div>
              <button type="button" onClick={handleAddKendaraan} disabled={addingKendaraan || !newKendaraanName || !newKendaraanPlat} className="w-full py-2 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50 flex justify-center items-center gap-2">
                {addingKendaraan && <Loader2 size={14} className="animate-spin" />} Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
