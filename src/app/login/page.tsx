"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) router.replace("/");
  }, [isAuthenticated, router]);

  if (isAuthenticated) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Username dan password harus diisi");
      return;
    }

    setLoading(true);
    try {
      await login(username, password);
      router.replace("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login gagal";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xl animate-in fade-in duration-500">
      {/* Decorative Blob */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/30 rounded-full blur-[100px] pointer-events-none" />

      <div className="glass-panel w-full max-w-md p-8 relative z-10 mx-4 border-white/10 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary flex items-center justify-center text-white font-bold text-3xl shadow-glossy-primary mb-4 transform hover:rotate-12 transition-transform duration-300">
            M
          </div>
          <h1 className="text-2xl font-bold tracking-tight">MM Tracing</h1>
          <p className="text-muted-foreground text-sm mt-2">Sistem Manajemen Bengkel Terpadu</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">Username / Email</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-surface/50 border border-surface-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
              placeholder="Masukkan username Anda"
              disabled={loading}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <Link href="/reset-password" className="text-xs text-primary hover:underline">Lupa password?</Link>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-surface/50 border border-surface-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 flex justify-center items-center gap-2 btn-glossy bg-primary text-primary-foreground py-3 rounded-xl font-bold shadow-glossy-primary hover:shadow-glossy-primary-dark transition-all focus:outline-none focus:ring-4 focus:ring-primary/30 group disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <span>Masuk ke Sistem</span>
                <LogIn size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-muted-foreground border-t border-surface-border/50 pt-4">
          &copy; 2026 Bengkel MM Tracing. All rights reserved.
        </div>
      </div>
    </div>
  );
}
