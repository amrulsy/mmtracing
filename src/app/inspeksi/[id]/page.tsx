"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, Circle, AlertTriangle, Save, Lock, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { Skeleton } from "@/components/ui/loading-skeleton";

// ── Types ─────────────────────────────────────────────────────
interface KondisiItem {
  status: string;
  note: string;
}
interface InspeksiDetail {
  id: number;
  kendaraanId: number;
  status: string;
  kilometer: number;
  odometer?: number;
  catatan?: string;
  kondisiBody?: Record<string, KondisiItem>;
  kondisiMesin?: Record<string, KondisiItem>;
  kondisiKelistrikan?: Record<string, KondisiItem>;
  createdAt: string;
  kendaraan: {
    name: string;
    noPolisi: string;
    pelanggan?: { name: string };
  };
  spk?: { id: number; noSpk: string };
}

// Default checklist template (used for new inspeksi or if keys missing)
const DEFAULT_KONDISI_BODY: Record<string, KondisiItem> = {
  "Panel body depan":        { status: "baik", note: "" },
  "Panel body samping kiri": { status: "baik", note: "" },
  "Panel body samping kanan":{ status: "baik", note: "" },
  "Panel body belakang":     { status: "baik", note: "" },
  "Spion kiri & kanan":      { status: "baik", note: "" },
  "Lampu depan & sein":      { status: "baik", note: "" },
  "Lampu belakang & rem":    { status: "baik", note: "" },
};
const DEFAULT_KONDISI_MESIN: Record<string, KondisiItem> = {
  "Kondisi mesin (suara)": { status: "baik", note: "" },
  "Aki / Baterai":         { status: "baik", note: "" },
  "Kabel-kabel":           { status: "baik", note: "" },
  "CDI / ECU":             { status: "baik", note: "" },
  "Ban depan":             { status: "baik", note: "" },
  "Ban belakang":          { status: "baik", note: "" },
  "Shock depan":           { status: "baik", note: "" },
  "Shock belakang":        { status: "baik", note: "" },
};
const DEFAULT_KONDISI_KELISTRIKAN: Record<string, KondisiItem> = {
  "Kampas rem depan":           { status: "baik", note: "" },
  "Kampas rem belakang":        { status: "baik", note: "" },
  "Rantai & gear set":          { status: "baik", note: "" },
  "STNK / dokumen":             { status: "baik", note: "" },
  "Kunci kontak":               { status: "baik", note: "" },
};

const KATEGORI_LABELS: Record<string, string> = {
  kondisiBody: "Eksterior Body",
  kondisiMesin: "Mesin & Suspensi",
  kondisiKelistrikan: "Rem & Kelistrikan",
};

const STATUS_OPTIONS = ["baik", "perhatian", "rusak", "tidak"];

