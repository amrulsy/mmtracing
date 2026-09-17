"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Plus, Trash2, Loader2, AlertCircle, Info, CheckCircle2, X, Search, UserPlus, Car, Check } from "lucide-react";
import { toast } from "@/lib/toast";
import { api } from "@/lib/api";
import type { Pelanggan, Kendaraan, Mekanik, Jasa, Sparepart } from "@/lib/types";
import { Skeleton } from "@/components/ui/loading-skeleton";
import { SparepartPicker, ImageUploader } from "./SpkExtras";
import { ServiceBundlePicker } from "./ServiceBundles";
import { CustomerVehicleForm } from "./CustomerVehicleForm";
import { StageTemplates } from "./StageTemplates";

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

 // Mobile Wizard State
 const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

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
 const [odometerMasuk, setOdometerMasuk] = useState("");
 const [mekanikId, setMekanikId] = useState("");
 const [prioritas, setPrioritas] = useState<"rendah" | "normal" | "tinggi" | "urgent">("normal");
 const [keluhan, setKeluhan] = useState("");

 // Modifikasi
 const [judulProyek, setJudulProyek] = useState("");
 const [spesifikasi, setSpesifikasi] = useState("");
 const [modifikasiStages, setModifikasiStages] = useState<StageInput[]>([{ nama: "", estimasiBiaya: 0, durasiHari: 1 }]);

 // Bubut
 const [bubutKeluhan, setBubutKeluhan] = useState("");
 const [namaBubut, setNamaBubut] = useState("");
 const [bubutStages, setBubutStages] = useState<StageInput[]>([]);
 const [materialFromCustomer, setMaterialFromCustomer] = useState(false);

 // Upload gambar referensi (modifikasi)
 const [referensiFiles, setReferensiFiles] = useState<File[]>([]);
 const [referensiPreviews, setReferensiPreviews] = useState<string[]>([]);

 // Stages aktif sesuai mode (computed)
 const stages = mode === "modifikasi" ? modifikasiStages : mode === "bubut" ? bubutStages : [];
 const setStages: React.Dispatch<React.SetStateAction<StageInput[]>> = (updater) => {
 if (mode === "modifikasi") setModifikasiStages(updater);
 else if (mode === "bubut") setBubutStages(updater);
 };

 // Modals & Combobox
 const [showAddPelanggan, setShowAddPelanggan] = useState(false);
 const [newPelangganName, setNewPelangganName] = useState("");
 const [newPelangganPhone, setNewPelangganPhone] = useState("");
 const [addingPelanggan, setAddingPelanggan] = useState(false);

 const [showAddKendaraan, setShowAddKendaraan] = useState(false);
 const [newKendaraanName, setNewKendaraanName] = useState("");
 const [newKendaraanPlat, setNewKendaraanPlat] = useState("");
 const [addingKendaraan, setAddingKendaraan] = useState(false);

 // Modal review pre-submit
 const [showReview, setShowReview] = useState(false);

 const [pelangganSearch, setPelangganSearch] = useState("");
 const [showPelDropdown, setShowPelDropdown] = useState(false);

 const [kendaraanSearch, setKendaraanSearch] = useState("");
 const [showKenDropdown, setShowKenDropdown] = useState(false);

 // DP percentages dinamis dari settings (default 40%)
 const [dpPersen, setDpPersen] = useState({ modifikasi: 40, bubut: 40 });
 useEffect(() => {
 api.get<{ general?: Record<string, string> }>("/settings/config")
 .then(res => {
 const g = res.data?.general || {};
 const m = Number(g.dp_modifikasi_persen);
 const b = Number(g.dp_bubut_persen);
 setDpPersen({
 modifikasi: !isNaN(m) && m >= 0 && m <= 100 ? m : 40,
 bubut: !isNaN(b) && b >= 0 && b <= 100 ? b : 40,
 });
 })
 .catch(() => { /* fallback 40% */ });
 }, []);
 const dpPctNow = mode === "modifikasi" ? dpPersen.modifikasi : mode === "bubut" ? dpPersen.bubut : 0;

 // Load mekanik sekali di awal
 useEffect(() => {
 api.getPaginated<Mekanik>("/mekanik", { limit: 100 })
 .then(res => setMekanikList(res.data))
 .catch(() => toast.error("Gagal", "Gagal memuat data mekanik"))
 .finally(() => setLoadingOptions(false));
 }, []);

 // Clone support: read template dari localStorage jika ?clone=1
 useEffect(() => {
 if (searchParams.get("clone") !== "1") return;
 try {
 const raw = localStorage.getItem("mm_spk_clone");
 if (!raw) return;
 const t = JSON.parse(raw);
 if (t.pelangganId) setPelangganId(String(t.pelangganId));
 if (t.kendaraanId) setKendaraanId(String(t.kendaraanId));
 if (t.mekanikId) setMekanikId(String(t.mekanikId));
 if (t.prioritas) setPrioritas(t.prioritas);
 if (t.keluhan) setKeluhan(t.keluhan);
 if (t.judulProyek) setJudulProyek(t.judulProyek);
 if (t.spesifikasi) setSpesifikasi(t.spesifikasi);
 if (Array.isArray(t.items)) {
 const jasaItems: SelectedJasa[] = t.items.filter((i: { type: string }) => i.type === "jasa").map((i: { jasaId?: number; nama: string; qty: number; hargaSatuan: number }) => ({ jasaId: i.jasaId ?? 0, nama: i.nama, qty: i.qty, harga: i.hargaSatuan }));
 const spItems: SelectedSparepart[] = t.items.filter((i: { type: string }) => i.type === "sparepart").map((i: { sparepartId?: number; nama: string; qty: number; hargaSatuan: number }) => ({ sparepartId: i.sparepartId ?? 0, nama: i.nama, qty: i.qty, harga: i.hargaSatuan }));
 if (jasaItems.length) setSelectedJasaItems(jasaItems);
 if (spItems.length) setSelectedSparepartItems(spItems);
 }
 if (Array.isArray(t.stages) && t.stages.length) {
 setStages(t.stages);
 }
 localStorage.removeItem("mm_spk_clone");
 toast.success("Data Disalin", "Form diisi dari Work Order sebelumnya. Silakan ubah sesuai kebutuhan.");
 } catch { /* ignore */ }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 // Autosave draft ke localStorage per mode (tidak saat clone)
 const DRAFT_KEY = `mm_spk_draft_${mode}`;
 useEffect(() => {
 if (searchParams.get("clone") === "1") return;
 const timer = setTimeout(() => {
 try {
 const draft = {
 pelangganId, kendaraanId, odometerMasuk, mekanikId, prioritas, keluhan,
 judulProyek, spesifikasi, stages, bubutKeluhan, namaBubut,
 selectedJasaItems, selectedSparepartItems,
 savedAt: new Date().toISOString(),
 };
 // Hanya simpan jika ada isi substansial
 const hasContent = pelangganId || keluhan || judulProyek || selectedJasaItems.length || selectedSparepartItems.length;
 if (hasContent) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
 } catch { /* ignore */ }
 }, 1000);
 return () => clearTimeout(timer);
 }, [DRAFT_KEY, pelangganId, kendaraanId, odometerMasuk, mekanikId, prioritas, keluhan, judulProyek, spesifikasi, stages, bubutKeluhan, namaBubut, selectedJasaItems, selectedSparepartItems, searchParams]);

 // Restore draft prompt
 const [draftAvailable, setDraftAvailable] = useState<{ savedAt: string } | null>(null);
 useEffect(() => {
 if (searchParams.get("clone") === "1") return;
 try {
 const raw = localStorage.getItem(DRAFT_KEY);
 if (!raw) return;
 const d = JSON.parse(raw);
 if (d && d.savedAt) setDraftAvailable({ savedAt: d.savedAt });
 } catch { /* ignore */ }
 }, [DRAFT_KEY, searchParams]);

 const restoreDraft = () => {
 try {
 const raw = localStorage.getItem(DRAFT_KEY);
 if (!raw) return;
 const d = JSON.parse(raw);
 if (d.pelangganId) setPelangganId(d.pelangganId);
 if (d.kendaraanId) setKendaraanId(d.kendaraanId);
 if (d.odometerMasuk) setOdometerMasuk(d.odometerMasuk);
 if (d.mekanikId) setMekanikId(d.mekanikId);
 if (d.prioritas) setPrioritas(d.prioritas);
 if (d.keluhan) setKeluhan(d.keluhan);
 if (d.judulProyek) setJudulProyek(d.judulProyek);
 if (d.spesifikasi) setSpesifikasi(d.spesifikasi);
 if (Array.isArray(d.stages) && d.stages.length) setStages(d.stages);
 if (d.bubutKeluhan) setBubutKeluhan(d.bubutKeluhan);
 if (d.namaBubut) setNamaBubut(d.namaBubut);
 if (Array.isArray(d.selectedJasaItems)) setSelectedJasaItems(d.selectedJasaItems);
 if (Array.isArray(d.selectedSparepartItems)) setSelectedSparepartItems(d.selectedSparepartItems);
 setDraftAvailable(null);
 toast.success("Draft Dipulihkan");
 } catch {
 toast.error("Gagal memulihkan draft");
 }
 };

 const dismissDraft = () => {
 try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
 setDraftAvailable(null);
 };



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

 // Load sparepart saat mode rutin/modifikasi/bubut atau search berubah
 useEffect(() => {
 const timer = setTimeout(() => {
 setLoadingSparepart(true);
 api.getPaginated<Sparepart>("/sparepart", { limit: 50, search: sparepartSearch })
 .then(res => setSparepartList(res.data))
 .catch(() => {})
 .finally(() => setLoadingSparepart(false));
 }, 300);
 return () => clearTimeout(timer);
 }, [sparepartSearch]);

 const initialKendaraanId = searchParams.get("kendaraanId");



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

 // ── Helpers Service Bundle ──────────────────────────────────
 const handleSelectBundle = (items: Array<{ type: 'jasa' | 'sparepart'; id: number; nama: string; harga: number; qty: number }>) => {
 // Add jasa
 items.filter(i => i.type === 'jasa').forEach(j => {
 setSelectedJasaItems(prev => {
 const exists = prev.find(x => x.jasaId === j.id);
 if (exists) return prev.map(x => x.jasaId === j.id ? { ...x, qty: x.qty + j.qty } : x);
 return [...prev, { jasaId: j.id, nama: j.nama, harga: j.harga, qty: j.qty }];
 });
 });

 // Add sparepart
 items.filter(i => i.type === 'sparepart').forEach(sp => {
 setSelectedSparepartItems(prev => {
 const exists = prev.find(x => x.sparepartId === sp.id);
 if (exists) return prev.map(x => x.sparepartId === sp.id ? { ...x, qty: x.qty + sp.qty } : x);
 return [...prev, { sparepartId: sp.id, nama: sp.nama, harga: sp.harga, qty: sp.qty }];
 });
 });
 };

 // ── Helpers stages ─────────────────────────────────────────
 const addStage = () => setStages(prev => [...prev, { nama: "", estimasiBiaya: 0, durasiHari: 1 }]);
 const removeStage = (i: number) => setStages(prev => prev.filter((_, idx) => idx !== i));
 const updateStage = (i: number, field: keyof StageInput, value: string | number) => {
 setStages(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
 };

 const totalEstimasi = stages.reduce((sum, s) => sum + (Number(s.estimasiBiaya) || 0), 0);
 const totalDurasi = stages.reduce((sum, s) => sum + (Number(s.durasiHari) || 0), 0);
 const formatRp = (n: number) => `Rp ${Number(n).toLocaleString("id-ID")}`;
 const isLongDuration = totalDurasi > 30;
 const isHighValue = totalEstimasi > 50000000;
 const estimasiSelesai = totalDurasi > 0 ? (() => {
 const d = new Date();
 d.setDate(d.getDate() + totalDurasi);
 return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
 })() : null;

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
 // Validasi dan tampilkan modal review (untuk modifikasi/bubut dengan nilai > 0)
 async function handleSubmit(e: FormEvent) {
 e.preventDefault();
 setError("");

 // Validasi dasar dulu sebelum modal review
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

 // Tampilkan review untuk modifikasi/bubut yang punya nilai signifikan
 const totalSubmit = mode === "rutin" ? (totalJasa + totalSparepart) : (totalEstimasi + totalSparepart);
 if (mode !== "rutin" && totalSubmit > 0) {
 setShowReview(true);
 return;
 }

 await doSubmit();
 }

 async function doSubmit() {
 setShowReview(false);
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
 if (kendaraanId && odometerMasuk) body.odometerMasuk = Number(odometerMasuk);
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
 // Sparepart/material opsional untuk modifikasi
 if (selectedSparepartItems.length > 0) {
 body.items = selectedSparepartItems.map(x => ({
 type: "sparepart",
 sparepartId: x.sparepartId,
 nama: x.nama,
 qty: x.qty,
 hargaSatuan: Number(x.harga),
 }));
 }
 } else if (mode === "bubut") {
 body.keluhan = bubutKeluhan;
 const catatanParts: string[] = [];
 if (namaBubut) catatanParts.push(`Nama: ${namaBubut}`);
 if (materialFromCustomer) catatanParts.push("Material disediakan customer");
 if (catatanParts.length) body.catatan = catatanParts.join(" | ");
 // Hanya kirim stages jika ada dan terisi (bubut tidak wajib punya stages)
 const validStages = stages.filter(s => s.nama.trim());
 if (validStages.length > 0) {
 body.stages = validStages.map(s => ({
 nama: s.nama,
 estimasiBiaya: Number(s.estimasiBiaya),
 durasiHari: Number(s.durasiHari),
 }));
 }
 // Material/sparepart opsional untuk bubut, kecuali jika customer bawa sendiri
 if (!materialFromCustomer && selectedSparepartItems.length > 0) {
 body.items = selectedSparepartItems.map(x => ({
 type: "sparepart",
 sparepartId: x.sparepartId,
 nama: x.nama,
 qty: x.qty,
 hargaSatuan: Number(x.harga),
 }));
 }
 }

 const res = await api.post<{ id: number }>("/work-order", body);
 const newSpkId = res.data.id;

 // Upload gambar referensi (modifikasi) bila ada — pakai allSettled agar tahu file mana yang gagal
 if (mode === "modifikasi" && referensiFiles.length > 0) {
 const results = await Promise.allSettled(referensiFiles.map((file, idx) => {
 const fd = new FormData();
 fd.append("photo", file);
 fd.append("type", "lampiran");
 fd.append("caption", `Referensi ${idx + 1}`);
 return api.upload(`/work-order/${newSpkId}/photos`, fd);
 }));
 const failedCount = results.filter(r => r.status === "rejected").length;
 if (failedCount > 0) {
 toast.error(`${failedCount} dari ${referensiFiles.length} gambar gagal diupload — silakan retry dari halaman WorkOrder.`);
 }
 }

 try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
 router.push(`/app/work-order/${newSpkId}`);
 } catch (err: unknown) {
 const msg = err instanceof Error ? err.message : "Gagal memBuat Work Order";
 setError(msg);
 window.scrollTo({ top: 0, behavior: "smooth" });
 } finally {
 setSubmitting(false);
 }
 }

 return (
 <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out max-w-4xl mx-auto pb-24">
 <div className="flex items-center gap-4">
 <Link href="/app/work-order" className="p-2 hover:bg-surface-hover rounded-xl border border-surface-border glass transition-colors">
 <ArrowLeft size={20} />
 </Link>
 <div>
 <h1 className="text-2xl font-bold tracking-tight">Buat Work Order Baru</h1>
 <p className="text-muted-foreground text-sm">Pilih jenis layanan dan lengkapi detail perintah kerja.</p>
 </div>
 </div>

 {error && (
 <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
 <AlertCircle size={16} className="shrink-0" />
 <span>{error}</span>
 </div>
 )}

 {draftAvailable && (
 <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-sm animate-in fade-in slide-in-from-top-2 duration-300">
 <AlertCircle size={16} className="shrink-0 text-blue-600" />
 <div className="flex-1">
 <p className="font-semibold text-blue-700 dark:text-blue-400">Draft tersimpan</p>
 <p className="text-xs text-muted-foreground">Disimpan otomatis pada {new Date(draftAvailable.savedAt).toLocaleString("id-ID")}</p>
 </div>
 <button type="button" onClick={restoreDraft} className="px-3 py-1.5 text-xs font-bold bg-blue-500 text-white rounded-lg hover:bg-blue-600">Pulihkan</button>
 <button type="button" onClick={dismissDraft} className="px-3 py-1.5 text-xs font-medium border border-surface-border rounded-lg hover:bg-surface-hover">Abaikan</button>
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
 Mode modifikasi memerlukan minimum DP {dpPersen.modifikasi}% dari total estimasi biaya tahapan.
 </div>
 )}
 </div>

 {/* #14: Mobile Step Indicator */}
 <div className="flex items-center justify-center gap-2 py-3 px-6 border-b border-surface-border sm:hidden">
 {["Data Pelanggan", "Pekerjaan", "Prioritas"].map((label, i) => {
 const stepNum = i + 1;
 const isActive = currentStep === stepNum;
 const isPast = currentStep > stepNum;
 return (
 <div key={i} className="flex items-center gap-1.5" onClick={() => isPast && setCurrentStep(stepNum as 1|2|3)}>
 <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${isActive ? "bg-primary text-white border-primary" : isPast ? "bg-primary/20 text-primary border-primary cursor-pointer" : "border-surface-border text-muted-foreground"}`}>
 {isPast ? <Check size={12} /> : stepNum}
 </div>
 <span className={`text-xs whitespace-nowrap ${isActive ? "font-bold text-primary" : "text-muted-foreground"}`}>{label}</span>
 {i < 2 && <div className={`w-3 sm:w-4 h-0.5 ${isPast ? "bg-primary" : "bg-surface-border"}`} />}
 </div>
 );
 })}
 </div>

 <div className="p-6 space-y-8">

 {/* ── Section 1: Pelanggan & Kendaraan ── */}
 <section className={`sm:block ${currentStep === 1 ? 'block animate-in fade-in slide-in-from-right-4' : 'hidden'}`}>
 <h3 className="text-sm font-semibold mb-4 text-primary uppercase tracking-wider hidden sm:block">
 1. {mode === "bubut" ? "Data Pelanggan" : "Pilih Kendaraan"}
 </h3>
 <div className="space-y-4">
 <CustomerVehicleForm
 mode={mode}
 pelangganId={pelangganId}
 setPelangganId={setPelangganId}
 kendaraanId={kendaraanId}
 setKendaraanId={setKendaraanId}
 odometerMasuk={odometerMasuk}
 setOdometerMasuk={setOdometerMasuk}
 pelangganSearch={pelangganSearch}
 setPelangganSearch={setPelangganSearch}
 kendaraanSearch={kendaraanSearch}
 setKendaraanSearch={setKendaraanSearch}
 />
 
 {mode === "bubut" && (
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
 <section className={`sm:block ${currentStep === 2 ? 'block animate-in fade-in slide-in-from-right-4' : 'hidden'}`}>
 <h3 className="text-sm font-semibold mb-4 text-primary uppercase tracking-wider hidden sm:block">
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

 {/* Paket Servis Cepat */}
 <div className="pt-2">
 <ServiceBundlePicker onSelectBundle={handleSelectBundle} />
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
 <p className="text-xs text-muted-foreground mt-0.5">
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
 <p className="text-xs text-muted-foreground">{formatRp(item.harga)} × {item.qty} = <span className="font-semibold text-primary">{formatRp(item.harga * item.qty)}</span></p>
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
 <p className="text-xs text-muted-foreground mt-0.5">
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
 <p className="text-xs text-muted-foreground">{formatRp(item.harga)} × {item.qty} = <span className="font-semibold text-primary">{formatRp(item.harga * item.qty)}</span></p>
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
 <div className="flex items-start gap-2 p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[11px] text-blue-700 dark:text-blue-400">
 <Info size={12} className="shrink-0 mt-0.5" />
 <span>Stage hanya untuk biaya <b>jasa/labor</b>. Material/sparepart masuk ke section di bawah agar tidak terhitung dua kali.</span>
 </div>
 <StageTemplates mode="modifikasi" currentStages={modifikasiStages} onLoad={(s) => setModifikasiStages(s)} />
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
 Minimum DP ({dpPersen.modifikasi}%): <span className="font-bold">{formatRp(Math.ceil((totalEstimasi * dpPersen.modifikasi) / 100))}</span>
 </div>
 )}
 {(isLongDuration || isHighValue) && (
 <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl text-xs text-orange-700 dark:text-orange-400 flex items-start gap-2">
 <AlertCircle size={13} className="shrink-0 mt-0.5" />
 <div>
 <p className="font-semibold">Proyek Skala Besar</p>
 <p className="text-[11px] mt-0.5">
 {isLongDuration && <>Total durasi <b>{totalDurasi} hari</b> melebihi 30 hari. </>}
 {isHighValue && <>Estimasi <b>{formatRp(totalEstimasi)}</b> melebihi Rp 50jt. </>}
 Pastikan estimasi sudah dikonfirmasi dengan pelanggan.
 </p>
 </div>
 </div>
 )}
 </div>

 <SparepartPicker
 label="Kebutuhan Sparepart / Material (Opsional)"
 sparepartList={sparepartList}
 sparepartSearch={sparepartSearch}
 setSparepartSearch={setSparepartSearch}
 loadingSparepart={loadingSparepart}
 selectedSparepartItems={selectedSparepartItems}
 addSparepart={addSparepart}
 removeSparepart={removeSparepart}
 updateSparepartQty={updateSparepartQty}
 totalSparepart={totalSparepart}
 formatRp={formatRp}
 />

 <ImageUploader
 files={referensiFiles}
 setFiles={setReferensiFiles}
 previews={referensiPreviews}
 setPreviews={setReferensiPreviews}
 />
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

 <label className="flex items-center gap-2 p-3 bg-surface-hover/40 border border-surface-border rounded-xl cursor-pointer hover:bg-surface-hover transition-colors">
 <input type="checkbox" checked={materialFromCustomer} onChange={e => setMaterialFromCustomer(e.target.checked)}
 className="w-4 h-4 accent-primary" />
 <div className="flex-1">
 <p className="text-sm font-medium">Material disediakan customer</p>
 <p className="text-[11px] text-muted-foreground">Bengkel hanya kerjakan jasa bubut, material dibawa pelanggan.</p>
 </div>
 </label>
 
 {/* Tahapan Bubut (Opsional) */}
 <div className="space-y-3 pt-2">
 <div className="flex items-center justify-between">
 <label className="text-xs font-medium text-muted-foreground">Tahapan Pekerjaan (Opsional)</label>
 {totalEstimasi > 0 && <span className="text-xs font-bold text-primary">Total: {formatRp(totalEstimasi)}</span>}
 </div>
 <StageTemplates mode="bubut" currentStages={bubutStages} onLoad={(s) => setBubutStages(s)} />
 {stages.length > 0 && stages.map((stage, i) => (
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
 <button type="button" onClick={() => removeStage(i)}
 className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors">
 <Trash2 size={16} />
 </button>
 </div>
 </div>
 ))}
 {stages.length > 0 && (
 <div className="text-xs text-muted-foreground hidden sm:block">Nama · Estimasi Biaya · Durasi (hari)</div>
 )}
 <button type="button" onClick={addStage}
 className="w-full flex items-center justify-center gap-2 py-2 text-sm border border-dashed border-primary/30 text-primary rounded-xl hover:bg-primary/5 transition-colors">
 <Plus size={16} /> Tambah Tahap
 </button>
 {totalEstimasi > 0 && (
 <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-600">
 Minimum DP ({dpPersen.bubut}%): <span className="font-bold">{formatRp(Math.ceil((totalEstimasi * dpPersen.bubut) / 100))}</span>
 </div>
 )}
 </div>

 {!materialFromCustomer && <SparepartPicker
 label="Kebutuhan Material / Sparepart (Opsional)"
 sparepartList={sparepartList}
 sparepartSearch={sparepartSearch}
 setSparepartSearch={setSparepartSearch}
 loadingSparepart={loadingSparepart}
 selectedSparepartItems={selectedSparepartItems}
 addSparepart={addSparepart}
 removeSparepart={removeSparepart}
 updateSparepartQty={updateSparepartQty}
 totalSparepart={totalSparepart}
 formatRp={formatRp}
 />}
 </div>
 )}
 </section>

 {/* ── Section 3: Penugasan & Prioritas ── */}
 <section className={`sm:block ${currentStep === 3 ? 'block animate-in fade-in slide-in-from-right-4' : 'hidden'}`}>
 <h3 className="text-sm font-semibold mb-4 text-primary uppercase tracking-wider hidden sm:block">3. Penugasan & Prioritas</h3>
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

 {/* Footer Desktop */}
 <div className="p-4 border-t border-surface-border bg-surface-hover/30 hidden sm:flex justify-end gap-3">
 <Link href="/app/work-order" className="px-4 py-2 text-sm font-medium border border-surface-border rounded-xl hover:bg-surface transition-colors">
 Batal
 </Link>
 <button type="submit" disabled={submitting}
 className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-xl disabled:opacity-70 flex items-center gap-2">
 {submitting ? (
 <><Loader2 size={18} className="animate-spin" /> Memproses...</>
 ) : (
 <><Save size={18} /> {mode === "rutin" ? "Buat Work Order Servis" : mode === "modifikasi" ? "Buat Work Order Modifikasi" : "Buat Work Order Bubut"}</>
 )}
 </button>
 </div>
 </div>
 </form>

 {/* ── Sticky Total Summary (E5) ── */}
 {(() => {
 const stickyTotal = mode === "rutin" ? (totalJasa + totalSparepart) : (totalEstimasi + totalSparepart);
 const itemCount = mode === "rutin" ? (selectedJasaItems.length + selectedSparepartItems.length) : (stages.filter(s => s.nama).length + selectedSparepartItems.length);
 const isEmpty = stickyTotal <= 0 && itemCount === 0;
 
 return (
 <div className={`fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] lg:bottom-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur-md border-t border-surface-border shadow-2xl animate-in slide-in-from-bottom-4 duration-300 ${isEmpty ? 'sm:hidden' : ''}`}>
 <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
 <div className="flex-1 min-w-0">
 <p className="text-xs uppercase tracking-wider text-muted-foreground">{mode === "rutin" ? "Subtotal" : "Estimasi Total"}</p>
 <p className="text-lg font-bold text-primary truncate">{formatRp(stickyTotal)}</p>
 <p className="text-xs text-muted-foreground">
 {mode === "rutin"
 ? `${selectedJasaItems.length} jasa • ${selectedSparepartItems.length} sparepart`
 : `${stages.filter(s => s.nama).length} tahapan${selectedSparepartItems.length > 0 ? ` • ${selectedSparepartItems.length} sparepart` : ""}${estimasiSelesai ? ` • ETA: ${estimasiSelesai}` : ""}${stickyTotal > 0 && dpPctNow > 0 ? ` • DP min: ${formatRp(Math.ceil((stickyTotal * dpPctNow) / 100))}` : ""}`}
 </p>
 </div>
 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={() => {
 if (window.innerWidth < 640 && currentStep > 1) {
 setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3);
 window.scrollTo({ top: 0, behavior: "smooth" });
 }
 }}
 className={`shrink-0 p-3 sm:hidden ${currentStep > 1 ? 'flex' : 'hidden'} text-sm font-bold border border-surface-border rounded-xl hover:bg-surface-hover items-center justify-center`}
 >
 <ArrowLeft size={16} />
 </button>
 <button
 type="button"
 onClick={() => {
 if (window.innerWidth < 640 && currentStep < 3) {
 if (currentStep === 1 && !pelangganId) {
 toast.error("Pelanggan Belum Dipilih", "Silakan lengkapi data pelanggan terlebih dahulu.");
 return;
 }
 setCurrentStep((prev) => (prev + 1) as 1 | 2 | 3);
 window.scrollTo({ top: 0, behavior: "smooth" });
 return;
 }
 const f = document.querySelector("form") as HTMLFormElement | null; f?.requestSubmit(); 
 }}
 disabled={submitting}
 className="shrink-0 px-5 py-3 text-sm font-bold bg-primary text-primary-foreground rounded-xl disabled:opacity-70 flex items-center gap-2"
 >
 {submitting ? <><Loader2 size={16} className="animate-spin" /> <span className="hidden sm:inline">Memproses</span></> : (
 <>
 <span className="hidden sm:inline-flex items-center gap-2"><Save size={16} /> Buat Work Order</span>
 <span className="sm:hidden inline-flex items-center gap-2">
 {currentStep < 3 ? `Lanjut` : <><Save size={16} /> Buat</>}
 </span>
 </>
 )}
 </button>
 </div>
 </div>
 </div>
 );
 })()}



 {/* MODAL REVIEW PRE-SUBMIT */}
 {showReview && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
 <div className="bg-background border border-surface-border rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
 <div className="p-4 border-b border-surface-border flex justify-between items-center bg-surface-hover/30">
 <h3 className="font-bold flex items-center gap-2"><CheckCircle2 size={16} className="text-primary"/> Review Work Order</h3>
 <button onClick={() => setShowReview(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
 </div>
 <div className="p-5 space-y-4 overflow-y-auto text-sm">
 <div className="grid grid-cols-2 gap-3">
 <div>
 <p className="text-xs uppercase tracking-wider text-muted-foreground">Mode</p>
 <p className="font-bold capitalize">{mode === "modifikasi" ? "Modifikasi" : "Bubut Lepas"}</p>
 </div>
 <div>
 <p className="text-xs uppercase tracking-wider text-muted-foreground">Prioritas</p>
 <p className="font-bold capitalize">{prioritas}</p>
 </div>
 </div>

 <div>
 <p className="text-xs uppercase tracking-wider text-muted-foreground">Pelanggan</p>
 <p className="font-medium">{pelangganSearch || "—"}</p>
 </div>

 {mode === "modifikasi" && (
 <>
 <div>
 <p className="text-xs uppercase tracking-wider text-muted-foreground">Judul Proyek</p>
 <p className="font-medium">{judulProyek || "—"}</p>
 </div>
 {kendaraanSearch && (
 <div>
 <p className="text-xs uppercase tracking-wider text-muted-foreground">Kendaraan</p>
 <p className="font-medium">{kendaraanSearch}</p>
 </div>
 )}
 </>
 )}

 {mode === "bubut" && (
 <>
 {namaBubut && (
 <div>
 <p className="text-xs uppercase tracking-wider text-muted-foreground">Nama Walk-in</p>
 <p className="font-medium">{namaBubut}</p>
 </div>
 )}
 {materialFromCustomer && (
 <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[11px] text-blue-700 dark:text-blue-400">
 ✓ Material disediakan customer
 </div>
 )}
 </>
 )}

 <div className="border-t border-surface-border pt-3 space-y-1.5">
 <p className="text-xs uppercase tracking-wider text-muted-foreground">Tahapan ({stages.filter(s => s.nama.trim()).length})</p>
 {stages.filter(s => s.nama.trim()).map((s, i) => (
 <div key={i} className="flex justify-between text-xs">
 <span className="truncate flex-1">{i + 1}. {s.nama}</span>
 <span className="text-muted-foreground ml-2">{formatRp(Number(s.estimasiBiaya))} · {s.durasiHari}h</span>
 </div>
 ))}
 {stages.filter(s => s.nama.trim()).length === 0 && <p className="text-xs text-muted-foreground italic">Tidak ada tahapan</p>}
 </div>

 {selectedSparepartItems.length > 0 && !materialFromCustomer && (
 <div className="border-t border-surface-border pt-3 space-y-1.5">
 <p className="text-xs uppercase tracking-wider text-muted-foreground">Sparepart/Material ({selectedSparepartItems.length})</p>
 {selectedSparepartItems.map(it => (
 <div key={it.sparepartId} className="flex justify-between text-xs">
 <span className="truncate flex-1">{it.nama}</span>
 <span className="text-muted-foreground ml-2">{it.qty}× {formatRp(it.harga)}</span>
 </div>
 ))}
 </div>
 )}

 {mode === "modifikasi" && referensiFiles.length > 0 && (
 <div className="border-t border-surface-border pt-3">
 <p className="text-xs uppercase tracking-wider text-muted-foreground">Gambar Referensi</p>
 <p className="text-xs">{referensiFiles.length} file akan diupload</p>
 </div>
 )}

 <div className="border-t border-surface-border pt-3 space-y-1">
 <div className="flex justify-between text-xs">
 <span className="text-muted-foreground">Subtotal Tahapan</span>
 <span className="font-medium">{formatRp(totalEstimasi)}</span>
 </div>
 <div className="flex justify-between text-xs">
 <span className="text-muted-foreground">Subtotal Sparepart</span>
 <span className="font-medium">{formatRp(totalSparepart)}</span>
 </div>
 <div className="flex justify-between text-base font-bold pt-1 border-t border-surface-border">
 <span>Total Estimasi</span>
 <span className="text-primary">{formatRp(totalEstimasi + totalSparepart)}</span>
 </div>
 {estimasiSelesai && (
 <div className="flex justify-between text-xs">
 <span className="text-muted-foreground">Estimasi Selesai</span>
 <span className="font-medium">{estimasiSelesai}</span>
 </div>
 )}
 {dpPctNow > 0 && (
 <div className="flex justify-between text-xs pt-1">
 <span className="text-amber-600">Min. DP ({dpPctNow}%)</span>
 <span className="font-bold text-amber-600">{formatRp(Math.ceil(((totalEstimasi + totalSparepart) * dpPctNow) / 100))}</span>
 </div>
 )}
 </div>
 </div>
 <div className="p-4 border-t border-surface-border bg-surface-hover/30 flex gap-2">
 <button type="button" onClick={() => setShowReview(false)}
 className="flex-1 px-4 py-2 text-sm font-medium border border-surface-border rounded-xl hover:bg-surface transition-colors">
 Edit Lagi
 </button>
 <button type="button" onClick={() => doSubmit()} disabled={submitting}
 className="flex-1 px-4 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-xl disabled:opacity-70 flex items-center justify-center gap-2">
 {submitting ? <><Loader2 size={16} className="animate-spin" /> Memproses</> : <><Save size={16} /> Konfirmasi</>}
 </button>
 </div>
 </div>
 </div>
 )}



 </div>
 );
}
