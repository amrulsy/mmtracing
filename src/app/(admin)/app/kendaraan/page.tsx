"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, Car, User, History, Edit, Hammer, CarFront, Trash2, Plus, X, AlertTriangle, ArrowUpDown, Award, Bell, GitMerge } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { useAuth } from "@/lib/auth";
import { isValidPlat, normalizePlat } from "@/lib/validators";
import { formatTanggal } from "@/lib/utils";
import type { Pelanggan, Kendaraan, LoyaltyTier, LoyaltyPoint } from "@/lib/types";
import { Skeleton } from "@/components/ui/loading-skeleton";
import { PhotoUploader } from "@/components/ui/photo-uploader";

const TIERS_CACHE_KEY = "mm_loyalty_tiers_v1";
type SortKey = "recent" | "name" | "spk";

export default function KendaraanPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const isAdmin = user?.roleName === "Admin";
  const [tab, setTab] = useState("semua");
  const [search, setSearch] = useState(searchParams.get("phone") || "");
  const [searchDebounced, setSearchDebounced] = useState(search);
  const [customers, setCustomers] = useState<Pelanggan[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(30);
  const [sort, setSort] = useState<SortKey>("recent");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(0);
  const detailRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Edit Pelanggan Modal
  const [showEdit, setShowEdit] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editData, setEditData] = useState<{name: string, phone: string, email: string, address: string, photoUrl: string | null, type: "kendaraan" | "bubut" | "both", loyaltyTierId: string}>({ name: "", phone: "", email: "", address: "", photoUrl: null, type: "kendaraan", loyaltyTierId: "" });
  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);

  // Merge Modal
  const [showMerge, setShowMerge] = useState(false);
  const [mergeTargetSearch, setMergeTargetSearch] = useState("");
  const [mergeTargetId, setMergeTargetId] = useState<number | null>(null);
  const [mergeLoading, setMergeLoading] = useState(false);

  // Reminders
  const [reminders, setReminders] = useState<Kendaraan[]>([]);
  const [showReminders, setShowReminders] = useState(false);

  // Add Kendaraan Modal
  const [showAddKen, setShowAddKen] = useState(false);
  const [newKenPlat, setNewKenPlat] = useState("");
  const [newKenName, setNewKenName] = useState("");
  const [addKenLoading, setAddKenLoading] = useState(false);

  // Edit Kendaraan Modal
  const [editKen, setEditKen] = useState<Kendaraan | null>(null);
  const [editKenData, setEditKenData] = useState({ plat: "", name: "", tahun: "", warna: "", odometer: "" });
  const [editKenLoading, setEditKenLoading] = useState(false);

  // Delete state
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Load reminders (kendaraan butuh servis)
  useEffect(() => {
    api.get<Kendaraan[]>("/kendaraan/reminders")
      .then((res) => setReminders(res.data || []))
      .catch(() => { /* silent */ });
  }, []);

  // Load loyalty tiers (cache-first, revalidate in background)
  useEffect(() => {
    try {
      const cached = localStorage.getItem(TIERS_CACHE_KEY);
      if (cached) setTiers(JSON.parse(cached));
    } catch { /* ignore */ }
    api.get<{ tiers: LoyaltyTier[] }>("/loyalty")
      .then((res) => {
        const list = res.data.tiers || [];
        setTiers(list);
        try { localStorage.setItem(TIERS_CACHE_KEY, JSON.stringify(list)); } catch { /* ignore */ }
      })
      .catch(() => { /* silent — graceful degrade */ });
  }, []);

  // Keyboard: "/" atau Ctrl+K untuk fokus ke search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
      if ((e.key === "/" && !isInput) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Reset ke halaman 1 saat filter berubah
  useEffect(() => { setPage(1); }, [tab, searchDebounced]);

  // Fetch pelanggan (support pagination "Muat lebih")
  useEffect(() => {
    const isFirst = page === 1;
    if (isFirst) setLoading(true); else setLoadingMore(true);
    const params: Record<string, string | number> = { page, limit };
    if (tab !== "semua") params.type = tab;
    if (searchDebounced) params.search = searchDebounced;

    api.getPaginated<Pelanggan>("/pelanggan", params)
      .then((res) => {
        setCustomers(prev => isFirst ? res.data : [...prev, ...res.data]);
        setTotal(res.pagination.total);
        if (isFirst) {
          // Pilih by ?id= jika ada dan ada di hasil, kalau tidak ke-0
          const idParam = searchParams.get("id");
          const idx = idParam ? res.data.findIndex(p => p.id === Number(idParam)) : -1;
          setSelected(idx >= 0 ? idx : 0);
        }
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Gagal memuat data kendaraan"))
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  }, [tab, searchDebounced, page, limit, searchParams]);

  // Sort client-side (simple)
  const sortedCustomers = [...customers].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "spk") return (b._count?.spk ?? 0) - (a._count?.spk ?? 0);
    // recent = urutan default dari backend (updatedAt desc) — kembalikan 0
    return 0;
  });

  const selectCustomer = useCallback((idx: number) => {
    setSelected(idx);
    // Auto-scroll ke panel detail di mobile
    if (window.innerWidth < 1024) {
      setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }, []);

  const active = sortedCustomers[selected];

  // Esc tutup modal yang terbuka
  useEffect(() => {
    const anyOpen = showEdit || !!editKen || showAddKen;
    if (!anyOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showEdit) setShowEdit(false);
      else if (editKen) setEditKen(null);
      else if (showAddKen) setShowAddKen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showEdit, editKen, showAddKen]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 animate-in fade-in duration-500">
        <AlertTriangle size={32} className="text-red-500" />
        <p className="text-muted-foreground text-sm">{error}</p>
        <button onClick={() => window.location.reload()} className="text-primary text-sm font-medium hover:underline">Coba lagi</button>
      </div>
    );
  }

  const handleEditPelanggan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active) return;
    setEditLoading(true);
    try {
      const payload: Record<string, unknown> = {
        name: editData.name,
        phone: editData.phone,
        email: editData.email || undefined,
        address: editData.address || undefined,
        photoUrl: editData.photoUrl || "",
        type: editData.type,
      };
      if (editData.loyaltyTierId) payload.loyaltyTierId = Number(editData.loyaltyTierId);
      const res = await api.put<Pelanggan>(`/pelanggan/${active.id}`, payload);
      setCustomers(customers.map(c => c.id === active.id ? { ...c, ...res.data } : c));
      toast.success("Berhasil", "Data pelanggan diperbarui");
      setShowEdit(false);
    } catch (err: unknown) {
      toast.error("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setEditLoading(false);
    }
  };

  const openEditKendaraan = (k: Kendaraan) => {
    setEditKen(k);
    setEditKenData({
      plat: k.plat,
      name: k.name,
      tahun: k.tahun || "",
      warna: k.warna || "",
      odometer: k.odometer?.toString() || "",
    });
  };

  const handleEditKendaraan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editKen || !active) return;
    if (!editKenData.plat.trim() || !editKenData.name.trim()) return toast.error("Wajib Diisi", "Plat dan nama kendaraan wajib diisi.");
    if (!isValidPlat(editKenData.plat)) return toast.error("Format Plat Tidak Valid", `"${editKenData.plat}" bukan format plat yang valid. Contoh: B 1234 ABC`);
    setEditKenLoading(true);
    try {
      const res = await api.put<Kendaraan>(`/kendaraan/${editKen.id}`, {
        plat: normalizePlat(editKenData.plat),
        name: editKenData.name.trim(),
        tahun: editKenData.tahun || undefined,
        warna: editKenData.warna || undefined,
        odometer: editKenData.odometer ? Number(editKenData.odometer) : undefined,
      });
      setCustomers(customers.map(c => c.id === active.id
        ? { ...c, kendaraan: (c.kendaraan || []).map(kk => kk.id === editKen.id ? { ...kk, ...res.data } : kk) }
        : c));
      toast.success("Berhasil", "Data kendaraan diperbarui");
      setEditKen(null);
    } catch (err: unknown) {
      toast.error("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setEditKenLoading(false);
    }
  };

  const handleDeleteKendaraan = (k: Kendaraan) => {
    if (!active) return;
    toast.confirm(
      `Yakin ingin menghapus kendaraan "${k.name} (${k.plat})"?`,
      async () => {
        try {
          await api.delete(`/kendaraan/${k.id}`);
          setCustomers(customers.map(c => c.id === active.id
            ? { ...c, kendaraan: (c.kendaraan || []).filter(kk => kk.id !== k.id) }
            : c));
          toast.success("Dihapus", `Kendaraan ${k.plat} telah dihapus.`);
        } catch (err: unknown) {
          toast.error("Gagal Menghapus", err instanceof Error ? err.message : "Terjadi kesalahan");
        }
      }
    );
  };

  const handleMerge = async () => {
    if (!active || !mergeTargetId) return;
    setMergeLoading(true);
    try {
      const res = await api.post<{ kendaraan: number; spk: number; loyaltyPoints: number }>(`/pelanggan/${active.id}/merge-into`, { targetId: mergeTargetId });
      toast.success("Berhasil Digabung", `Dipindahkan: ${res.data.kendaraan} kendaraan, ${res.data.spk} SPK, ${res.data.loyaltyPoints} poin.`);
      // Buang pelanggan source dari list
      setCustomers(customers.filter(c => c.id !== active.id));
      setSelected(0);
      setShowMerge(false);
      setMergeTargetId(null);
      setMergeTargetSearch("");
    } catch (err: unknown) {
      toast.error("Gagal Merge", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setMergeLoading(false);
    }
  };

  const handleAddKendaraan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active) return;
    if (!newKenPlat.trim() || !newKenName.trim()) return toast.error("Wajib Diisi", "Plat dan nama kendaraan wajib diisi.");
    if (!isValidPlat(newKenPlat)) return toast.error("Format Plat Tidak Valid", `"${newKenPlat}" bukan format plat yang valid. Contoh: B 1234 ABC`);
    setAddKenLoading(true);
    try {
      const res = await api.post<Kendaraan>("/kendaraan", { pelangganId: active.id, plat: normalizePlat(newKenPlat), name: newKenName });
      setCustomers(customers.map(c => c.id === active.id ? { ...c, kendaraan: [...(c.kendaraan || []), res.data] } : c));
      toast.success("Kendaraan Ditambahkan", `${newKenName} (${newKenPlat.toUpperCase()}) berhasil didaftarkan.`);
      setNewKenPlat(""); setNewKenName(""); setShowAddKen(false);
    } catch (err: unknown) {
      toast.error("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setAddKenLoading(false);
    }
  };

  const handleDeletePelanggan = async () => {
    if (!active) return;
    toast.confirm(
      `Yakin ingin menghapus pelanggan "${active.name}"? Tindakan ini tidak bisa dibatalkan.`,
      async () => {
        setDeleteLoading(true);
        try {
          await api.delete(`/pelanggan/${active.id}`);
          const newList = customers.filter(c => c.id !== active.id);
          setCustomers(newList);
          setTotal(t => t - 1);
          setSelected(0);
          toast.success("Dihapus", `Pelanggan ${active.name} telah dihapus.`);
        } catch (err: unknown) {
          toast.error("Gagal Menghapus", err instanceof Error ? err.message : "Terjadi kesalahan");
        } finally {
          setDeleteLoading(false);
        }
      }
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Pelanggan & Kendaraan</h1>
          <p className="text-muted-foreground text-sm">Kelola database pelanggan — servis kendaraan maupun jasa bubut lepas.</p>
        </div>
        <div className="flex gap-2">
          {reminders.length > 0 && (
            <button onClick={() => setShowReminders(true)}
              className="flex items-center gap-2 text-sm bg-amber-500/10 border border-amber-500/30 text-amber-600 px-3 py-2 rounded-xl hover:bg-amber-500/20 font-medium relative"
              aria-label={`${reminders.length} reminder servis`}>
              <Bell size={16} /> Reminder
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                {reminders.length}
              </span>
            </button>
          )}
          <Link href="/app/kendaraan/tambah" className="flex items-center gap-2 text-sm bg-surface border border-surface-border px-3 py-2 rounded-xl hover:bg-surface-hover font-medium">
            <Car size={16} /> + Pelanggan
          </Link>
          <Link href="/app/spk/create?mode=bubut" className="flex items-center gap-2 btn-glossy bg-primary text-primary-foreground px-3 py-2 rounded-xl font-medium shadow-glossy-primary hover:shadow-glossy-primary-dark text-sm">
            <Hammer size={16} /> + SPK Bubut
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Sidebar List */}
        <div className="glass-panel lg:col-span-1 h-auto max-h-[50vh] lg:h-[calc(100vh-12rem)] lg:max-h-none flex flex-col overflow-hidden">
          <div className="p-3 border-b border-surface-border space-y-2">
            <div className="flex items-center gap-2 bg-surface-hover px-3 py-2 rounded-lg border border-surface-border focus-within:ring-1 focus-within:ring-primary transition-all">
              <Search size={18} className="text-muted-foreground" />
              <input ref={searchInputRef} type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama / telepon... (tekan /)" aria-label="Cari pelanggan" className="bg-transparent border-none focus:outline-none text-sm w-full" />
            </div>
            <div className="flex gap-1 bg-surface-hover rounded-lg border border-surface-border p-0.5">
              {[
                { key: "semua", label: "Semua" },
                { key: "kendaraan", label: "🚗 Kendaraan" },
                { key: "bubut", label: "🔧 Bubut" },
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 px-2 py-1 text-[10px] font-medium rounded-md transition-colors ${tab === t.key ? "bg-background shadow text-foreground border border-surface-border" : "text-muted-foreground"}`}>{t.label}</button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 px-1">
              <ArrowUpDown size={12} className="text-muted-foreground" />
              <select value={sort} onChange={e => setSort(e.target.value as SortKey)} aria-label="Urutkan"
                className="bg-transparent text-[11px] text-muted-foreground focus:outline-none focus:text-foreground cursor-pointer">
                <option value="recent">Terbaru diperbarui</option>
                <option value="name">Nama A-Z</option>
                <option value="spk">Total SPK terbanyak</option>
              </select>
            </div>
          </div>
          {/* Total count bar */}
          {!loading && (
            <div className="px-3 pb-1.5 pt-0.5 flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground">{total > 0 ? `${customers.length} dari ${total} pelanggan` : "Tidak ada hasil"}</p>
              {search && <button onClick={() => setSearch("")} className="text-[10px] text-primary hover:underline flex items-center gap-0.5"><X size={10} />Hapus filter</button>}
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-3 flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="space-y-1.5 flex-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24" /></div>
                </div>
              ))
            ) : sortedCustomers.length === 0 ? (
              <div className="text-center py-8 px-4 space-y-3">
                <User size={32} className="mx-auto opacity-30" />
                <p className="text-sm text-muted-foreground">Tidak ada pelanggan yang cocok</p>
                <Link href="/app/kendaraan/tambah" className="inline-flex items-center gap-1.5 text-xs font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg">
                  <Plus size={13} /> Tambah pelanggan baru
                </Link>
              </div>
            ) : (
              sortedCustomers.map((p, i) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => selectCustomer(i)}
                  aria-pressed={selected === i}
                  className={`w-full text-left p-3 rounded-xl cursor-pointer flex items-center justify-between transition-colors ${selected === i ? 'bg-primary/10 border border-primary/20' : 'hover:bg-surface-hover border border-transparent'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold flex-shrink-0 ${selected === i ? 'bg-primary text-primary-foreground shadow-glossy-primary' : 'bg-surface-border text-muted-foreground'}`}>
                      {p.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{p.name.charAt(0)}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${selected === i ? 'text-primary' : ''}`}>{p.name}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        {p.type === "bubut" ? <><Hammer size={10} /> Bubut Lepas</> :
                         p.type === "both" ? <><CarFront size={10} /> Kendaraan + Bubut</> :
                         <><CarFront size={10} /> {p.kendaraan?.[0]?.name || "Pelanggan"}</>}
                        {(p._count?.spk ?? 0) > 0 && <span className="ml-1 text-muted-foreground">• {p._count?.spk} SPK</span>}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
            {!loading && customers.length < total && (
              <button type="button" onClick={() => setPage(p => p + 1)} disabled={loadingMore}
                className="w-full py-2 text-xs text-primary hover:bg-primary/5 rounded-lg font-medium disabled:opacity-50">
                {loadingMore ? "Memuat..." : `Muat ${Math.min(limit, total - customers.length)} lagi…`}
              </button>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div ref={detailRef} className="space-y-6 lg:col-span-2 scroll-mt-4">
          {!active ? (
            <div className="glass-panel p-12 text-center text-muted-foreground">
              <User size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-sm">Pilih pelanggan dari daftar di samping</p>
            </div>
          ) : (
            <>
              {/* Customer Info */}
              <div className="glass-panel p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><User size={100} className="text-primary" /></div>
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold shadow-glossy-primary flex-shrink-0">
                      {active.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={active.photoUrl} alt={active.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{active.name.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl lg:text-2xl font-bold">{active.name}</h2>
                      <p className="text-muted-foreground flex items-center gap-2 mt-1 text-xs sm:text-sm flex-wrap">
                        {active.phone} {active.email && `• ${active.email}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          active.type === "bubut" ? "bg-purple-500/10 text-purple-600 border-purple-500/20" :
                          active.type === "both" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                          "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        }`}>
                          {active.type === "bubut" ? "🔧 Bubut Lepas" : active.type === "both" ? "🚗🔧 Kendaraan + Bubut" : "🚗 Kendaraan"}
                        </span>
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => setShowMerge(true)}
                        className="p-2 hover:bg-surface-hover rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                        title="Gabungkan ke pelanggan lain" aria-label="Gabungkan pelanggan">
                        <GitMerge size={20} />
                      </button>
                      <button onClick={() => {
                        setEditData({
                          name: active.name,
                          phone: active.phone,
                          email: active.email || "",
                          address: active.address || "",
                          photoUrl: active.photoUrl || null,
                          type: active.type,
                          loyaltyTierId: active.loyaltyTier?.id?.toString() || "",
                        });
                        setShowEdit(true);
                      }} className="p-2 hover:bg-surface-hover rounded-lg text-muted-foreground hover:text-foreground transition-colors" title="Edit pelanggan" aria-label="Edit pelanggan"><Edit size={20} /></button>
                    </div>
                  )}
                </div>
                <div className="mt-6 grid grid-cols-3 gap-4 pt-6 border-t border-surface-border">
                  <div><p className="text-xs text-muted-foreground">Total Kendaraan</p><p className="text-lg font-semibold">{active.kendaraan?.length || 0}</p></div>
                  <div><p className="text-xs text-muted-foreground">Total SPK</p><p className="text-lg font-semibold">{active._count?.spk || 0}</p></div>
                  <div><p className="text-xs text-muted-foreground">Status Loyalty</p><p className="text-lg font-semibold text-primary">{active.loyaltyTier?.name || "—"}</p></div>
                </div>
                <LoyaltyHistoryPreview pelangganId={active.id} />
              </div>

              {/* Kendaraan Section */}
              <div className="glass-panel p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2"><Car size={20} className="text-primary" /> Garasi Kendaraan</h3>
                  {active.type !== "bubut" && (
                    <button onClick={() => setShowAddKen(true)} className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors">
                      <Plus size={13} /> Tambah Kendaraan
                    </button>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {(active.kendaraan || []).map((k) => (
                    <div key={k.id} className="border border-surface-border rounded-xl p-4 bg-surface-hover/30 hover:bg-surface-hover/60 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-semibold">{k.name}</p>
                        <span className="px-2 py-0.5 bg-background border border-surface-border rounded text-xs font-medium font-mono">{k.plat}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-4">
                        {k.tahun ? `Tahun ${k.tahun}` : ""} {k.warna ? `• Warna ${k.warna}` : ""}
                      </p>
                      <div className="flex gap-2">
                        <Link href={`/app/spk/create?pelangganId=${active.id}&kendaraanId=${k.id}`} className="flex-1 text-center text-xs bg-primary/10 text-primary hover:bg-primary/20 py-1.5 rounded-lg transition-colors border border-primary/20 font-medium">Buat SPK</Link>
                        <Link href={`/app/kendaraan/${k.id}`} className="flex-1 text-xs bg-surface border border-surface-border hover:bg-surface-hover py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 font-medium">
                          <History size={14} /> Detail
                        </Link>
                      </div>
                      <div className="flex gap-1 mt-2">
                        <button onClick={() => openEditKendaraan(k)} className="flex-1 text-[11px] bg-surface-hover/50 hover:bg-surface-hover text-muted-foreground hover:text-foreground py-1 rounded-lg transition-colors flex items-center justify-center gap-1">
                          <Edit size={11} /> Edit
                        </button>
                        {isAdmin && (
                          <button onClick={() => handleDeleteKendaraan(k)} className="flex-1 text-[11px] bg-red-500/5 hover:bg-red-500/10 text-red-600 py-1 rounded-lg transition-colors flex items-center justify-center gap-1">
                            <Trash2 size={11} /> Hapus
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {(!active.kendaraan || active.kendaraan.length === 0) && (
                  <div className="text-center py-6 border border-dashed border-surface-border rounded-xl">
                    <p className="text-sm text-muted-foreground">Belum ada kendaraan terdaftar</p>
                  </div>
                )}
              </div>

              {/* Admin: Delete Button */}
              {isAdmin && (
                <div className="glass-panel p-4 border-red-500/20 border bg-red-500/3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-red-600">Hapus Pelanggan</p>
                      <p className="text-xs text-muted-foreground">Hanya dapat dilakukan jika tidak ada SPK aktif.</p>
                    </div>
                    <button onClick={handleDeletePelanggan} disabled={deleteLoading || (active._count?.spk ?? 0) > 0} className="flex items-center gap-2 text-xs font-bold px-4 py-2 bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/30 rounded-xl transition-colors disabled:opacity-40 disabled:pointer-events-none">
                      <Trash2 size={14} /> {deleteLoading ? "Menghapus..." : "Hapus"}
                    </button>
                  </div>
                  {(active._count?.spk ?? 0) > 0 && <p className="text-[10px] text-amber-600 mt-2 flex items-center gap-1"><AlertTriangle size={10} /> Pelanggan memiliki {active._count?.spk} riwayat SPK dan tidak dapat dihapus.</p>}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showEdit && active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-surface border border-surface-border shadow-2xl rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-surface-border flex justify-between items-center bg-surface-hover/50">
              <h3 className="font-bold text-lg text-primary">Edit Profil Pelanggan</h3>
              <button onClick={() => setShowEdit(false)} className="text-muted-foreground hover:text-foreground"><AlertTriangle size={18} className="opacity-0" />✕</button>
            </div>
            <form onSubmit={handleEditPelanggan} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-center pb-2">
                <PhotoUploader value={editData.photoUrl} onChange={(url) => setEditData({ ...editData, photoUrl: url })} size={90} label="Foto pelanggan" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nama <span className="text-red-500">*</span></label>
                <input type="text" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} required className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">No. Telepon (WhatsApp)</label>
                <input type="text" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} required className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <input type="email" value={editData.email} onChange={e => setEditData({...editData, email: e.target.value})} className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Alamat Domisili</label>
                <textarea rows={2} value={editData.address} onChange={e => setEditData({...editData, address: e.target.value})} className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Tipe Pelanggan</label>
                  <select value={editData.type} onChange={e => setEditData({...editData, type: e.target.value as "kendaraan" | "bubut" | "both"})}
                    className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="kendaraan">🚗 Kendaraan</option>
                    <option value="bubut">🔧 Bubut Lepas</option>
                    <option value="both">🚗🔧 Keduanya</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Tier Loyalty</label>
                  <select value={editData.loyaltyTierId} onChange={e => setEditData({...editData, loyaltyTierId: e.target.value})}
                    className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="">— Tidak ada —</option>
                    {tiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-surface-border">
                <button type="button" onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm font-medium border border-surface-border rounded-xl hover:bg-surface-hover">Batal</button>
                <button type="submit" disabled={editLoading} className="px-5 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-xl shadow-glossy-primary hover:shadow-glossy-primary-dark transition-all disabled:opacity-70">
                  {editLoading ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editKen && active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-surface border border-surface-border shadow-2xl rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-surface-border flex justify-between items-center bg-surface-hover/50">
              <h3 className="font-bold text-lg text-primary">Edit Kendaraan</h3>
              <button onClick={() => setEditKen(null)} aria-label="Tutup" className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
            </div>
            <form onSubmit={handleEditKendaraan} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Plat <span className="text-red-500">*</span></label>
                  <input type="text" value={editKenData.plat} onChange={e => setEditKenData({...editKenData, plat: e.target.value})} required className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono uppercase" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Nama / Tipe <span className="text-red-500">*</span></label>
                  <input type="text" value={editKenData.name} onChange={e => setEditKenData({...editKenData, name: e.target.value})} required className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Tahun</label>
                  <input type="number" min="1980" max="2030" value={editKenData.tahun} onChange={e => setEditKenData({...editKenData, tahun: e.target.value})} className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Warna</label>
                  <input type="text" value={editKenData.warna} onChange={e => setEditKenData({...editKenData, warna: e.target.value})} className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Odometer (km)</label>
                  <input type="number" min="0" value={editKenData.odometer} onChange={e => setEditKenData({...editKenData, odometer: e.target.value})} className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-surface-border">
                <button type="button" onClick={() => setEditKen(null)} className="px-4 py-2 text-sm font-medium border border-surface-border rounded-xl hover:bg-surface-hover">Batal</button>
                <button type="submit" disabled={editKenLoading} className="px-5 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-xl shadow-glossy-primary hover:shadow-glossy-primary-dark transition-all disabled:opacity-70">
                  {editKenLoading ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddKen && active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-surface border border-surface-border shadow-2xl rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-surface-border flex justify-between items-center bg-surface-hover/50">
              <h3 className="font-bold text-lg text-primary">Tambah Kendaraan</h3>
              <button onClick={() => { setShowAddKen(false); setNewKenPlat(""); setNewKenName(""); }} aria-label="Tutup" className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
            </div>
            <form onSubmit={handleAddKendaraan} className="p-5 space-y-4">
              <p className="text-xs text-muted-foreground">Mendaftarkan kendaraan baru ke profil <span className="font-semibold text-foreground">{active.name}</span>.</p>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nomor Polisi <span className="text-red-500">*</span></label>
                <input type="text" value={newKenPlat} onChange={e => setNewKenPlat(e.target.value)} required placeholder="AB 1234 CD" className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono uppercase" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nama / Tipe Kendaraan <span className="text-red-500">*</span></label>
                <input type="text" value={newKenName} onChange={e => setNewKenName(e.target.value)} required placeholder="Honda Vario 150, Toyota Avanza, dll." className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-surface-border">
                <button type="button" onClick={() => setShowAddKen(false)} className="px-4 py-2 text-sm font-medium border border-surface-border rounded-xl hover:bg-surface-hover">Batal</button>
                <button type="submit" disabled={addKenLoading} className="px-5 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-xl shadow-glossy-primary hover:shadow-glossy-primary-dark transition-all disabled:opacity-70">
                  {addKenLoading ? "Menyimpan..." : "Tambah Kendaraan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reminders Modal */}
      {showReminders && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={() => setShowReminders(false)}>
          <div className="bg-surface border border-surface-border shadow-2xl rounded-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-surface-border flex justify-between items-center bg-surface-hover/50">
              <h3 className="font-bold text-lg text-primary flex items-center gap-2"><Bell size={18} /> Reminder Servis ({reminders.length})</h3>
              <button onClick={() => setShowReminders(false)} aria-label="Tutup" className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
            </div>
            <div className="p-5 max-h-[70vh] overflow-y-auto space-y-2">
              {reminders.map((k) => {
                const color = k.reminderStatus === "overdue" ? "text-red-600 bg-red-500/5 border-red-500/20"
                  : k.reminderStatus === "due_soon" ? "text-amber-600 bg-amber-500/5 border-amber-500/20"
                  : "text-blue-600 bg-blue-500/5 border-blue-500/20";
                const label = k.reminderStatus === "overdue" ? "Terlewat" : k.reminderStatus === "due_soon" ? "Segera" : "Mendatang";
                const waLink = k.pelanggan?.phone ? `https://wa.me/${k.pelanggan.phone}?text=${encodeURIComponent(`Halo ${k.pelanggan.name}, saatnya servis rutin untuk ${k.name} (${k.plat}). Jadwalkan kunjungan?`)}` : null;
                return (
                  <div key={k.id} className={`p-3 rounded-xl border ${color} flex items-center justify-between gap-3`}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{k.name}</span>
                        <span className="font-mono text-xs opacity-70">{k.plat}</span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${color}`}>{label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {k.pelanggan?.name} • {k.pelanggan?.phone}
                        {k.nextServiceDate && ` • Jadwal ${formatTanggal(k.nextServiceDate)}`}
                        {k.nextServiceKm && ` • Target ${k.nextServiceKm.toLocaleString("id-ID")} km`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {waLink && (
                        <a href={waLink} target="_blank" rel="noopener" className="text-[11px] font-medium bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 px-2 py-1 rounded-lg">
                          WhatsApp
                        </a>
                      )}
                      <Link href={`/app/kendaraan/${k.id}`} className="text-[11px] font-medium bg-primary/10 text-primary hover:bg-primary/20 px-2 py-1 rounded-lg">
                        Detail
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Merge Modal */}
      {showMerge && active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={() => setShowMerge(false)}>
          <div className="bg-surface border border-surface-border shadow-2xl rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-surface-border flex justify-between items-center bg-surface-hover/50">
              <h3 className="font-bold text-lg text-primary flex items-center gap-2"><GitMerge size={18} /> Gabungkan Pelanggan</h3>
              <button onClick={() => setShowMerge(false)} aria-label="Tutup" className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-400">
                <p className="font-bold flex items-center gap-1.5 mb-1"><AlertTriangle size={12} /> Perhatian</p>
                <p>
                  Semua <strong>kendaraan</strong>, <strong>SPK</strong>, dan <strong>poin loyalty</strong> dari <strong>{active.name}</strong> akan dipindahkan ke pelanggan target. Kemudian <strong>{active.name}</strong> akan di-soft-delete.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Cari Pelanggan Target</label>
                <input type="text" value={mergeTargetSearch} onChange={e => { setMergeTargetSearch(e.target.value); setMergeTargetId(null); }}
                  placeholder="Ketik nama atau no. telepon..."
                  className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              {mergeTargetSearch && (
                <div className="border border-surface-border rounded-xl max-h-48 overflow-y-auto">
                  {customers
                    .filter(c => c.id !== active.id && (c.name.toLowerCase().includes(mergeTargetSearch.toLowerCase()) || c.phone.includes(mergeTargetSearch)))
                    .slice(0, 8)
                    .map(c => (
                      <button key={c.id} type="button" onClick={() => { setMergeTargetId(c.id); setMergeTargetSearch(c.name); }}
                        className={`w-full text-left p-3 hover:bg-surface-hover border-b border-surface-border last:border-0 transition-colors ${mergeTargetId === c.id ? "bg-primary/10" : ""}`}>
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">{c.phone} • {c.kendaraan?.length || 0} kendaraan • {c._count?.spk || 0} SPK</p>
                      </button>
                    ))}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4 border-t border-surface-border">
                <button type="button" onClick={() => setShowMerge(false)}
                  className="px-4 py-2 text-sm font-medium border border-surface-border rounded-xl hover:bg-surface-hover">
                  Batal
                </button>
                <button type="button" onClick={handleMerge} disabled={!mergeTargetId || mergeLoading}
                  className="px-5 py-2 text-sm font-bold bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2">
                  {mergeLoading ? <><Loader2Icon /> Menggabungkan...</> : <><GitMerge size={14} /> Gabungkan</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Loader2Icon() {
  return <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />;
}

function LoyaltyHistoryPreview({ pelangganId }: { pelangganId: number }) {
  const [items, setItems] = useState<LoyaltyPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoading(true);
    setLoaded(false);
    api.get<LoyaltyPoint[]>(`/loyalty/history/${pelangganId}`)
      .then((res) => setItems((res.data || []).slice(0, 3)))
      .catch(() => setItems([]))
      .finally(() => { setLoading(false); setLoaded(true); });
  }, [pelangganId]);

  if (loading || !loaded) return null;
  if (items.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-surface-border">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Award size={12} className="text-amber-500" /> Aktivitas Poin Terakhir
        </p>
        <Link href={`/app/loyalty?pelangganId=${pelangganId}`} className="text-[10px] text-primary hover:underline">
          Lihat semua
        </Link>
      </div>
      <div className="space-y-1.5">
        {items.map((it) => (
          <div key={it.id} className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground truncate flex-1 mr-2">
              {formatTanggal(it.createdAt)} • {it.description || (it.type === "earn" ? "Poin masuk" : "Penukaran")}
            </span>
            <span className={`font-mono font-bold ${it.type === "earn" ? "text-emerald-600" : "text-red-600"}`}>
              {it.type === "earn" ? "+" : "-"}{Math.abs(it.points)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
