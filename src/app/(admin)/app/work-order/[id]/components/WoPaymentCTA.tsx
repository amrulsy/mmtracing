"use client";

import { useState } from "react";
import { Receipt } from "lucide-react";
import { PaymentModal } from "@/components/ui/payment-modal";
import type { Pembayaran } from "@/lib/types";

interface WoPaymentCTAProps {
 sisaBayar: number;
 pembayaran?: Pembayaran | null;
 status: string;
 onPaymentSuccess?: () => void;
}

const fmt = (n: number) => `Rp ${Number(n).toLocaleString("id-ID")}`;

export function WoPaymentCTA({ sisaBayar, pembayaran, status, onPaymentSuccess }: WoPaymentCTAProps) {
 const [showPayModal, setShowPayModal] = useState(false);
 const shouldShow = Number(sisaBayar) > 0 && !!pembayaran && status !== "dibatalkan";
 if (!shouldShow) return null;

 return (
 <>
 <button
 onClick={() => setShowPayModal(true)}
 className="w-full glass-panel p-4 flex items-center justify-between gap-4 border-2 border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 transition-colors text-left"
 >
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
 <Receipt size={18} />
 </div>
 <div>
 <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Sisa Tagihan</p>
 <p className="text-xl font-bold text-amber-900 dark:text-amber-300">{fmt(Number(sisaBayar))}</p>
 </div>
 </div>
 <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-amber-500 text-white">
 Bayar Sekarang
 </div>
 </button>

 <PaymentModal
 pembayaran={pembayaran!}
 open={showPayModal}
 onClose={() => setShowPayModal(false)}
 onSuccess={() => {
  setShowPayModal(false);
  onPaymentSuccess?.();
 }}
 />
 </>
 );
}
