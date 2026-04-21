"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Wrench, Cog, Hammer, Shield, Clock, Users, Star, ChevronRight,
  Phone, Mail, MapPin, Calendar, MessageCircle, ArrowRight, Check,
  Zap, Eye, Award, Target, ChevronDown, Menu, X, Play
} from "lucide-react";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Animated counter hook
  function useCounter(end: number, duration = 2000) {
    const [count, setCount] = useState(0);
    useEffect(() => {
      let start = 0;
      const step = end / (duration / 16);
      const timer = setInterval(() => {
        start += step;
        if (start >= end) { setCount(end); clearInterval(timer); }
        else setCount(Math.floor(start));
      }, 16);
      return () => clearInterval(timer);
    }, [end, duration]);
    return count;
  }

  const years = useCounter(10);
  const customers = useCounter(5200);
  const spks = useCounter(15800);
  const rating = useCounter(49);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ========== NAVBAR ========== */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-background/90 backdrop-blur-xl border-b border-surface-border shadow-sm" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/landing" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-black text-lg shadow-glossy-primary">M</div>
            <div>
              <span className="font-black text-lg tracking-tight">MM Tracing</span>
              <span className="hidden sm:block text-[9px] text-muted-foreground -mt-1">Workshop & Custom Fabrication</span>
            </div>
          </Link>
          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8">
            {["Layanan", "Harga", "Galeri", "Testimoni", "Kontak"].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{item}</a>
            ))}
            <a href="#booking" className="btn-glossy bg-primary text-white px-5 py-2 rounded-xl text-sm font-bold shadow-glossy-primary hover:shadow-glossy-primary-dark">Booking Online</a>
          </div>
          {/* Mobile hamburger */}
          <button className="lg:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {/* Mobile menu */}
        {menuOpen && (
          <div className="lg:hidden bg-background border-t border-surface-border py-4 px-6 space-y-3 animate-in slide-in-from-top duration-200">
            {["Layanan", "Harga", "Galeri", "Testimoni", "Kontak"].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setMenuOpen(false)} className="block text-sm font-medium py-2 text-muted-foreground hover:text-foreground">{item}</a>
            ))}
            <a href="#booking" onClick={() => setMenuOpen(false)} className="block text-center btn-glossy bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-glossy-primary">Booking Sekarang</a>
          </div>
        )}
      </nav>

      {/* ========== HERO ========== */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-primary/5 rounded-full blur-[100px]" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center py-32">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-6 animate-in fade-in duration-700">
            <Zap size={12} /> Bengkel Terpercaya Sejak 2016
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight leading-[1.1] mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            Servis Berkualitas,{" "}
            <span className="text-primary">Modifikasi</span>{" "}
            Presisi Tinggi
          </h1>
          <p className="text-base lg:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            Spesialis servis rutin, modifikasi, dan jasa bubut custom untuk motor & mobil. 
            Dikerjakan mekanik berpengalaman dengan garansi resmi.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <a href="#booking" className="w-full sm:w-auto btn-glossy bg-primary text-white px-8 py-3.5 rounded-xl font-bold text-sm shadow-glossy-primary hover:shadow-glossy-primary-dark flex items-center justify-center gap-2">
              <Calendar size={18} /> Booking Online
            </a>
            <a href="https://wa.me/62274123456" target="_blank" className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm bg-emerald-500 text-white shadow-lg hover:bg-emerald-600 transition-colors">
              <MessageCircle size={18} /> Chat WhatsApp
            </a>
          </div>
          <div className="mt-12 flex items-center justify-center gap-2 text-muted-foreground animate-in fade-in duration-700 delay-500">
            <ChevronDown size={20} className="animate-bounce" />
            <span className="text-xs">Scroll untuk eksplorasi</span>
          </div>
        </div>
      </section>

      {/* ========== STATS ========== */}
      <section className="relative py-16 lg:py-20 bg-gradient-to-r from-primary to-primary/80">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {[
              { value: `${years}+`, label: "Tahun Pengalaman", icon: Award },
              { value: customers.toLocaleString()+"+", label: "Pelanggan Puas", icon: Users },
              { value: spks.toLocaleString()+"+", label: "SPK Selesai", icon: Target },
              { value: `${(rating / 10).toFixed(1)}`, label: "Rating Google", icon: Star },
            ].map((s, i) => (
              <div key={i} className="text-center text-white">
                <s.icon size={28} className="mx-auto mb-2 opacity-60" />
                <p className="text-3xl lg:text-4xl font-black">{s.value}</p>
                <p className="text-xs lg:text-sm opacity-80 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== LAYANAN ========== */}
      <section id="layanan" className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Layanan Kami</span>
            <h2 className="text-3xl lg:text-4xl font-black mt-2">Solusi Lengkap untuk Kendaraan Anda</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Dari perawatan rutin hingga modifikasi presisi tinggi — semua dikerjakan di satu tempat.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {[
              { icon: Wrench, title: "Servis Rutin", desc: "Ganti oli, tune up, CVT clean, ganti kampas rem, dan perawatan berkala lainnya.", color: "from-blue-500 to-blue-600" },
              { icon: Cog, title: "Modifikasi", desc: "Custom exhaust, bore up, suspension upgrade, body kit, dan modifikasi performa.", color: "from-red-500 to-red-600" },
              { icon: Hammer, title: "Jasa Bubut Custom", desc: "Bubut velg, spacer, adapter, shaft, dan komponen custom lainnya dengan presisi CNC.", color: "from-purple-500 to-purple-600" },
              { icon: Shield, title: "Quality Check", desc: "Inspeksi menyeluruh: mesin, kelistrikan, body, ban. Laporan digital lengkap.", color: "from-emerald-500 to-emerald-600" },
              { icon: Eye, title: "Detailing & Coating", desc: "Poles body, nano ceramic coating, engine dress-up untuk tampilan showroom.", color: "from-amber-500 to-amber-600" },
              { icon: Clock, title: "Express Service", desc: "Layanan cepat untuk servis ringan. Selesai dalam 30-60 menit dengan appointment.", color: "from-cyan-500 to-cyan-600" },
            ].map((svc, i) => (
              <div key={i} className="group glass-panel p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${svc.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                  <svc.icon size={22} className="text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2">{svc.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{svc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== KEUNGGULAN ========== */}
      <section className="py-16 lg:py-24 bg-surface-hover/30">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Kenapa MM Tracing?</span>
            <h2 className="text-3xl lg:text-4xl font-black mt-2">Pilihan Tepat untuk Kendaraan Anda</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Shield, title: "Garansi Resmi", desc: "Jasa 30 hari, sparepart 6 bulan. Klaim mudah.", color: "text-emerald-500 bg-emerald-500/10" },
              { icon: Eye, title: "100% Transparan", desc: "Lihat progress real-time. Tidak ada biaya tersembunyi.", color: "text-blue-500 bg-blue-500/10" },
              { icon: Award, title: "Mekanik Bersertifikat", desc: "Tim kami terlatih dan berpengalaman 5+ tahun.", color: "text-amber-500 bg-amber-500/10" },
              { icon: Zap, title: "Cepat & Tepat Waktu", desc: "Estimasi akurat. Notifikasi WA otomatis.", color: "text-purple-500 bg-purple-500/10" },
            ].map((usp, i) => (
              <div key={i} className="glass-panel p-5 text-center hover:shadow-md transition-shadow">
                <div className={`w-14 h-14 rounded-2xl ${usp.color} flex items-center justify-center mx-auto mb-3`}>
                  <usp.icon size={24} />
                </div>
                <h4 className="font-bold mb-1">{usp.title}</h4>
                <p className="text-xs text-muted-foreground">{usp.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== HARGA ========== */}
      <section id="harga" className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Daftar Harga</span>
            <h2 className="text-3xl lg:text-4xl font-black mt-2">Harga Transparan, Tanpa Kejutan</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Harga sudah termasuk jasa. Sparepart original.</p>
          </div>
          {/* Tabs */}
          <div className="flex justify-center gap-1 mb-8 bg-surface-hover rounded-xl border border-surface-border p-1 max-w-md mx-auto">
            {["Motor", "Mobil", "Bubut"].map((t, i) => (
              <button key={i} onClick={() => setActiveTab(i)} className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === i ? "bg-primary text-white shadow-glossy-primary" : "text-muted-foreground hover:bg-surface"}`}>{t}</button>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {(activeTab === 0 ? [
              { name: "Ganti Oli + Filter", price: "Rp 85.000", note: "Yamalube 10W-40", popular: false },
              { name: "Tune Up Standard", price: "Rp 50.000", note: "Busi + karbu + filter", popular: false },
              { name: "Paket Servis Lengkap", price: "Rp 285.000", note: "Tune Up + Oli + CVT + Busi", popular: true },
              { name: "Ganti Kampas Rem", price: "Rp 65.000", note: "Depan/belakang + jasa", popular: false },
              { name: "Servis CVT", price: "Rp 75.000", note: "Van belt + roller + clean", popular: false },
              { name: "Balancing Roda", price: "Rp 40.000", note: "Per roda", popular: false },
            ] : activeTab === 1 ? [
              { name: "Ganti Oli Mesin", price: "Rp 350.000", note: "Shell Helix 5W-30 4L", popular: false },
              { name: "Tune Up Mesin", price: "Rp 250.000", note: "Busi + filter + scan ECU", popular: true },
              { name: "Servis AC", price: "Rp 200.000", note: "Isi freon + cek kompresor", popular: false },
              { name: "Ganti Kampas Rem", price: "Rp 350.000", note: "Depan set + jasa", popular: false },
              { name: "Spooring + Balancing", price: "Rp 250.000", note: "4 roda", popular: false },
              { name: "Scanner Diagnosa", price: "Rp 100.000", note: "OBD2 full scan", popular: false },
            ] : [
              { name: "Bubut Velg Motor", price: "Rp 300.000", note: "Per velg, presisi 0.01mm", popular: true },
              { name: "Custom Spacer", price: "Rp 150.000", note: "Aluminium 6061", popular: false },
              { name: "Bubut Shaft Custom", price: "Rp 200.000", note: "Material besi/stainless", popular: false },
              { name: "Adapter Caliper", price: "Rp 250.000", note: "Bahan billet aluminium", popular: false },
              { name: "Custom Bracket", price: "Rp 175.000", note: "Sesuai desain customer", popular: false },
              { name: "Boring Cylinder", price: "Rp 450.000", note: "Oversize + honing", popular: false },
            ]).map((p, i) => (
              <div key={i} className={`glass-panel p-5 relative ${p.popular ? "border-primary/40 shadow-glossy-primary" : ""}`}>
                {p.popular && <span className="absolute -top-2.5 left-4 px-3 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold">POPULER</span>}
                <h4 className="font-bold">{p.name}</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">{p.note}</p>
                <p className="text-xl font-black text-primary mt-2 font-mono">{p.price}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-6">* Harga dapat berubah sesuai kondisi kendaraan. Konsultasi gratis via WhatsApp.</p>
        </div>
      </section>

      {/* ========== LIVE ANTRIAN ========== */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-primary/5 via-background to-background">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-primary flex items-center justify-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> LIVE</span>
            <h2 className="text-3xl lg:text-4xl font-black mt-2">Antrian Bengkel Hari Ini</h2>
            <p className="text-muted-foreground mt-2">Pantau antrian sebelum datang. Booking untuk skip antrian!</p>
          </div>
          <div className="max-w-2xl mx-auto glass-panel p-6 space-y-3">
            {[
              { no: 1, name: "B*** S.", vehicle: "Honda Vario 150", job: "Tune Up", status: "Dikerjakan", statusColor: "bg-blue-500 text-white" },
              { no: 2, name: "A*** W.", vehicle: "Toyota Avanza", job: "Servis Besar", status: "Dikerjakan", statusColor: "bg-blue-500 text-white" },
              { no: 3, name: "D*** P.", vehicle: "Yamaha NMAX", job: "Custom Bubut", status: "Antri", statusColor: "bg-amber-500/10 text-amber-600" },
              { no: 4, name: "R*** K.", vehicle: "Honda CBR 150R", job: "Ganti Knalpot", status: "Antri", statusColor: "bg-amber-500/10 text-amber-600" },
            ].map((q, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl border border-surface-border">
                <div className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center text-sm font-bold text-muted-foreground">{q.no}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{q.name} — {q.vehicle}</p>
                  <p className="text-[10px] text-muted-foreground">{q.job}</p>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${q.statusColor}`}>{q.status}</span>
              </div>
            ))}
            <div className="text-center pt-2">
              <p className="text-xs text-muted-foreground">Estimasi waktu tunggu: <span className="font-bold text-foreground">~45 menit</span></p>
              <a href="#booking" className="inline-flex items-center gap-1 text-xs text-primary font-bold mt-1 hover:underline">Booking untuk skip antrian <ArrowRight size={12} /></a>
            </div>
          </div>
        </div>
      </section>

      {/* ========== GALERI ========== */}
      <section id="galeri" className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Galeri</span>
            <h2 className="text-3xl lg:text-4xl font-black mt-2">Hasil Kerja Kami</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { title: "Custom Bubut Velg", sub: "Yamaha NMAX" },
              { title: "Bore Up 200cc", sub: "Honda PCX" },
              { title: "Full Exhaust System", sub: "Kawasaki Ninja 250" },
              { title: "Engine Dress Up", sub: "Honda Beat" },
              { title: "Bracket Caliper", sub: "Custom CNC" },
              { title: "Servis Besar", sub: "Toyota Avanza" },
              { title: "Nano Ceramic Coating", sub: "Yamaha R15" },
              { title: "CVT Upgrade", sub: "Honda Vario 160" },
            ].map((g, i) => (
              <div key={i} className="aspect-square bg-gradient-to-br from-surface-hover to-surface relative rounded-xl overflow-hidden group cursor-pointer border border-surface-border">
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                  <div className="text-white">
                    <p className="text-sm font-bold">{g.title}</p>
                    <p className="text-[10px] opacity-75">{g.sub}</p>
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/20">
                  <Wrench size={40} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== TESTIMONI ========== */}
      <section id="testimoni" className="py-16 lg:py-24 bg-surface-hover/30">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Testimoni</span>
            <h2 className="text-3xl lg:text-4xl font-black mt-2">Apa Kata Pelanggan Kami</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: "Budi Santoso", role: "Pelanggan Setia 3 Tahun", text: "Bengkel paling jujur dan transparan. Semua dikerjakan sesuai estimasi. Bisa pantau lewat WhatsApp juga!", rating: 5 },
              { name: "Anton Wijaya", role: "Owner Avanza", text: "Servis besar mobil di sini selalu puas hasilnya. Mekaniknya teliti dan garansi pekerjaan 30 hari.", rating: 5 },
              { name: "Doni Pratama", role: "Modifikasi NMAX", text: "Bubut velg presisi banget! Sesuai desain yang saya mau. Hasilnya rapi dan finishing perfect.", rating: 5 },
              { name: "Siti Nurhasanah", role: "Honda Beat Owner", text: "Tune up cepet, harga terjangkau, dikabarin detail via WA pas udah selesai. Top!", rating: 5 },
              { name: "Reza Kurniawan", role: "Rider CBR 150R", text: "Custom knalpot racing hasilnya mantap! Suara pas, power naik. Recommended buat modifikator.", rating: 5 },
              { name: "PT Maju Jaya Teknik", role: "Klien Korporat", text: "Kerjasama bubut shaft custom untuk mesin industri. Presisi dan on-time delivery.", rating: 5 },
            ].map((t, i) => (
              <div key={i} className="glass-panel p-5">
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: t.rating }, (_, j) => <Star key={j} size={14} className="fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{t.name.charAt(0)}</div>
                  <div>
                    <p className="text-sm font-bold">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== BOOKING ========== */}
      <section id="booking" className="py-16 lg:py-24">
        <div className="max-w-3xl mx-auto px-4 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Booking Online</span>
            <h2 className="text-3xl lg:text-4xl font-black mt-2">Reservasi Jadwal Servis</h2>
            <p className="text-muted-foreground mt-3">Isi form di bawah dan kami akan menghubungi via WhatsApp untuk konfirmasi.</p>
          </div>
          <div className="glass-panel p-6 lg:p-8 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Nama Lengkap *</label><input type="text" placeholder="Budi Santoso" className="w-full bg-background border border-surface-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">No. WhatsApp *</label><input type="tel" placeholder="08123456789" className="w-full bg-background border border-surface-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Jenis Kendaraan *</label><select className="w-full bg-background border border-surface-border rounded-xl px-4 py-2.5 text-sm focus:outline-none"><option>Motor Matic</option><option>Motor Sport</option><option>Motor Bebek</option><option>Mobil</option><option>Bubut Custom (Tanpa Kendaraan)</option></select></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Merek & Tipe</label><input type="text" placeholder="Honda Vario 150" className="w-full bg-background border border-surface-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Layanan yang Diinginkan *</label><select className="w-full bg-background border border-surface-border rounded-xl px-4 py-2.5 text-sm focus:outline-none"><option>Servis Rutin</option><option>Modifikasi</option><option>Jasa Bubut Custom</option><option>Express Service</option><option>Lainnya</option></select></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Tanggal Booking</label><input type="date" className="w-full bg-background border border-surface-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            </div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Keluhan / Catatan</label><textarea placeholder="Jelaskan keluhan atau request khusus..." rows={3} className="w-full bg-background border border-surface-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            <button className="w-full btn-glossy bg-primary text-white py-3.5 rounded-xl font-bold text-sm shadow-glossy-primary hover:shadow-glossy-primary-dark flex items-center justify-center gap-2">
              <Calendar size={18} /> Kirim Booking
            </button>
            <p className="text-[10px] text-muted-foreground text-center">Booking akan dikonfirmasi via WhatsApp dalam 15 menit pada jam kerja.</p>
          </div>
        </div>
      </section>

      {/* ========== KONTAK & LOKASI ========== */}
      <section id="kontak" className="py-16 lg:py-24 bg-surface-hover/30">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Kunjungi Kami</span>
              <h2 className="text-3xl font-black mt-2 mb-6">Lokasi & Jam Operasional</h2>
              <div className="space-y-4">
                <div className="flex gap-3"><MapPin size={20} className="text-primary shrink-0 mt-0.5" /><div><p className="font-medium">Jl. Kaliurang Km 10, Yogyakarta</p><p className="text-xs text-muted-foreground">Sebelah utara Indomaret, sebelum pertigaan Candi Gebang</p></div></div>
                <div className="flex gap-3"><Clock size={20} className="text-primary shrink-0 mt-0.5" /><div><p className="font-medium">Senin — Sabtu: 08:00 — 17:00</p><p className="text-xs text-muted-foreground">Minggu & Hari Besar: Tutup</p></div></div>
                <div className="flex gap-3"><Phone size={20} className="text-primary shrink-0 mt-0.5" /><div><p className="font-medium">0274-123456 / 0812-3456-7890</p><p className="text-xs text-muted-foreground">WhatsApp & Telepon</p></div></div>
                <div className="flex gap-3"><Mail size={20} className="text-primary shrink-0 mt-0.5" /><div><p className="font-medium">info@mmtracing.co.id</p><p className="text-xs text-muted-foreground">Email untuk kerjasama & penawaran</p></div></div>
              </div>
            </div>
            <div className="glass-panel overflow-hidden h-64 lg:h-auto flex items-center justify-center bg-surface-hover">
              <div className="text-center text-muted-foreground">
                <MapPin size={40} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">Google Maps</p>
                <p className="text-xs opacity-60">Peta akan ditampilkan di sini</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="bg-foreground text-background py-12">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-black">M</div>
                <span className="font-black text-lg">MM Tracing</span>
              </div>
              <p className="text-xs opacity-60 leading-relaxed">Bengkel servis, modifikasi, dan jasa bubut custom terpercaya di Yogyakarta. Berdiri sejak 2016.</p>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-3">Layanan</h4>
              <ul className="space-y-2 text-xs opacity-60">
                <li>Servis Rutin Motor & Mobil</li>
                <li>Modifikasi & Performance</li>
                <li>Jasa Bubut Custom CNC</li>
                <li>Detailing & Coating</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-3">Link</h4>
              <ul className="space-y-2 text-xs opacity-60">
                <li><a href="#layanan" className="hover:opacity-100">Layanan</a></li>
                <li><a href="#harga" className="hover:opacity-100">Harga</a></li>
                <li><a href="#booking" className="hover:opacity-100">Booking Online</a></li>
                <li><a href="#kontak" className="hover:opacity-100">Kontak</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-3">Jam Kerja</h4>
              <ul className="space-y-2 text-xs opacity-60">
                <li>Senin — Jumat: 08:00 — 17:00</li>
                <li>Sabtu: 08:00 — 15:00</li>
                <li>Minggu: Tutup</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between text-[10px] opacity-40">
            <p>© 2026 MM Tracing. All rights reserved.</p>
            <p>Built with ❤️ in Yogyakarta</p>
          </div>
        </div>
      </footer>

      {/* ========== FLOATING WHATSAPP ========== */}
      <a href="https://wa.me/62274123456?text=Halo%20MM%20Tracing%20saya%20ingin%20servis%20kendaraan" target="_blank"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform hover:bg-emerald-600">
        <MessageCircle size={26} />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-background animate-ping" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-background" />
      </a>
    </div>
  );
}
