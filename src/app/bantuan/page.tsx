import Link from "next/link";
import { Search, BookOpen, Video, Keyboard, MessageCircle, ChevronRight, HelpCircle, FileText } from "lucide-react";

export default function BantuanPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out max-w-4xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Pusat Bantuan</h1>
        <p className="text-muted-foreground">FAQ, panduan, dan tips untuk menggunakan MM Tracing.</p>
      </div>

      <div className="flex items-center gap-2 bg-surface border border-surface-border rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/50 shadow-sm">
        <Search size={20} className="text-muted-foreground" />
        <input type="text" placeholder="Cari bantuan... (cth: cara buat SPK, reset password)" className="bg-transparent border-none focus:outline-none text-sm w-full" />
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-4 gap-4">
        {[
          { icon: BookOpen, label: "Panduan Dasar", desc: "Mulai dari sini", color: "text-blue-500 bg-blue-500/10" },
          { icon: Video, label: "Video Tutorial", desc: "5 video tersedia", color: "text-primary bg-primary/10" },
          { icon: Keyboard, label: "Shortcut Keys", desc: "Tips cepat", color: "text-purple-500 bg-purple-500/10" },
          { icon: MessageCircle, label: "Hubungi Support", desc: "WhatsApp / Email", color: "text-emerald-500 bg-emerald-500/10" },
        ].map((q, i) => (
          <div key={i} className="glass-panel p-5 text-center hover:-translate-y-1 hover:shadow-glossy transition-all cursor-pointer group">
            <div className={`w-12 h-12 rounded-2xl ${q.color} flex items-center justify-center mx-auto mb-3`}>
              <q.icon size={24} />
            </div>
            <p className="font-bold text-sm group-hover:text-primary transition-colors">{q.label}</p>
            <p className="text-[10px] text-muted-foreground">{q.desc}</p>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="glass-panel p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2"><HelpCircle size={16} /> Pertanyaan Umum (FAQ)</h3>
        <div className="space-y-2">
          {[
            { q: "Bagaimana cara membuat SPK baru?", a: "Buka halaman SPK → Klik 'Buat SPK Baru' → Pilih tipe (Servis Rutin / Modifikasi) → Isi data pelanggan & kendaraan → Submit." },
            { q: "Bagaimana cara menerima pembayaran DP?", a: "Buka SPK terkait → Klik 'Proses Pembayaran' → Input jumlah DP → Pilih metode (Cash/Transfer/QRIS) → Konfirmasi." },
            { q: "Bagaimana cara assign mekanik ke SPK?", a: "Saat membuat SPK, pilih mekanik dari dropdown. Atau di halaman Monitoring, drag card ke kolom 'Dikerjakan' dan pilih mekanik." },
            { q: "Bagaimana mekanik update progress?", a: "Buka halaman Monitoring → Klik card SPK → Update checklist dan foto progress → Submit update." },
            { q: "Bagaimana cara cetak kwitansi thermal?", a: "Buka detail Pembayaran → Klik 'Cetak Kwitansi' → Pilih format thermal 58mm → Klik 'Cetak'." },
            { q: "Apakah pelanggan bisa melihat progress?", a: "Ya! Kirim link approval/tracking via WhatsApp. Pelanggan bisa lihat status tanpa login." },
            { q: "Bagaimana cara reset password?", a: "Di halaman login → Klik 'Lupa password?' → Pilih metode verifikasi (Email/WA) → Input OTP → Set password baru." },
            { q: "Bagaimana cara menambah sparepart baru?", a: "Buka Master Data → Katalog Sparepart → Klik 'Tambah Sparepart' → Isi data → Simpan." },
          ].map((faq, i) => (
            <details key={i} className="group">
              <summary className="flex items-center justify-between p-3 rounded-xl cursor-pointer hover:bg-surface-hover/30 transition-colors list-none">
                <span className="text-sm font-medium flex items-center gap-2"><span className="text-primary font-bold">Q:</span> {faq.q}</span>
                <ChevronRight size={16} className="text-muted-foreground group-open:rotate-90 transition-transform" />
              </summary>
              <div className="px-3 pb-3 ml-6">
                <p className="text-sm text-muted-foreground bg-surface-hover/30 p-3 rounded-lg">{faq.a}</p>
              </div>
            </details>
          ))}
        </div>
      </div>

      {/* Contact Support */}
      <div className="glass-panel p-6 text-center border-2 border-dashed border-primary/20 bg-primary/5">
        <MessageCircle size={32} className="text-primary mx-auto mb-2" />
        <h3 className="font-bold text-lg">Butuh Bantuan Lebih?</h3>
        <p className="text-sm text-muted-foreground mb-3">Tim support kami siap membantu via WhatsApp atau Email.</p>
        <div className="flex justify-center gap-3">
          <button className="px-4 py-2 text-sm font-medium bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors">💬 WhatsApp Support</button>
          <button className="px-4 py-2 text-sm font-medium bg-surface border border-surface-border rounded-xl hover:bg-surface-hover transition-colors">✉️ Email Support</button>
        </div>
      </div>
    </div>
  );
}
