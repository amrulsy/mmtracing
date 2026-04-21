import Link from "next/link";
import { ArrowLeft, Mail, MessageCircle, KeyRound, CheckCircle } from "lucide-react";

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xl animate-in fade-in duration-500">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="glass-panel w-full max-w-md p-8 relative z-10 mx-4 border-white/10 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4">
            <KeyRound size={28} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Reset Password</h1>
          <p className="text-muted-foreground text-sm mt-2">Pilih metode untuk menerima kode verifikasi reset password.</p>
        </div>

        <form className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Username atau Email</label>
            <input
              type="text"
              className="w-full px-4 py-3 bg-surface/50 border border-surface-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
              placeholder="Masukkan username atau email"
            />
          </div>

          <div className="space-y-2 pt-2">
            <p className="text-xs font-medium text-muted-foreground">Kirim Kode Verifikasi Via:</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" className="p-4 rounded-xl border-2 border-primary bg-primary/10 text-primary flex flex-col items-center gap-2 text-sm font-medium transition-all">
                <Mail size={22} />
                Email
              </button>
              <button type="button" className="p-4 rounded-xl border-2 border-surface-border text-muted-foreground hover:border-primary/30 hover:bg-surface-hover flex flex-col items-center gap-2 text-sm font-medium transition-all">
                <MessageCircle size={22} />
                WhatsApp
              </button>
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-medium text-muted-foreground">Kode Verifikasi (6 digit)</label>
            <div className="flex gap-2">
              {[...Array(6)].map((_, i) => (
                <input
                  key={i}
                  type="text"
                  maxLength={1}
                  className="w-full aspect-square bg-surface border border-surface-border rounded-xl text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  placeholder="•"
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-medium text-muted-foreground">Password Baru</label>
            <input
              type="password"
              className="w-full px-4 py-3 bg-surface/50 border border-surface-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
              placeholder="Minimal 8 karakter"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Konfirmasi Password Baru</label>
            <input
              type="password"
              className="w-full px-4 py-3 bg-surface/50 border border-surface-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
              placeholder="Ulangi password baru"
            />
          </div>

          <button type="button" className="w-full mt-4 flex justify-center items-center gap-2 btn-glossy bg-primary text-primary-foreground py-3 rounded-xl font-bold shadow-glossy-primary hover:shadow-glossy-primary-dark transition-all group">
            <CheckCircle size={18} />
            <span>Reset Password</span>
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-primary hover:underline font-medium">
            ← Kembali ke Login
          </Link>
        </div>
      </div>
    </div>
  );
}
