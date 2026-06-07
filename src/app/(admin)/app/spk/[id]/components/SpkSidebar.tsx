"use client";

import Link from "next/link";
import { Car, Wrench, CalendarClock, AlertCircle, ChevronRight, Phone, Receipt } from "lucide-react";
import type { Spk } from "@/lib/types";

const fmt = (n: number) => `Rp ${Number(n).toLocaleString("id-ID")}`;
const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—";

interface SpkSidebarProps {
  spk: Spk;
  openAssign: () => void | Promise<void>;
}

export function SpkSidebar({ spk, openAssign }: SpkSidebarProps) {
  return (
    <div className="space-y-4">
      {/* Pelanggan (E2: deep link) */}
      <Link
        href={`/app/kendaraan?id=${spk.pelangganId}`}
        className="glass-panel p-4 space-y-3 block hover:bg-surface-hover/40 transition-colors"
      >
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
          <span>Pelanggan</span>
          <ChevronRight size={14} className="opacity-60" />
        </h3>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
            {spk.pelanggan?.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={spk.pelanggan.photoUrl} alt={spk.pelanggan.name} className="w-full h-full object-cover" />
            ) : (
              <span>{spk.pelanggan?.name?.charAt(0) || "?"}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{spk.pelanggan?.name || "—"}</p>
            {spk.pelanggan?.phone && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone size={10} />{spk.pelanggan.phone}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Kendaraan */}
      {spk.kendaraan && (
        <div className="glass-panel p-4 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Car size={12} />Kendaraan</h3>
          <p className="font-semibold text-sm">{spk.kendaraan.name}</p>
          <span className="text-xs font-mono bg-surface-hover border border-surface-border px-2 py-0.5 rounded">{spk.kendaraan.plat}</span>
          {spk.kendaraan.tahun && (
            <p className="text-xs text-muted-foreground">Tahun {spk.kendaraan.tahun}{spk.kendaraan.warna ? ` • ${spk.kendaraan.warna}` : ""}</p>
          )}
        </div>
      )}

      {/* Mekanik (A2: assign inline) */}
      <div className="glass-panel p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Wrench size={12} />Mekanik</h3>
          {spk.status !== "selesai" && spk.status !== "dibatalkan" && (
            <button
              onClick={openAssign}
              className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
            >
              <Wrench size={10} /> {spk.mekanik ? "Ganti" : "Assign"}
            </button>
          )}
        </div>
        {spk.mekanik ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
              {spk.mekanik.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-sm">{spk.mekanik.name}</p>
              {spk.mekanik.spesialisasi && <p className="text-xs text-muted-foreground">{spk.mekanik.spesialisasi}</p>}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <AlertCircle size={14} />
            <span className="text-xs">Belum ditugaskan. Wajib diassign sebelum dikerjakan.</span>
          </div>
        )}
      </div>

      {/* Tanggal */}
      <div className="glass-panel p-4 space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><CalendarClock size={12} />Jadwal</h3>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">Dibuat</span><span className="font-medium">{fmtDate(spk.createdAt)}</span></div>
          {spk.startedAt && <div className="flex justify-between"><span className="text-muted-foreground">Mulai Dikerjakan</span><span className="font-medium">{fmtDate(spk.startedAt)}</span></div>}
          {spk.estimasiSelesai && <div className="flex justify-between"><span className="text-muted-foreground">Est. Selesai</span><span className="font-medium text-amber-600">{fmtDate(spk.estimasiSelesai)}</span></div>}
          {spk.completedAt && <div className="flex justify-between"><span className="text-muted-foreground">Selesai</span><span className="font-medium text-emerald-600">{fmtDate(spk.completedAt)}</span></div>}
        </div>
      </div>

      {/* Pembayaran */}
      {spk.pembayaran && spk.pembayaran.length > 0 && (
        <div className="glass-panel p-4 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pembayaran</h3>
          {spk.pembayaran.map(p => (
            <div key={p.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground">{p.noInvoice}</span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${p.status === "lunas" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : p.status === "parsial" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}`}>
                  {p.status}
                </span>
              </div>
              <div className="text-xs space-y-0.5">
                <div className="flex justify-between"><span className="text-muted-foreground">Tagihan</span><span>{fmt(p.totalTagihan)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Dibayar</span><span className="text-emerald-600">{fmt(p.totalBayar)}</span></div>
                <div className="flex justify-between font-bold"><span>Sisa</span><span className={Number(p.sisaBayar) > 0 ? "text-red-500" : "text-emerald-600"}>{fmt(Number(p.sisaBayar))}</span></div>
              </div>
              <Link href={`/app/pembayaran/${p.id}`} className="flex items-center gap-1 text-xs text-primary font-medium hover:underline mt-1">
                Kelola Pembayaran <ChevronRight size={12} />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
