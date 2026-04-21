"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Printer, CheckCircle, Clock, AlertTriangle,
  FileText, Loader2, Shield, Layers, X, Plus, Trash2,
  Package, Wrench, Search, PencilLine, ChevronDown, CreditCard,
  MessageCircle, CalendarClock
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { useRole } from "@/hooks/useRole";
import type { Spk, Sparepart, Jasa, SpkStage } from "@/lib/types";
import { Skeleton } from "@/components/ui/loading-skeleton";

// ── Komponen Panel Tambah Item ────────────────────────────────
function AddItemPanel({
  spkId,
  canEdit,
  onUpdated,
}: {
  spkId: string;
  canEdit: boolean;
  onUpdated: (spk: Spk) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"sparepart" | "jasa" | "manual">("sparepart");
  const [search, setSearch] = useState("");
  const [sparepartList, setSparepartList] = useState<Sparepart[]>([]);
  const [jasaList, setJasaList] = useState<Jasa[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Manual form
  const [manualNama, setManualNama] = useState("");
  const [manualHarga, setManualHarga] = useState("");
  const [manualQty, setManualQty] = useState("1");

  const fetchOptions = useCallback(async () => {
    setLoadingList(true);
    try {
      if (tab === "sparepart") {
        const res = await api.getPaginated<Sparepart>("/sparepart", { limit: 50, search });
        setSparepartList(res.data);
      } else if (tab === "jasa") {
        const res = await api.getPaginated<Jasa>("/jasa", { limit: 50, search });
        setJasaList(res.data);
      }
    } catch { /* handled by api client */ }
    finally { setLoadingList(false); }
  }, [tab, search]);

  useEffect(() => {
    if (open && tab !== "manual") {
      const t = setTimeout(fetchOptions, 300);
      return () => clearTimeout(t);
    }
  }, [open, tab, search, fetchOptions]);

  const handleAddSparepart = async (sp: Sparepart, qty = 1) => {
    setSubmitting(true); setError("");
    try {
      const res = await api.post<Spk>(`/spk/${spkId}/items`, {
        type: "sparepart",
        sparepartId: sp.id,
        nama: sp.name,
        qty,
        hargaSatuan: Number(sp.hargaJual),
      });
      onUpdated(res.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal menambah item");
    } finally { setSubmitting(false); }
  };

  const handleAddJasa = async (j: Jasa, qty = 1) => {
    setSubmitting(true); setError("");
    try {
      const res = await api.post<Spk>(`/spk/${spkId}/items`, {
        type: "jasa",
        jasaId: j.id,
        nama: j.name,
        qty,
        hargaSatuan: Number(j.harga),
      });
      onUpdated(res.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal menambah item");
    } finally { setSubmitting(false); }
  };

  const handleAddManual = async () => {
    if (!manualNama.trim() || !manualHarga) { setError("Nama dan harga wajib diisi"); return; }
    setSubmitting(true); setError("");
    try {
      const res = await api.post<Spk>(`/spk/${spkId}/items`, {
        type: "jasa",
        nama: manualNama,
        qty: Number(manualQty) || 1,
        hargaSatuan: Number(manualHarga),
      });
      onUpdated(res.data);
      setManualNama(""); setManualHarga(""); setManualQty("1");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal menambah item");
    } finally { setSubmitting(false); }
  };

  const formatRp = (n: number) => `Rp ${Number(n).toLocaleString("id-ID")}`;

  if (!canEdit) return null;

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-center gap-2 py-2.5 text-sm border border-dashed border-primary/40 text-primary rounded-xl hover:bg-primary/5 transition-colors font-medium"
      >
        <Plus size={16} />
        {open ? "Tutup Panel Tambah Item" : "Tambah Sparepart / Jasa"}
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-3 border border-surface-border rounded-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
          {/* Tab */}
          <div className="flex border-b border-surface-border bg-surface-hover/30">
            {(["sparepart", "jasa", "manual"] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setSearch(""); setError(""); }}
                className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${tab === t ? "bg-background text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t === "sparepart" ? <><Package size={13} /> Sparepart</> : t === "jasa" ? <><Wrench size={13} /> Jasa</> : <><PencilLine size={13} /> Manual</>}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-3">
            {error && (
              <div className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-xs">
                <AlertTriangle size={13} /> {error}
              </div>
            )}

            {(tab === "sparepart" || tab === "jasa") && (
              <>
                {/* Search */}
                <div className="flex items-center gap-2 bg-surface border border-surface-border rounded-xl px-3 py-2 focus-within:ring-1 focus-within:ring-primary">
                  <Search size={14} className="text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={`Cari ${tab}...`}
                    className="bg-transparent border-none focus:outline-none text-sm w-full"
                  />
                  {loadingList && <Loader2 size={13} className="animate-spin text-muted-foreground" />}
                </div>

                {/* List */}
                <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                  {tab === "sparepart" && sparepartList.map(sp => (
                    <div key={sp.id} className="flex items-center justify-between p-2.5 rounded-xl border border-surface-border hover:bg-surface-hover/40 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{sp.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Stok: <span className={sp.stok < sp.stokMinimum ? "text-red-500 font-bold" : "text-emerald-600 font-medium"}>{sp.stok} {sp.satuan}</span>
                          {" · "}{sp.merk}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        <span className="text-xs font-bold text-primary">{formatRp(sp.hargaJual)}</span>
                        <button
                          onClick={() => handleAddSparepart(sp)}
                          disabled={submitting || sp.stok === 0}
                          className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40"
                        >
                          {submitting ? <Loader2 size={12} className="animate-spin" /> : <Plus size={14} />}
                        </button>
                      </div>
                    </div>
                  ))}
                  {tab === "jasa" && jasaList.map(j => (
                    <div key={j.id} className="flex items-center justify-between p-2.5 rounded-xl border border-surface-border hover:bg-surface-hover/40 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{j.name}</p>
                        <p className="text-[10px] text-muted-foreground">{j.kategori} · Garansi: {j.garansiHari ?? 30} hari</p>
                      </div>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        <span className="text-xs font-bold text-primary">{formatRp(j.harga)}</span>
                        <button
                          onClick={() => handleAddJasa(j)}
                          disabled={submitting}
                          className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40"
                        >
                          {submitting ? <Loader2 size={12} className="animate-spin" /> : <Plus size={14} />}
                        </button>
                      </div>
                    </div>
                  ))}
                  {!loadingList && (tab === "sparepart" ? sparepartList : jasaList).length === 0 && (
                    <p className="text-xs text-center text-muted-foreground py-4">
                      {search ? `Tidak ada hasil untuk "${search}"` : `Ketik untuk mencari ${tab}`}
                    </p>
                  )}
                </div>
              </>
            )}

            {tab === "manual" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Nama Item / Keterangan</label>
                  <input
                    type="text"
                    value={manualNama}
                    onChange={e => setManualNama(e.target.value)}
                    placeholder="Contoh: Jasa las knalpot..."
                    className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Harga Satuan</label>
                    <input
                      type="number"
                      value={manualHarga}
                      onChange={e => setManualHarga(e.target.value)}
                      placeholder="0"
                      min={0}
                      className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Qty</label>
                    <input
                      type="number"
                      value={manualQty}
                      onChange={e => setManualQty(e.target.value)}
                      min={1}
                      className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
                {Number(manualHarga) > 0 && Number(manualQty) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Subtotal: <span className="font-bold text-primary">{formatRp(Number(manualHarga) * Number(manualQty))}</span>
                  </p>
                )}
                <button
                  onClick={handleAddManual}
                  disabled={submitting || !manualNama.trim() || !manualHarga}
                  className="w-full py-2.5 text-sm bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Tambah Item Manual
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Komponen Row Item ─────────────────────────────────────────
function ItemRow({
  item,
  spkId,
  canEdit,
  onUpdated,
}: {
  item: { id: number; nama: string; type: string; qty: number; hargaSatuan: number; subtotal: number; status?: 'pending' | 'done' };
  spkId: string;
  canEdit: boolean;
  onUpdated: (spk: Spk) => void;
}) {
  const [editingQty, setEditingQty] = useState(false);
  const [qty, setQty] = useState(item.qty);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const formatRp = (n: number) => `Rp ${Number(n).toLocaleString("id-ID")}`;

  useEffect(() => { if (editingQty) inputRef.current?.focus(); }, [editingQty]);
  useEffect(() => { setQty(item.qty); }, [item.qty]); // Fix BUG-03: sinkron state dari props

  const handleUpdateQty = async () => {
    setEditingQty(false);
    if (qty === item.qty) return;
    setLoading(true);
    try {
      const res = await api.patch<Spk>(`/spk/${spkId}/items/${item.id}`, { qty });
      onUpdated(res.data);
    } catch (e) {
      toast.error("Gagal update kuantitas", e instanceof Error ? e.message : "");
      setQty(item.qty); // rollback
    }
    setLoading(false);
  };

  const handleRemove = async () => {
    toast.confirm(
      `Hapus "${item.nama}" dari SPK ini?\nStok ${item.type === "sparepart" ? "akan dikembalikan." : "tidak berpengaruh."}`,
      async () => {
        setLoading(true);
        try {
          const res = await api.delete<Spk>(`/spk/${spkId}/items/${item.id}`);
          onUpdated(res.data);
          toast.success("Item Dihapus");
        } catch (e) {
          toast.error("Gagal Hapus", e instanceof Error ? e.message : "");
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const handleToggleStatus = async () => {
    if (!canEdit) return;
    setLoading(true);
    const newStatus = item.status === "done" ? "pending" : "done";
    try {
      const res = await api.patch<Spk>(`/spk/${spkId}/items/${item.id}`, { status: newStatus });
      onUpdated(res.data);
    } catch (e) {
      toast.error("Gagal Update", e instanceof Error ? e.message : "Gagal update status");
    }
    setLoading(false);
  };

  return (
    <div className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${loading ? "opacity-50" : "hover:bg-surface-hover/30"} ${item.status === "done" ? "bg-emerald-500/5 border-emerald-500/20" : "border-surface-border"}`}>
      <div className="flex flex-1 min-w-0 items-center gap-3">
        <button
          onClick={handleToggleStatus}
          disabled={!canEdit || loading}
          className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${item.status === 'done' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-surface-border text-transparent hover:border-emerald-500 disabled:opacity-50'}`}
        >
          <CheckCircle size={14} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${item.type === "sparepart" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-purple-500/10 text-purple-500 border-purple-500/20"}`}>
              {item.type === "sparepart" ? "Part" : "Jasa"}
            </span>
            <p className={`text-sm font-medium truncate ${item.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>{item.nama}</p>
          </div>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[10px] text-muted-foreground">{formatRp(item.hargaSatuan)}/pcs</p>
          {canEdit ? (
            editingQty ? (
              <input
                ref={inputRef}
                type="number"
                value={qty}
                min={1}
                onChange={e => setQty(Math.max(1, Number(e.target.value)))}
                onBlur={handleUpdateQty}
                onKeyDown={e => e.key === "Enter" && handleUpdateQty()}
                className="w-14 text-xs bg-surface border border-primary rounded px-1.5 py-0.5 focus:outline-none"
              />
            ) : (
              <button
                onClick={() => setEditingQty(true)}
                className="text-[10px] text-primary font-medium hover:underline flex items-center gap-0.5"
              >
                ×{item.qty} <PencilLine size={9} />
              </button>
            )
          ) : (
            <p className="text-[10px] text-muted-foreground">×{item.qty}</p>
          )}
        </div>
      </div>
      </div>
      <div className="flex items-center gap-2 ml-2 shrink-0">
        <span className="text-sm font-bold font-mono">{formatRp(Number(item.subtotal))}</span>
        {canEdit && (
          <button
            onClick={handleRemove}
            disabled={loading}
            className="w-7 h-7 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors flex items-center justify-center disabled:opacity-40"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Komponen Row Stage ────────────────────────────────────────
function StageRow({
  stage,
  spkId,
  canEdit,
  onUpdated,
}: {
  stage: SpkStage;
  spkId: string;
  canEdit: boolean;
  onUpdated: (spk: Spk) => void;
}) {
  const [loading, setLoading] = useState(false);
  const formatRp = (n: number) => `Rp ${Number(n).toLocaleString("id-ID")}`;

  const handleToggleStatus = async () => {
    if (!canEdit) return;
    setLoading(true);
    const newStatus = stage.status === "done" ? "pending" : "done";
    try {
      const res = await api.patch<Spk>(`/spk/${spkId}/stages/${stage.id}`, { status: newStatus });
      onUpdated(res.data);
    } catch (e) {
      toast.error("Gagal Update Status", e instanceof Error ? e.message : "Gagal update status tahapan");
    }
    setLoading(false);
  };

  return (
    <div className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${loading ? "opacity-50" : "hover:bg-surface-hover/30"} ${stage.status === "done" ? "bg-emerald-500/5 border-emerald-500/20" : "border-surface-border"}`}>
      <div className="flex items-center gap-3">
        <button
          onClick={handleToggleStatus}
          disabled={!canEdit || loading}
          className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${stage.status === 'done' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-surface-border text-transparent hover:border-emerald-500 disabled:opacity-50'}`}
        >
          <CheckCircle size={14} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">{stage.urutan}</div>
          <div>
            <p className={`text-sm font-medium ${stage.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>{stage.nama}</p>
            <p className="text-[10px] text-muted-foreground">{stage.durasiHari} hari</p>
          </div>
        </div>
      </div>
      <div className="text-right">
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${stage.status === "done" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : stage.status === "in_progress" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-surface-hover text-muted-foreground border-surface-border"}`}>
          {stage.status.replace("_", " ")}
        </span>
        <p className="text-sm font-bold mt-1">{formatRp(stage.estimasiBiaya)}</p>
      </div>
    </div>
  );
}

// ── Komponen Tambah Tahapan ───────────────────────────────────
function AddStagePanel({
  spkId,
  canEdit,
  onUpdated,
}: {
  spkId: string;
  canEdit: boolean;
  onUpdated: (spk: Spk) => void;
}) {
  const [open, setOpen] = useState(false);
  const [nama, setNama] = useState("");
  const [estimasiBiaya, setEstimasiBiaya] = useState("");
  const [durasiHari, setDurasiHari] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const formatRp = (n: number) => `Rp ${Number(n).toLocaleString("id-ID")}`;

  const handleSubmit = async () => {
    if (!nama.trim()) { setError("Nama tahapan wajib diisi"); return; }
    if (estimasiBiaya === "" || Number(estimasiBiaya) < 0) { setError("Estimasi biaya tidak valid (minimal 0)"); return; }
    setSubmitting(true); setError("");
    try {
      const res = await api.post<Spk>(`/spk/${spkId}/stages`, {
        nama: nama.trim(),
        estimasiBiaya: Number(estimasiBiaya),
        durasiHari: Number(durasiHari) || 1,
      });
      onUpdated(res.data);
      setNama(""); setEstimasiBiaya(""); setDurasiHari("1");
      setOpen(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal menambah tahapan");
    } finally { setSubmitting(false); }
  };

  if (!canEdit) return null;

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-center gap-2 py-2.5 text-sm border border-dashed border-primary/40 text-primary rounded-xl hover:bg-primary/5 transition-colors font-medium"
      >
        <Plus size={16} />
        {open ? "Tutup Panel Tambah Tahapan" : "Tambah Tahapan"}
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-3 border border-surface-border rounded-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
          <div className="p-4 space-y-3">
            {error && (
              <div className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-xs">
                <AlertTriangle size={13} /> {error}
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Nama Tahapan</label>
              <input
                type="text"
                value={nama}
                onChange={e => setNama(e.target.value)}
                placeholder="Contoh: Pengecatan, Pemasangan..."
                className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Estimasi Biaya</label>
                <input
                  type="number"
                  value={estimasiBiaya}
                  onChange={e => setEstimasiBiaya(e.target.value)}
                  placeholder="0"
                  min={0}
                  className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Durasi (hari)</label>
                <input
                  type="number"
                  value={durasiHari}
                  onChange={e => setDurasiHari(e.target.value)}
                  placeholder="1"
                  min={1}
                  className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            {Number(estimasiBiaya) > 0 && (
              <p className="text-xs text-muted-foreground">
                Estimasi: <span className="font-bold text-primary">{formatRp(Number(estimasiBiaya))}</span>
              </p>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitting || !nama.trim()}
              className="w-full py-2.5 text-sm bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Tambah Tahapan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Halaman Utama ─────────────────────────────────────────────
export default function SpkDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [spk, setSpk] = useState<Spk | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showKendalaModal, setShowKendalaModal] = useState(false);
  const [kendalaNote, setKendalaNote] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const { canManageSpk, canDestructive } = useRole();

  useEffect(() => {
    api.get<Spk>(`/spk/${id}`)
      .then(res => {
        setSpk(res.data);
        setLastUpdatedAt(res.data.updatedAt);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const formatRp = (n: number) => `Rp ${Number(n).toLocaleString("id-ID")}`;
  const formatDate = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—";

  const canEditItems = spk ? !["selesai", "dibatalkan", "kendala"].includes(spk.status) : false; // Fix BUG-05: blokir saat kendala

  async function handleStatusUpdate(newStatus: string, catatan?: string) {
    if (!spk) return;
    setUpdatingStatus(true);
    try {
      // Concurrent edit protection: check if data is stale
      if (lastUpdatedAt) {
        const freshRes = await api.get<Spk>(`/spk/${id}`);
        if (freshRes.data.updatedAt !== lastUpdatedAt) {
          toast.warning(
            "Data Berubah",
            "SPK ini telah diperbarui oleh pengguna lain. Halaman akan di-refresh."
          );
          setSpk(freshRes.data);
          setLastUpdatedAt(freshRes.data.updatedAt);
          setUpdatingStatus(false);
          return;
        }
      }
      const res = await api.put<Spk>(`/spk/${id}/status`, { status: newStatus, catatan });
      setSpk(res.data);
      setLastUpdatedAt(res.data.updatedAt);
      setShowKendalaModal(false);
    } catch (err: unknown) {
      toast.error("Gagal Update Status", err instanceof Error ? err.message : "");
    } finally { setUpdatingStatus(false); }
  }

// handleProgressUpdate dihapus karena dihitung otomatis dari backend (Fix BUG-09)

  const statusSteps = ["antri", "dikerjakan", "selesai"];
  const currentStepIndex = spk ? statusSteps.indexOf(spk.status) : -1;

  const statusStyle = (s: string) => {
    switch (s) {
      case "selesai": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "dikerjakan": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "antri": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "kendala": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "dibatalkan": return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
      default: return "bg-surface-hover text-muted-foreground";
    }
  };

  const prioritasStyle = (p: string) => {
    if (p === "urgent") return "bg-red-500/10 text-red-500 border-red-500/20";
    if (p === "tinggi") return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    if (p === "rendah") return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
    return "bg-sky-500/10 text-sky-600 border-sky-500/20";
  };

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 animate-in fade-in duration-500">
      <AlertTriangle size={32} className="text-red-500" />
      <p className="text-muted-foreground text-sm">{error}</p>
      <Link href="/spk" className="text-primary text-sm font-medium hover:underline">← Kembali ke SPK</Link>
    </div>
  );

  if (loading || !spk) return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-4">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="space-y-2 flex-1"><Skeleton className="h-7 w-64" /><Skeleton className="h-4 w-40" /></div>
      </div>
      <Skeleton className="h-32 w-full" /><Skeleton className="h-48 w-full" />
    </div>
  );

  const nextStatus = (() => {
    switch (spk.status) {
      case "antri": return "dikerjakan";
      case "dikerjakan": return "selesai";
      case "selesai": return "dikerjakan"; // Tambahan fitu Undo / Rollback
      default: return null;
    }
  })();

  const totalItems = spk.items?.reduce((s, i) => s + Number(i.subtotal), 0) ?? 0;
  
  // Hard-Lock UI Check
  const isModifikasiDPKurang = (spk.mode === "modifikasi" || spk.mode === "bubut") && spk.status === "antri" && Number(spk.totalBayar) < Number(spk.minimumDp) && Number(spk.minimumDp) > 0;
  
  const handleNextStatusClick = () => {
    if (isModifikasiDPKurang && nextStatus === "dikerjakan") {
      toast.warning(
        "DP Kurang", 
        `Mohon lunasi DP/Uang Muka Modifikasi di Kasir minimal sebesar Rp ${Number(spk.minimumDp).toLocaleString('id-ID')} sebelum memulai pekerjaan.`
      );
      return;
    }
    if (spk.status === 'selesai') {
      toast.confirm(
        'Yakin ingin membatalkan/rollback SPK Selesai? Poin bonus dan entri Garansi akan dihapus kembali (Kecuali Invoice Lunas).',
        () => handleStatusUpdate(nextStatus!)
      );
      return;
    }
    handleStatusUpdate(nextStatus!);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/spk" className="p-2 hover:bg-surface-hover rounded-xl border border-surface-border glass transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 flex-wrap">
              {spk.noSpk}
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${statusStyle(spk.status)}`}>{spk.status}</span>
              {spk.prioritas !== "normal" && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${prioritasStyle(spk.prioritas)}`}>{spk.prioritas}</span>
              )}
            </h1>
            <p className="text-muted-foreground text-sm">Dibuat {formatDate(spk.createdAt)}</p>
          </div>
        </div>
        <div className="hidden sm:flex gap-2">
          <Link href={`/spk/${id}/cetak`} className="flex items-center gap-2 text-sm bg-surface border border-surface-border px-3 py-2 rounded-xl hover:bg-surface-hover font-medium transition-colors">
            <Printer size={16} /> Cetak
          </Link>
          {nextStatus && (
            <button
              onClick={handleNextStatusClick}
              disabled={updatingStatus || (isModifikasiDPKurang && nextStatus === "dikerjakan")}
              className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl font-medium btn-glossy disabled:opacity-70 ${spk.status === 'selesai' ? 'bg-amber-500 text-white shadow-glossy hover:opacity-90' : isModifikasiDPKurang ? 'bg-zinc-300 text-zinc-500 cursor-not-allowed' : 'bg-primary text-primary-foreground shadow-glossy-primary hover:shadow-glossy-primary-dark'}`}
            >
              {updatingStatus ? <><Loader2 size={16} className="animate-spin" /> Memproses...</> : <><CheckCircle size={16} /> {spk.status === 'selesai' ? 'Batalkan Selesai (Undo)' : nextStatus === "dikerjakan" ? (isModifikasiDPKurang ? "Menunggu DP" : "Mulai Kerjakan") : "Tandai Selesai"}</>}
            </button>
          )}
        </div>
      </div>

      {/* Floating Action untuk Mobile agar tidak repot scroll */}
      <div className="sm:hidden fixed bottom-0 left-0 w-full p-4 bg-background/90 backdrop-blur-md border-t border-surface-border z-20 flex gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom,16px)]">
        <Link href={`/spk/${id}/cetak`} className="flex-1 flex justify-center items-center gap-2 text-sm bg-surface border border-surface-border py-3 rounded-xl hover:bg-surface-hover font-medium">
          <Printer size={16} /> Cetak
        </Link>
        {nextStatus && (
          <button
            onClick={handleNextStatusClick}
            disabled={updatingStatus || (isModifikasiDPKurang && nextStatus === "dikerjakan")}
            className={`flex-[1.5] flex justify-center items-center gap-2 text-sm py-3 rounded-xl font-medium btn-glossy disabled:opacity-70 ${spk.status === 'selesai' ? 'bg-amber-500 text-white' : isModifikasiDPKurang ? 'bg-zinc-300 text-zinc-600' : 'bg-primary text-white'}`}
          >
            {updatingStatus ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle size={16} /> {spk.status === 'selesai' ? 'Undo Selesai' : nextStatus === "dikerjakan" ? (isModifikasiDPKurang ? "Menunggu DP" : "Kerjakan") : "Selesai"}</>}
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* LEFT */}
        <div className="lg:col-span-2 space-y-6">

          {/* Status Stepper + Progress */}
          <div className="glass-panel p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Status Pengerjaan</h3>
            <div className="flex items-center gap-0 overflow-x-auto pb-2 mb-4">
              {["Antri", "Dikerjakan", "Selesai"].map((step, i) => {
                const done = i < currentStepIndex;
                const active = i === currentStepIndex;
                return (
                  <div key={i} className="flex items-center">
                    <div className="flex flex-col items-center min-w-[80px]">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${done ? "bg-primary text-primary-foreground border-primary" : active ? "bg-primary/20 text-primary border-primary animate-pulse" : "bg-surface border-surface-border text-muted-foreground"}`}>
                        {done ? "✓" : i + 1}
                      </div>
                      <span className={`text-[10px] mt-1 ${active ? "font-bold text-primary" : "text-muted-foreground"}`}>{step}</span>
                    </div>
                    {i < 2 && <div className={`w-8 h-0.5 ${done ? "bg-primary" : "bg-surface-border"} mt-[-16px]`} />}
                  </div>
                );
              })}
              {spk.status === "kendala" && <div className="ml-4 flex items-center gap-1.5 text-red-500 text-sm"><AlertTriangle size={14} /> Kendala</div>}
              {spk.status === "dibatalkan" && <div className="ml-4 flex items-center gap-1.5 text-zinc-500 text-sm"><X size={14} /> Dibatalkan</div>}
            </div>

            {spk.status === "dikerjakan" && (
              <div className="pt-4 border-t border-surface-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progres Pengerjaan</span>
                  <span className="text-sm font-bold text-primary">{spk.progress ?? 0}%</span>
                </div>
                <div className="flex flex-col gap-2 mb-3">
                  <div className="h-3 bg-surface-border rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-primary rounded-full transition-all duration-500" style={{ width: `${spk.progress ?? 0}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">Progres dihitung otomatis berdasarkan item/tahapan yang telah diselesaikan.</p>
                </div>
              </div>
            )}
          </div>

          {/* Info SPK */}
          <div className="glass-panel p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Informasi Pekerjaan</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Pelanggan:</span> <span className="font-semibold">{spk.pelanggan?.name || "—"}</span></div>
              <div><span className="text-muted-foreground">Kendaraan:</span> <span className="font-semibold">{spk.kendaraan ? `${spk.kendaraan.name} (${spk.kendaraan.plat})` : "—"}</span></div>
              <div><span className="text-muted-foreground">Mekanik:</span> <span className="font-semibold">{spk.mekanik?.name || "Belum ditugaskan"}</span></div>
              <div><span className="text-muted-foreground">Tipe:</span> <span className="font-semibold capitalize">{spk.mode}</span></div>
              {spk.startedAt && <div><span className="text-muted-foreground">Mulai:</span> <span className="font-semibold">{formatDate(spk.startedAt)}</span></div>}
              {spk.completedAt && <div><span className="text-muted-foreground">Selesai:</span> <span className="font-semibold">{formatDate(spk.completedAt)}</span></div>}
              {spk.estimasiSelesai && !spk.completedAt && (() => {
                const eta = new Date(spk.estimasiSelesai);
                const now = new Date();
                const daysLeft = Math.ceil((eta.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const isOverdue = daysLeft < 0;
                return (
                  <div className="md:col-span-2">
                    <span className="text-muted-foreground">Estimasi Selesai:</span>{" "}
                    <span className={`font-semibold inline-flex items-center gap-1 ${isOverdue ? "text-red-500" : daysLeft <= 2 ? "text-amber-600" : "text-emerald-600"}`}>
                      <CalendarClock size={13} />
                      {formatDate(spk.estimasiSelesai)}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ml-1 ${isOverdue ? "bg-red-500/10 border-red-500/30" : daysLeft <= 2 ? "bg-amber-500/10 border-amber-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}>
                        {isOverdue ? `Terlambat ${Math.abs(daysLeft)} hari` : daysLeft === 0 ? "Hari ini" : `${daysLeft} hari lagi`}
                      </span>
                    </span>
                  </div>
                );
              })()}
            </div>
            {spk.judulProyek && <div className="mt-4 pt-4 border-t border-surface-border"><p className="text-xs text-muted-foreground mb-1">Judul Proyek:</p><p className="text-sm font-semibold">{spk.judulProyek}</p></div>}
            {spk.keluhan && <div className="mt-4 pt-4 border-t border-surface-border"><p className="text-xs text-muted-foreground mb-1">Keluhan:</p><p className="text-sm">{spk.keluhan}</p></div>}
            {spk.catatan && <div className="mt-4 pt-4 border-t border-surface-border"><p className="text-xs text-muted-foreground mb-1">Catatan:</p><p className="text-sm text-amber-600">{spk.catatan}</p></div>}
          </div>

          {/* ── ITEM PEKERJAAN (inti fitur baru) ── */}
          <div className="glass-panel p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <FileText size={14} /> Item Pekerjaan
                {spk.items && spk.items.length > 0 && (
                  <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">{spk.items.length} item</span>
                )}
              </h3>
              {canEditItems && (
                <span className="text-[10px] text-muted-foreground border border-dashed border-surface-border px-2 py-0.5 rounded-full">
                  Bisa diedit
                </span>
              )}
            </div>

            {/* Daftar item */}
            {spk.items && spk.items.length > 0 ? (
              <div className="space-y-2 mb-3">
                {spk.items.map(item => (
                  <ItemRow
                    key={item.id}
                    item={{
                      id: item.id,
                      nama: item.nama,
                      type: item.type,
                      qty: item.qty,
                      hargaSatuan: Number(item.hargaSatuan),
                      subtotal: Number(item.subtotal),
                      status: item.status,
                    }}
                    spkId={id}
                    canEdit={canEditItems}
                    onUpdated={setSpk}
                  />
                ))}
                {/* Subtotal items */}
                <div className="flex justify-between pt-2 border-t border-surface-border text-sm font-semibold">
                  <span className="text-muted-foreground">Subtotal ({spk.items.length} item)</span>
                  <span className="font-bold text-primary">{formatRp(totalItems)}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <FileText size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Belum ada item pekerjaan</p>
                {canEditItems && <p className="text-xs mt-1">Tambahkan sparepart atau jasa di bawah</p>}
              </div>
            )}

            {/* Panel tambah item */}
            <AddItemPanel spkId={id} canEdit={canEditItems} onUpdated={setSpk} />

            {!canEditItems && (
              <p className="text-xs text-center text-muted-foreground mt-3 pt-3 border-t border-surface-border">
                Item tidak dapat diubah karena SPK sudah <span className="font-medium">{spk.status}</span>
              </p>
            )}
          </div>

          {/* Tahapan Modifikasi */}
          {((spk.stages && spk.stages.length > 0) || canEditItems) && (
            <div className="glass-panel p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Layers size={14} /> Tahapan Modifikasi
                  {spk.stages && spk.stages.length > 0 && (
                    <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">{spk.stages.length} tahap</span>
                  )}
                </h3>
                {canEditItems && (
                  <span className="text-[10px] text-muted-foreground border border-dashed border-surface-border px-2 py-0.5 rounded-full">
                    Bisa ditambah
                  </span>
                )}
              </div>
              {spk.stages && spk.stages.length > 0 ? (
                <div className="space-y-2">
                  {spk.stages.map(stage => (
                    <StageRow key={stage.id} stage={stage} spkId={id} canEdit={canEditItems} onUpdated={setSpk} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Layers size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Belum ada tahapan</p>
                  {canEditItems && <p className="text-xs mt-1">Tambahkan tahapan pengerjaan di bawah</p>}
                </div>
              )}
              <AddStagePanel spkId={id} canEdit={canEditItems} onUpdated={setSpk} />
            </div>
          )}

          {/* Garansi */}
          {spk.garansi && spk.garansi.length > 0 && (
            <div className="glass-panel p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <Shield size={14} /> Garansi
              </h3>
              <div className="space-y-2">
                {spk.garansi.map(g => (
                  <div key={g.id} className="flex items-center justify-between p-3 rounded-xl border border-surface-border">
                    <div>
                      <p className="text-sm font-medium">{g.itemName}</p>
                      <p className="text-[10px] text-muted-foreground">{formatDate(g.startDate)} – {formatDate(g.endDate)}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${g.status === "aktif" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : g.status === "hampir" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"}`}>
                      {g.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Sidebar */}
        <div className="space-y-6">
          {/* Ringkasan Biaya */}
          <div className="glass-panel p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Ringkasan Biaya</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Harga</span>
                <span className="font-medium">{formatRp(spk.totalHarga ?? 0)}</span>
              </div>
              {(spk.diskon ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Diskon</span>
                  <span className="font-medium text-emerald-600">- {formatRp(spk.diskon)}</span>
                </div>
              )}
              {spk.minimumDp > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Min. DP (40%)</span>
                  <span className="font-medium">{formatRp(spk.minimumDp)}</span>
                </div>
              )}
              {spk.totalBayar > 0 && <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sudah Dibayar</span>
                  <span className="font-medium text-emerald-600">{formatRp(spk.totalBayar)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sisa</span>
                  <span className="font-medium text-amber-600">{formatRp(Math.max(0, (spk.totalHarga ?? 0) - (spk.diskon ?? 0) - spk.totalBayar))}</span>
                </div>
              </>}
              <div className="pt-3 border-t border-surface-border flex justify-between">
                <span className="font-bold">Total Biaya</span>
                <span className="font-bold text-primary text-lg">{formatRp((spk.totalHarga ?? 0) - (spk.diskon ?? 0))}</span>
              </div>
            </div>
          </div>

          {/* GAP-9: CTA Proses Pembayaran jika SPK selesai tapi belum lunas */}
          {spk.status === 'selesai' && spk.pembayaran && spk.pembayaran.length > 0 && (() => {
            const inv = spk.pembayaran[0];
            const isLunas = inv.status === 'lunas';
            return (
              <div className={`glass-panel p-5 border-l-4 shadow-lg animate-in fade-in slide-in-from-right-4 duration-500 ${isLunas ? 'border-l-emerald-500 bg-emerald-500/5' : 'border-l-amber-500 bg-amber-500/5'}`}>
                {isLunas ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-600">Invoice Lunas</p>
                      <p className="text-xs text-muted-foreground">{inv.noInvoice} — Siap serah terima</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                        <Clock size={20} className="animate-pulse" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-amber-700">Menunggu Pelunasan</p>
                        <p className="text-xs text-muted-foreground">Sisa Tagihan: <span className="font-bold text-amber-600">{formatRp(inv.sisaBayar ?? 0)}</span></p>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">Kendaraan & garansi belum bisa dirilis sebelum ada pelunasan di sistem kasir.</p>
                    <Link
                      href={`/pembayaran/${inv.id}`}
                      className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold bg-amber-500 text-white rounded-xl hover:bg-amber-600 shadow-md hover:shadow-lg transition-all"
                    >
                      <CreditCard size={16} /> Bayar / Pelunasan Kasir
                    </Link>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Aksi Cepat */}
          <div className="glass-panel p-6 space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Aksi Cepat</h3>
            {spk.status === "antri" && (
              <button onClick={handleNextStatusClick} disabled={updatingStatus || (isModifikasiDPKurang && nextStatus === "dikerjakan")}
                className={`w-full flex items-center justify-center gap-2 text-sm py-2.5 rounded-xl font-medium disabled:opacity-70 ${isModifikasiDPKurang ? 'bg-zinc-300 text-zinc-500 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}>
                <Clock size={16} /> {isModifikasiDPKurang ? "Menunggu DP" : "Mulai Kerjakan"}
              </button>
            )}
            {spk.status === "dikerjakan" && (<>
              <button onClick={() => handleStatusUpdate("selesai")} disabled={updatingStatus}
                className="w-full flex items-center justify-center gap-2 text-sm bg-emerald-500 text-white py-2.5 rounded-xl font-medium hover:bg-emerald-600 disabled:opacity-70">
                <CheckCircle size={16} /> Tandai Selesai
              </button>
              <button onClick={() => setShowKendalaModal(true)} disabled={updatingStatus}
                className="w-full flex items-center justify-center gap-2 text-sm bg-red-500/10 text-red-500 border border-red-500/20 py-2.5 rounded-xl font-medium hover:bg-red-500/20 disabled:opacity-70">
                <AlertTriangle size={16} /> Laporkan Kendala
              </button>
            </>)}
            {spk.status === "kendala" && (
              <button onClick={() => handleStatusUpdate("dikerjakan")} disabled={updatingStatus}
                className="w-full flex items-center justify-center gap-2 text-sm bg-blue-500 text-white py-2.5 rounded-xl font-medium hover:bg-blue-600 disabled:opacity-70">
                <Clock size={16} /> Lanjut Kerjakan
              </button>
            )}
            {["antri", "dikerjakan", "kendala"].includes(spk.status) && (
              <button
                onClick={() => toast.confirm("Yakin ingin membatalkan SPK ini? Aksi ini tidak bisa diurungkan.", () => handleStatusUpdate("dibatalkan"))}
                disabled={updatingStatus}
                className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground border border-surface-border py-2.5 rounded-xl font-medium hover:bg-surface-hover disabled:opacity-70">
                <X size={16} /> Batalkan SPK
              </button>
            )}
            {["selesai", "dibatalkan"].includes(spk.status) && (
              <p className="text-xs text-center text-muted-foreground py-2">SPK sudah final</p>
            )}
          </div>

          {/* Cetak & link */}
          <div className="glass-panel p-4 space-y-2">
            <Link href={`/spk/${id}/cetak`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1">
              <Printer size={14} /> Cetak / Preview SPK
            </Link>
            {spk.pelanggan?.phone && (() => {
              const phone = spk.pelanggan.phone.replace(/^0/, "62").replace(/\D/g, "");
              const msg = encodeURIComponent(
                `Halo ${spk.pelanggan.name},\n\n` +
                `Berikut update SPK *${spk.noSpk}*:\n` +
                (spk.kendaraan ? `🚗 Kendaraan: ${spk.kendaraan.name} (${spk.kendaraan.plat})\n` : '') +
                `📋 Mode: ${spk.mode}\n` +
                `📊 Status: ${spk.status}\n` +
                `💰 Total Biaya: ${formatRp((spk.totalHarga ?? 0) - (spk.diskon ?? 0))}\n` +
                (spk.totalBayar > 0 ? `✅ Terbayar: ${formatRp(spk.totalBayar)}\n` : '') +
                (spk.estimasiSelesai && !spk.completedAt ? `📅 Est. Selesai: ${formatDate(spk.estimasiSelesai)}\n` : '') +
                `\nTerima kasih atas kepercayaan Anda!\n— ${typeof window !== 'undefined' ? document.title.split('|')[0].trim() : 'MM Tracing'}`
              );
              return (
                <a href={`https://wa.me/${phone}?text=${msg}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-500 transition-colors py-1">
                  <MessageCircle size={14} /> Kirim Update via WhatsApp
                </a>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Modal Kendala */}
      {showKendalaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-background border border-surface-border rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-1">Laporkan Kendala</h3>
            <p className="text-sm text-muted-foreground mb-4">Deskripsikan kendala yang dihadapi dalam pengerjaan SPK ini.</p>
            <textarea
              value={kendalaNote}
              onChange={e => setKendalaNote(e.target.value)}
              rows={4}
              placeholder="Contoh: Menunggu sparepart dari supplier..."
              className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50"
            />
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setShowKendalaModal(false)} className="px-4 py-2 text-sm border border-surface-border rounded-xl hover:bg-surface-hover">Batal</button>
              <button onClick={() => handleStatusUpdate("kendala", kendalaNote)} disabled={updatingStatus || !kendalaNote.trim()}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 disabled:opacity-60 flex items-center gap-2">
                {updatingStatus ? <Loader2 size={14} className="animate-spin" /> : null}
                Laporkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
