"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import type { Spk, Mekanik } from "@/lib/types";

export function useSpkDetail(id: string) {
  const router = useRouter();

  const [spk, setSpk] = useState<Spk | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Status modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string>("");
  const [catatan, setCatatan] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Progress slider
  const [progress, setProgress] = useState(0);
  const [updatingProgress, setUpdatingProgress] = useState(false);

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    keluhan: "", judulProyek: "", spesifikasi: "",
    prioritas: "normal", catatan: "", estimasiSelesai: "",
  });
  const [editSaving, setEditSaving] = useState(false);

  // Assign mekanik modal
  const [showAssign, setShowAssign] = useState(false);
  const [mekanikList, setMekanikList] = useState<Mekanik[]>([]);
  const [assignMekanikId, setAssignMekanikId] = useState<string>("");
  const [assignSaving, setAssignSaving] = useState(false);

  // WhatsApp sending state
  const [sendingWA, setSendingWA] = useState<string>("");

  // Checklist modal
  const [showChecklist, setShowChecklist] = useState(false);
  const [togglingId, setTogglingId] = useState<string>("");

  // Foto Lampiran
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // ── Data Fetching ──────────────────────────────────────────────
  const fetchSpk = useCallback(async () => {
    try {
      setError("");
      const res = await api.get<Spk>(`/spk/${id}`);
      setSpk(res.data);
      setProgress(res.data.progress ?? 0);
      setCatatan(res.data.catatan ?? "");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data SPK");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchSpk(); }, [fetchSpk]);

  // Global Esc key handler to close any open modal
  useEffect(() => {
    const anyOpen = showStatusModal || showEdit || showAssign || showChecklist;
    if (!anyOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showStatusModal) setShowStatusModal(false);
      else if (showChecklist) setShowChecklist(false);
      else if (showEdit) setShowEdit(false);
      else if (showAssign) setShowAssign(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showStatusModal, showEdit, showAssign, showChecklist]);

  // ── Status ─────────────────────────────────────────────────────
  const openStatusModal = (target: string) => {
    setPendingStatus(target);
    setCatatan("");
    setShowStatusModal(true);
  };

  const handleUpdateStatus = async () => {
    if (!pendingStatus) return;
    setUpdatingStatus(true);
    try {
      const body: Record<string, unknown> = { status: pendingStatus };
      if (catatan.trim()) body.catatan = catatan;
      const res = await api.put<Spk>(`/spk/${id}/status`, body);
      setSpk(res.data);
      setProgress(res.data.progress ?? 0);
      setShowStatusModal(false);
      toast.success("Status Diperbarui", `SPK berhasil diubah ke "${pendingStatus}"`);

      if (pendingStatus === "selesai") {
        const updated = res.data;
        const sisa = updated.pembayaran?.[0]?.sisaBayar ??
          Math.max(0, Number(updated.totalHarga) - Number(updated.diskon ?? 0) - Number(updated.totalBayar));
        const payId = updated.pembayaran?.[0]?.id;
        if (Number(sisa) > 0 && payId) {
          toast.info?.("Lanjut ke Pembayaran", `Sisa tagihan Rp ${Number(sisa).toLocaleString("id-ID")} — mengarahkan ke kasir...`);
          setTimeout(() => router.push(`/app/pembayaran/${payId}`), 800);
        }
      }
    } catch (err: unknown) {
      toast.error("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // ── Edit ────────────────────────────────────────────────────────
  const openEdit = () => {
    if (!spk) return;
    setEditForm({
      keluhan: spk.keluhan || "",
      judulProyek: spk.judulProyek || "",
      spesifikasi: spk.spesifikasi || "",
      prioritas: spk.prioritas,
      catatan: spk.catatan || "",
      estimasiSelesai: spk.estimasiSelesai ? spk.estimasiSelesai.slice(0, 10) : "",
    });
    setShowEdit(true);
  };

  const handleEdit = async () => {
    if (!spk) return;
    setEditSaving(true);
    try {
      const res = await api.put<Spk>(`/spk/${id}`, {
        keluhan: editForm.keluhan,
        judulProyek: editForm.judulProyek,
        spesifikasi: editForm.spesifikasi,
        prioritas: editForm.prioritas,
        catatan: editForm.catatan,
        estimasiSelesai: editForm.estimasiSelesai ? new Date(editForm.estimasiSelesai).toISOString() : null,
      });
      setSpk(res.data);
      toast.success("Berhasil", "SPK diperbarui");
      setShowEdit(false);
    } catch (err: unknown) {
      toast.error("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setEditSaving(false);
    }
  };

  // ── Assign Mekanik ─────────────────────────────────────────────
  const openAssign = async () => {
    setAssignMekanikId(spk?.mekanikId?.toString() || "");
    if (mekanikList.length === 0) {
      try {
        const res = await api.getPaginated<Mekanik>("/mekanik", { limit: 100 });
        setMekanikList(res.data);
      } catch { /* silent */ }
    }
    setShowAssign(true);
  };

  const handleAssign = async () => {
    setAssignSaving(true);
    try {
      const res = await api.put<Spk>(`/spk/${id}/mekanik`, {
        mekanikId: assignMekanikId ? Number(assignMekanikId) : null,
      });
      setSpk(res.data);
      toast.success("Berhasil", assignMekanikId ? "Mekanik ditugaskan" : "Mekanik di-unassign");
      setShowAssign(false);
    } catch (err: unknown) {
      toast.error("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setAssignSaving(false);
    }
  };

  // ── Clone ───────────────────────────────────────────────────────
  const handleClone = () => {
    if (!spk) return;
    const template = {
      pelangganId: spk.pelangganId,
      kendaraanId: spk.kendaraanId,
      mekanikId: spk.mekanikId,
      mode: spk.mode,
      prioritas: spk.prioritas,
      keluhan: spk.keluhan,
      judulProyek: spk.judulProyek,
      spesifikasi: spk.spesifikasi,
      items: (spk.items || []).map(i => ({
        type: i.type, sparepartId: i.sparepartId, jasaId: i.jasaId,
        nama: i.nama, qty: i.qty, hargaSatuan: Number(i.hargaSatuan),
      })),
      stages: (spk.stages || []).map(s => ({
        nama: s.nama, estimasiBiaya: Number(s.estimasiBiaya), durasiHari: s.durasiHari,
      })),
    };
    try { localStorage.setItem("mm_spk_clone", JSON.stringify(template)); } catch { /* ignore */ }
    router.push(`/app/spk/create?mode=${spk.mode}&clone=1`);
  };

  // ── WhatsApp ────────────────────────────────────────────────────
  const handleSendWA = async (kind: "created" | "selesai" | "progress") => {
    setSendingWA(kind);
    try {
      await api.post(`/spk/${id}/whatsapp`, { kind });
      toast.success("WhatsApp Terkirim", `Notifikasi "${kind}" dikirim ke pelanggan.`);
    } catch (err: unknown) {
      toast.error("Gagal Kirim", err instanceof Error ? err.message : "Pastikan gateway WhatsApp aktif");
    } finally {
      setSendingWA("");
    }
  };

  // ── Progress ────────────────────────────────────────────────────
  const handleUpdateProgress = async () => {
    setUpdatingProgress(true);
    try {
      const res = await api.put<Spk>(`/spk/${id}/progress`, { progress });
      setSpk(res.data);
      toast.success("Progress Diperbarui");
    } catch (err: unknown) {
      toast.error("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setUpdatingProgress(false);
    }
  };

  // ── Checklist toggles ──────────────────────────────────────────
  const handleToggleItem = async (itemId: number, current: string) => {
    const next = current === "done" ? "pending" : "done";
    setTogglingId(`item-${itemId}`);
    try {
      const res = await api.patch<Spk>(`/spk/${id}/items/${itemId}`, { status: next });
      setSpk(res.data);
      setProgress(res.data.progress ?? 0);
    } catch (err: unknown) {
      toast.error("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setTogglingId("");
    }
  };

  const handleToggleStage = async (stageId: number, current: string) => {
    const next = current === "pending" ? "in_progress" : current === "in_progress" ? "done" : "pending";
    setTogglingId(`stage-${stageId}`);
    try {
      const res = await api.patch<Spk>(`/spk/${id}/stages/${stageId}`, { status: next });
      setSpk(res.data);
      setProgress(res.data.progress ?? 0);
    } catch (err: unknown) {
      toast.error("Gagal", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setTogglingId("");
    }
  };

  // ── Upload Foto ──────────────────────────────────────────────────
  const handleUploadPhoto = async (file: File) => {
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      fd.append("type", "lampiran");
      await api.upload(`/spk/${id}/photos`, fd);
      toast.success("Foto Berhasil Diunggah");
      await fetchSpk();
    } catch (err: unknown) {
      toast.error("Gagal Mengunggah", err instanceof Error ? err.message : "Terjadi kesalahan saat mengunggah foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────
  const handleDelete = () => {
    toast.confirm(`Yakin ingin menghapus SPK ${spk?.noSpk}?`, async () => {
      try {
        await api.delete(`/spk/${id}`);
        toast.success("SPK dihapus");
        router.push("/app/spk");
      } catch (err: unknown) {
        toast.error("Gagal Menghapus", err instanceof Error ? err.message : "Terjadi kesalahan");
      }
    });
  };

  return {
    // Data
    spk, loading, error, fetchSpk,
    // Progress
    progress, setProgress, updatingProgress, handleUpdateProgress,
    // Status modal
    showStatusModal, setShowStatusModal,
    pendingStatus, catatan, setCatatan, updatingStatus,
    openStatusModal, handleUpdateStatus,
    // Edit modal
    showEdit, setShowEdit, editForm, setEditForm, editSaving,
    openEdit, handleEdit,
    // Assign mekanik modal
    showAssign, setShowAssign, mekanikList, assignMekanikId, setAssignMekanikId,
    assignSaving, openAssign, handleAssign,
    // WA
    sendingWA, handleSendWA,
    // Checklist
    showChecklist, setShowChecklist, togglingId,
    handleToggleItem, handleToggleStage,
    // Photos
    uploadingPhoto, handleUploadPhoto,
    // Actions
    handleClone, handleDelete,
  };
}
