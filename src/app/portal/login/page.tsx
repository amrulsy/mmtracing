"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Phone, KeyRound, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { setPortalTokens } from "@/lib/portalFetch";

export default function PortalLogin() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [msg, setMsg] = useState("");

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    
    setStatus("loading");
    setMsg("");

    try {
      const res = await fetch("/api/v1/customer-auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();

      if (!data.success) {
        setStatus("error");
        setMsg(data.message || "Gagal mengirim OTP");
        return;
      }

      setStatus("idle");
      setMsg(data.message || "OTP terkirim!");
      setStep(2);
    } catch (err) {
      setStatus("error");
      setMsg("Koneksi gagal. Silakan coba lagi.");
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    
    setStatus("loading");
    setMsg("");

    try {
      const res = await fetch("/api/v1/customer-auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp })
      });
      const data = await res.json();

      if (!data.success) {
        setStatus("error");
        setMsg(data.message || "OTP salah atau kadaluarsa");
        return;
      }

      // Store token(s)
      setPortalTokens(data.data.token, data.data.refreshToken);
      router.push("/portal/dashboard");
    } catch (err) {
      setStatus("error");
      setMsg("Koneksi gagal. Silakan coba lagi.");
    }
  };

  const inputCls = "w-full bg-surface-hover/50 border border-surface-border rounded-xl pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all focus:bg-background";
  const labelCls = "text-xs font-semibold text-muted-foreground mb-1.5 block";

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm md:max-w-md glass-panel p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black mb-2">Portal Pelanggan</h1>
          <p className="text-sm text-muted-foreground">
            {step === 1 ? "Masuk dengan nomor WhatsApp Anda untuk melihat riwayat servis." : "Masukkan 6 digit kode OTP yang kami kirimkan ke WhatsApp Anda."}
          </p>
        </div>

        {msg && (
          <div className={`p-4 rounded-xl text-sm font-medium mb-6 flex items-center justify-center text-center border ${status === "error" ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"}`}>
            {msg}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestOtp} className="space-y-6">
            <div>
              <label className={labelCls}>No. WhatsApp</label>
              <div className="relative">
                <Phone size={18} className="absolute left-4 top-4 text-muted-foreground" />
                <input required type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))} className={inputCls} placeholder="081234567890" />
              </div>
            </div>

            <button disabled={status === "loading" || phone.length < 9} type="submit" className="w-full bg-red-600 text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 mt-6 disabled:opacity-50">
              {status === "loading" ? <Loader2 className="animate-spin" size={18} /> : "Kirim Kode OTP"}
              {!status && <ArrowRight size={18} />}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div>
              <label className={labelCls}>Kode OTP (6 digit)</label>
              <div className="relative">
                <KeyRound size={18} className="absolute left-4 top-4 text-muted-foreground" />
                <input required type="text" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))} className={`${inputCls} font-mono tracking-widest text-center pl-4 text-lg`} placeholder="••••••" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => { setStep(1); setMsg(""); setStatus("idle"); setOtp(""); }} className="px-4 py-3.5 rounded-xl border border-surface-border hover:bg-surface-hover text-muted-foreground transition-colors shrink-0">
                <ArrowLeft size={18} />
              </button>
              <button disabled={status === "loading" || otp.length !== 6} type="submit" className="flex-1 bg-red-600 text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {status === "loading" ? <Loader2 className="animate-spin" size={18} /> : "Masuk"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-surface-border text-center">
          <Link href="/" className="text-sm font-bold text-muted-foreground hover:text-foreground hover:underline flex items-center justify-center gap-1">
            <ArrowLeft size={14} /> Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
