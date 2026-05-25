"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Phone, User, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function PortalLogin() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: "", phone: "", password: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [msg, setMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMsg("");

    try {
      const endpoint = isLogin ? "/api/v1/customer-auth/login" : "/api/v1/customer-auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();

      if (!data.success) {
        setStatus("error");
        setMsg(data.message || "Terjadi kesalahan");
        return;
      }

      if (isLogin) {
        // Store token
        localStorage.setItem("mmt_customer_token", data.data.token);
        router.push("/portal/dashboard");
      } else {
        // Switch to login
        setIsLogin(true);
        setStatus("idle");
        setMsg("Registrasi berhasil! Silakan login.");
      }
    } catch (err) {
      setStatus("error");
      setMsg("Koneksi gagal. Silakan coba lagi.");
    }
  };

  const inputCls = "w-full bg-surface-hover/50 border border-surface-border rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all focus:bg-background";
  const labelCls = "text-xs font-semibold text-muted-foreground mb-1.5 block";

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md glass-panel p-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black mb-2">{isLogin ? "Selamat Datang Kembali" : "Buat Akun Baru"}</h1>
          <p className="text-sm text-muted-foreground">
            {isLogin ? "Masuk untuk melihat status servis dan riwayat kendaraan Anda." : "Daftar untuk mengelola kendaraan dan servis Anda di MMT Racing."}
          </p>
        </div>

        {msg && (
          <div className={`p-4 rounded-xl text-sm font-medium mb-6 flex items-center justify-center text-center border ${status === "error" ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"}`}>
            {msg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div>
              <label className={labelCls}>Nama Lengkap</label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-3.5 text-muted-foreground" />
                <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inputCls} placeholder="Budi Santoso" />
              </div>
            </div>
          )}

          <div>
            <label className={labelCls}>No. WhatsApp</label>
            <div className="relative">
              <Phone size={18} className="absolute left-4 top-3.5 text-muted-foreground" />
              <input required type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value.replace(/[^0-9]/g, '')})} className={inputCls} placeholder="081234567890" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-3.5 text-muted-foreground" />
              <input required type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className={inputCls} placeholder="••••••••" />
            </div>
          </div>

          <button disabled={status === "loading"} type="submit" className="w-full btn-glossy bg-primary text-white py-3.5 rounded-xl font-bold text-sm shadow-glossy-primary flex items-center justify-center gap-2 mt-6">
            {status === "loading" ? <Loader2 className="animate-spin" size={18} /> : (isLogin ? "Masuk ke Portal" : "Daftar Sekarang")}
            {!status && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-surface-border text-center">
          <p className="text-sm text-muted-foreground">
            {isLogin ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
            <button onClick={() => { setIsLogin(!isLogin); setMsg(""); setStatus("idle"); }} className="font-bold text-primary hover:underline">
              {isLogin ? "Daftar di sini" : "Login di sini"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