// ── Component ─────────────────────────────────────────────────
export default function InspeksiDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [inspeksi, setInspeksi] = useState<InspeksiDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Editable checklist state
  const [kondisiBody, setKondisiBody] = useState<Record<string, KondisiItem>>(DEFAULT_KONDISI_BODY);
  const [kondisiMesin, setKondisiMesin] = useState<Record<string, KondisiItem>>(DEFAULT_KONDISI_MESIN);
  const [kondisiKelistrikan, setKondisiKelistrikan] = useState<Record<string, KondisiItem>>(DEFAULT_KONDISI_KELISTRIKAN);
  const [catatan, setCatatan] = useState("");

  useEffect(() => {
    api.get<InspeksiDetail>(`/inspeksi/${id}`)
      .then(res => {
        const data = res.data;
        setInspeksi(data);
        setKondisiBody(data.kondisiBody && Object.keys(data.kondisiBody).length > 0 ? data.kondisiBody : DEFAULT_KONDISI_BODY);
        setKondisiMesin(data.kondisiMesin && Object.keys(data.kondisiMesin).length > 0 ? data.kondisiMesin : DEFAULT_KONDISI_MESIN);
        setKondisiKelistrikan(data.kondisiKelistrikan && Object.keys(data.kondisiKelistrikan).length > 0 ? data.kondisiKelistrikan : DEFAULT_KONDISI_KELISTRIKAN);
        setCatatan(data.catatan || "");
      })
      .catch(err => setError(err instanceof Error ? err.message : "Gagal memuat inspeksi"))
      .finally(() => setLoading(false));
  }, [id]);

  const updateItem = (
    setter: React.Dispatch<React.SetStateAction<Record<string, KondisiItem>>>,
    key: string,
    field: "status" | "note",
    value: string
  ) => {
    setter(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const countStatus = (map: Record<string, KondisiItem>, target: string) =>
    Object.values(map).filter(v => v.status === target).length;

  const totalBaik = countStatus(kondisiBody, "baik") + countStatus(kondisiMesin, "baik") + countStatus(kondisiKelistrikan, "baik");
  const totalPerhatian = countStatus(kondisiBody, "perhatian") + countStatus(kondisiMesin, "perhatian") + countStatus(kondisiKelistrikan, "perhatian");
  const totalRusak = countStatus(kondisiBody, "rusak") + countStatus(kondisiMesin, "rusak") + countStatus(kondisiKelistrikan, "rusak");
  const totalNA = countStatus(kondisiBody, "tidak") + countStatus(kondisiMesin, "tidak") + countStatus(kondisiKelistrikan, "tidak");

  const isLocked = inspeksi?.status === "locked";
  const canEdit = !isLocked;

  const handleSave = async (lock = false) => {
    setSaving(true);
    try {
      await api.patch<InspeksiDetail>(`/inspeksi/${id}`, {
        kondisiBody,
        kondisiMesin,
        kondisiKelistrikan,
        catatan: catatan || undefined,
        ...(lock ? { status: "locked" } : {}),
      });
      toast.success(lock ? "Inspeksi Dikunci" : "Draft Tersimpan", lock ? "Inspeksi telah dikunci dan tidak dapat diubah lagi." : "Data inspeksi berhasil disimpan sebagai draft.");
      if (lock) router.push("/inspeksi");
      else {
        // Refresh
        const fresh = await api.get<InspeksiDetail>(`/inspeksi/${id}`);
        setInspeksi(fresh.data);
      }
    } catch (err: unknown) {
      toast.error("Gagal Menyimpan", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  const statusIcon = (s: string) => {
    switch (s) {
      case "baik":      return <CheckCircle size={15} className="text-emerald-500 shrink-0" />;
      case "perhatian": return <AlertTriangle size={15} className="text-amber-500 shrink-0" />;
      case "rusak":     return <AlertTriangle size={15} className="text-red-500 shrink-0" />;
      default:          return <Circle size={15} className="text-muted-foreground shrink-0" />;
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "baik":      return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
      case "perhatian": return "bg-amber-500/10 text-amber-700 border-amber-500/20";
      case "rusak":     return "bg-red-500/10 text-red-600 border-red-500/20";
      default:          return "bg-surface-hover text-muted-foreground border-surface-border";
    }
  };

  // ── Error / Loading ────────────────────────────────────────
  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <AlertTriangle size={32} className="text-red-500" />
      <p className="text-muted-foreground text-sm">{error}</p>
      <Link href="/inspeksi" className="text-primary text-sm font-medium hover:underline">← Kembali ke Inspeksi</Link>
    </div>
  );

  if (loading || !inspeksi) return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl mx-auto">
      <div className="flex items-center gap-4"><Skeleton className="w-10 h-10 rounded-xl" /><div className="space-y-2"><Skeleton className="h-7 w-56" /><Skeleton className="h-4 w-40" /></div></div>
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );

  // ── Render ─────────────────────────────────────────────────
  const renderKategori = (
    label: string,
    map: Record<string, KondisiItem>,
    setter: React.Dispatch<React.SetStateAction<Record<string, KondisiItem>>>
  ) => (
    <div className="glass-panel overflow-hidden">
      <div className="px-5 py-3 border-b border-surface-border bg-surface-hover/30 flex items-center justify-between">
        <h3 className="text-sm font-bold">{label}</h3>
        <span className="text-[10px] text-muted-foreground">{Object.keys(map).length} item</span>
      </div>
      <div className="divide-y divide-surface-border">
        {Object.entries(map).map(([key, val]) => (
          <div key={key} className={`flex items-center gap-3 px-4 py-3 ${val.status === "rusak" ? "bg-red-500/[0.03]" : val.status === "perhatian" ? "bg-amber-500/[0.03]" : ""}`}>
            {statusIcon(val.status)}
            <span className="flex-1 text-sm font-medium min-w-0 truncate">{key}</span>
            <select
              value={val.status}
              disabled={!canEdit}
              onChange={e => updateItem(setter, key, "status", e.target.value)}
              className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border appearance-none cursor-pointer focus:outline-none disabled:opacity-60 ${statusColor(val.status)}`}
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s === "baik" ? "✅ Baik" : s === "perhatian" ? "⚠️ Perhatian" : s === "rusak" ? "❌ Rusak" : "⚪ N/A"}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Catatan..."
              value={val.note}
              disabled={!canEdit}
              onChange={e => updateItem(setter, key, "note", e.target.value)}
              className="w-44 text-xs bg-surface border border-surface-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-60"
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link href="/inspeksi" className="p-2 hover:bg-surface-hover rounded-xl border border-surface-border glass transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Inspeksi Kendaraan</h1>
            <p className="text-muted-foreground text-sm">
              {inspeksi.kendaraan?.name} • {inspeksi.kendaraan?.noPolisi} • {inspeksi.kendaraan?.pelanggan?.name || "—"}
            </p>
          </div>
        </div>
        <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${isLocked ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"}`}>
          {isLocked ? "Terkunci" : "Draft"}
        </span>
      </div>

      {/* Summary Bar */}
      <div className="glass-panel p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-6">
          {[
            { label: "Baik",     count: totalBaik,     color: "text-emerald-500" },
            { label: "Perhatian",count: totalPerhatian, color: "text-amber-500" },
            { label: "Rusak",    count: totalRusak,     color: "text-red-500" },
            { label: "N/A",      count: totalNA,        color: "text-muted-foreground" },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.count}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Dibuat: <span className="font-semibold text-foreground">{new Date(inspeksi.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</span>
        </p>
      </div>

      {isLocked && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-sm">
          <Lock size={16} className="shrink-0" />
          <span>Inspeksi ini sudah <strong>terkunci</strong> dan tidak dapat diubah lagi. Hubungi Admin jika ada koreksi.</span>
        </div>
      )}

      {/* Checklist Groups */}
      {renderKategori(KATEGORI_LABELS.kondisiBody, kondisiBody, setKondisiBody)}
      {renderKategori(KATEGORI_LABELS.kondisiMesin, kondisiMesin, setKondisiMesin)}
      {renderKategori(KATEGORI_LABELS.kondisiKelistrikan, kondisiKelistrikan, setKondisiKelistrikan)}

      {/* Catatan */}
      <div className="glass-panel p-5">
        <label className="text-xs font-medium text-muted-foreground">Catatan Tambahan</label>
        <textarea
          value={catatan}
          onChange={e => setCatatan(e.target.value)}
          disabled={!canEdit}
          placeholder="Catatan umum tentang kondisi kendaraan..."
          className="w-full mt-1.5 bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[70px] disabled:opacity-60"
        />
      </div>

      {/* Action Buttons */}
      {canEdit && (
        <div className="flex justify-end gap-3">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="px-4 py-2.5 text-sm font-medium border border-surface-border rounded-xl hover:bg-surface transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Simpan Draft
          </button>
          <button
            onClick={() => toast.confirm("Kunci inspeksi ini? Data tidak dapat diubah setelah dikunci.", () => handleSave(true))}
            disabled={saving}
            className="px-6 py-2.5 text-sm font-bold bg-primary text-primary-foreground rounded-xl shadow-glossy-primary hover:shadow-glossy-primary-dark transition-all flex items-center gap-2 btn-glossy disabled:opacity-70"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
            Konfirmasi & Kunci Inspeksi
          </button>
        </div>
      )}
    </div>
  );
}
