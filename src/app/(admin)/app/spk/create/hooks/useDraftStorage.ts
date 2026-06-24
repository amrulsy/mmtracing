import { useState, useEffect } from "react";
import { toast } from "@/lib/toast";

export function useDraftStorage(mode: string, state: any, setters: any, searchParams: any) {
 const DRAFT_KEY = `mm_spk_draft_${mode}`;
 const [draftAvailable, setDraftAvailable] = useState<{ savedAt: string } | null>(null);

 useEffect(() => {
 if (searchParams.get("clone") === "1") return;
 const timer = setTimeout(() => {
 try {
 const hasContent = state.pelangganId || state.keluhan || state.judulProyek || state.selectedJasaItems.length || state.selectedSparepartItems.length;
 if (hasContent) {
 localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...state, savedAt: new Date().toISOString() }));
 }
 } catch { /* ignore */ }
 }, 1000);
 return () => clearTimeout(timer);
 }, [DRAFT_KEY, state, searchParams]);

 useEffect(() => {
 if (searchParams.get("clone") === "1") return;
 try {
 const raw = localStorage.getItem(DRAFT_KEY);
 if (raw) {
 const d = JSON.parse(raw);
 if (d && d.savedAt) setDraftAvailable({ savedAt: d.savedAt });
 }
 } catch { /* ignore */ }
 }, [DRAFT_KEY, searchParams]);

 const restoreDraft = () => {
 try {
 const raw = localStorage.getItem(DRAFT_KEY);
 if (!raw) return;
 const d = JSON.parse(raw);
 if (d.pelangganId) setters.setPelangganId(d.pelangganId);
 if (d.kendaraanId) setters.setKendaraanId(d.kendaraanId);
 if (d.odometerMasuk) setters.setOdometerMasuk(d.odometerMasuk);
 if (d.mekanikId) setters.setMekanikId(d.mekanikId);
 if (d.prioritas) setters.setPrioritas(d.prioritas);
 if (d.keluhan) setters.setKeluhan(d.keluhan);
 if (d.judulProyek) setters.setJudulProyek(d.judulProyek);
 if (d.spesifikasi) setters.setSpesifikasi(d.spesifikasi);
 if (Array.isArray(d.stages) && d.stages.length) setters.setStages(d.stages);
 if (d.bubutKeluhan) setters.setBubutKeluhan(d.bubutKeluhan);
 if (d.namaBubut) setters.setNamaBubut(d.namaBubut);
 if (Array.isArray(d.selectedJasaItems)) setters.setSelectedJasaItems(d.selectedJasaItems);
 if (Array.isArray(d.selectedSparepartItems)) setters.setSelectedSparepartItems(d.selectedSparepartItems);
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

 return { draftAvailable, restoreDraft, dismissDraft };
}
