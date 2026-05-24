"use client";

import { useState, useEffect, useRef, useCallback, type FormEvent } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Wrench, Cog, Hammer, Shield, Clock, Users, Star, ChevronRight,
  Phone, Mail, MapPin, Calendar, MessageCircle, ArrowRight, Check,
  Zap, Eye, Award, Target, ChevronDown, Home, Tag, List, Moon, Sun,
  Loader2, AlertCircle, CheckCircle2
} from "lucide-react";

const ICON_MAP: Record<string, any> = { Wrench, Cog, Hammer, Shield, Clock, Users, Star, Eye, Award, Zap, Target };

export interface LandingData {
  landing_header: { logoText: string; brandName: string; subtitle: string };
  landing_hero: { tagline: string; title: string; subtitle: string };
  landing_stats: { value: string; label: string }[];
  landing_services: { icon: string; title: string; desc: string; color: string }[];
  landing_usp: { icon: string; title: string; desc: string }[];
  landing_pricing_motor: { name: string; price: string; note: string; popular: boolean }[];
  landing_pricing_mobil: { name: string; price: string; note: string; popular: boolean }[];
  landing_pricing_bubut: { name: string; price: string; note: string; popular: boolean }[];
  landing_testimonials: { name: string; role: string; text: string; rating: number }[];
  landing_contact: { address: string; addressDetail: string; hours: string; hoursClosed: string; phone: string; email: string; whatsapp: string; mapsEmbed?: string };
  landing_footer: { description: string; hourWeekday: string; hourSaturday: string; hourSunday: string };
  landing_gallery: { title: string; sub: string; image?: string }[];
  BENGKEL_LOGO?: string;
}

export interface QueueData {
  antri: number;
  dikerjakan: number;
  total: number;
  queue: { noSpk: string; status: string; mode: string; progress: number; pelanggan: string; kendaraan: string | null; plat: string | null; mekanik: string | null }[];
}

// ========== HOOKS ==========

function useScrollAnimation() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); obs.unobserve(el); } },
      { threshold: 0.1, rootMargin: "0px 0px -60px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, isVisible };
}

function useCounter(end: number, shouldStart: boolean, duration = 2000) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!shouldStart) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration, shouldStart]);
  return count;
}

function parseStatValue(val: string): { num: number; suffix: string } {
  const match = val.match(/([\d,.]+)(.*)/);
  if (!match) return { num: 0, suffix: val };
  return { num: parseFloat(match[1].replace(/,/g, '')), suffix: match[2] };
}

// ========== SCROLL ANIMATED SECTION ==========
function AnimatedSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, isVisible } = useScrollAnimation();
  return (
    <div ref={ref} className={`transition-all duration-700 ease-out ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

// ========== GALLERY IMAGE WITH FALLBACK ==========
function GalleryImage({ src, alt }: { src?: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/20 group-hover:scale-110 transition-transform duration-300">
        <Wrench size={40} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
      onError={() => setFailed(true)}
    />
  );
}

// ========== LOADING SKELETON ==========
function LandingSkeleton() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      {/* Hero skeleton */}
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-6 px-4">
          <div className="h-6 w-48 bg-surface-hover rounded-full mx-auto" />
          <div className="h-12 w-96 max-w-full bg-surface-hover rounded-xl mx-auto" />
          <div className="h-6 w-72 max-w-full bg-surface-hover rounded-lg mx-auto" />
          <div className="flex gap-3 justify-center">
            <div className="h-12 w-40 bg-surface-hover rounded-xl" />
            <div className="h-12 w-40 bg-surface-hover rounded-xl" />
          </div>
        </div>
      </div>
      {/* Stats skeleton */}
      <div className="py-16 bg-primary/10">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="text-center space-y-2">
              <div className="h-8 w-16 bg-surface-hover rounded mx-auto" />
              <div className="h-4 w-24 bg-surface-hover rounded mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ========== MAIN COMPONENT ==========
interface LandingClientProps {
  initialData: LandingData | null;
  initialQueue: QueueData | null;
}

export default function LandingClient({ initialData, initialQueue }: LandingClientProps) {
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [activeTab, setActiveTab] = useState(0);
  const [activeQueueTab, setActiveQueueTab] = useState("Semua");
  const [data, setData] = useState<LandingData | null>(initialData);
  const [queueData, setQueueData] = useState<QueueData | null>(initialQueue);
  const [dataError, setDataError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => { setMounted(true); }, []);

  // Booking form
  const [bookingForm, setBookingForm] = useState({ nama: "", whatsapp: "", jenisKendaraan: "Motor Matic", merkTipe: "", platNomor: "", layanan: "Servis Rutin", tanggal: "", jamPreferensi: "", keluhan: "", _hp: "" });
  const [bookingStatus, setBookingStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [bookingMsg, setBookingMsg] = useState("");
  const [bookingStep, setBookingStep] = useState(1);
  const [waError, setWaError] = useState("");
  const todayStr = typeof window !== "undefined" ? new Date().toISOString().split("T")[0] : "";

  // Scroll-based nav + active section tracking
  useEffect(() => {
    const SECTIONS = ["booking", "kontak", "testimoni", "galeri", "harga", "layanan", "antrian", "home"];
    const onScroll = () => {
      setScrolled(window.scrollY > 50);
      const offset = 150;
      for (const id of SECTIONS) {
        if (id === "home") { setActiveSection("home"); break; }
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= offset && rect.bottom > offset) {
            setActiveSection(id); break;
          }
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToSection = useCallback((sectionId: string) => {
    if (sectionId === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const el = document.getElementById(sectionId);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: "smooth" });
    }
  }, []);

  // Client-side fetch only as fallback if SSR data is missing
  useEffect(() => {
    if (data) return;
    fetch("/api/v1/landing/content")
      .then(r => r.json())
      .then(res => { if (res.success) setData(res.data); else setDataError(true); })
      .catch(() => setDataError(true));
  }, [data]);

  // Auto-refresh queue every 30s
  useEffect(() => {
    const fetchQueue = () => {
      fetch("/api/v1/landing/queue")
        .then(r => r.json())
        .then(res => { if (res.success) setQueueData(res.data); })
        .catch(() => {});
    };
    // Initial fetch if no SSR data
    if (!queueData) fetchQueue();
    const iv = setInterval(fetchQueue, 30000);
    return () => clearInterval(iv);
  }, []);

  const validateWa = (v: string) => {
    const clean = v.replace(/[^0-9]/g, "");
    if (!clean) { setWaError(""); return; }
    if (!/^(08|628)[0-9]{8,12}$/.test(clean)) setWaError("Format: 08xx atau 628xx");
    else setWaError("");
  };

  const canGoStep2 = bookingForm.nama.trim().length >= 2 && /^(08|628)[0-9]{8,12}$/.test(bookingForm.whatsapp.replace(/[^0-9]/g, ""));
  const canGoStep3 = canGoStep2 && bookingForm.jenisKendaraan && bookingForm.layanan;

  const handleBookingSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canGoStep3) return;

    setBookingStatus("loading");
    try {
      const res = await fetch("/api/v1/landing/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingForm),
      });
      const json = await res.json();
      if (json.success) {
        setBookingStatus("success");
        setBookingMsg(`Booking #${json.data.id} berhasil! Kami akan menghubungi via WhatsApp.`);
        const waContact = data?.landing_contact?.whatsapp || "62274123456";
        const waMsg = encodeURIComponent(`Halo MMT Racing,\nSaya ${bookingForm.nama} baru saja booking online #${json.data.id}.\nLayanan: ${bookingForm.layanan}\nKendaraan: ${bookingForm.jenisKendaraan} ${bookingForm.merkTipe}\nTanggal: ${bookingForm.tanggal || 'Secepatnya'}\nMohon konfirmasinya. Terima kasih!`);
        setTimeout(() => {
          window.open(`https://wa.me/${waContact}?text=${waMsg}`, "_blank");
        }, 1500);
        setBookingForm({ nama: "", whatsapp: "", jenisKendaraan: "Motor Matic", merkTipe: "", platNomor: "", layanan: "Servis Rutin", tanggal: "", jamPreferensi: "", keluhan: "", _hp: "" });
        setBookingStep(1);
      } else {
        setBookingStatus("error");
        setBookingMsg(json.message || "Gagal mengirim booking");
      }
    } catch {
      setBookingStatus("error");
      setBookingMsg("Terjadi kesalahan. Silakan coba lagi.");
    }
  };

  // Show skeleton while data is loading (client-side fallback only)
  if (!data && !dataError) return <LandingSkeleton />;

  // Error state
  if (dataError && !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 px-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold">Gagal Memuat Halaman</h2>
          <p className="text-sm text-muted-foreground">Tidak dapat terhubung ke server. Silakan coba lagi.</p>
          <button onClick={() => window.location.reload()} className="btn-glossy bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-glossy-primary">
            Muat Ulang
          </button>
        </div>
      </div>
    );
  }

  // Stats counter hooks
  const statsAnim = useScrollAnimation();
  const stat0 = parseStatValue(data?.landing_stats?.[0]?.value || "10+");
  const stat1 = parseStatValue(data?.landing_stats?.[1]?.value || "5200+");
  const stat2 = parseStatValue(data?.landing_stats?.[2]?.value || "15800+");
  const stat3 = parseStatValue(data?.landing_stats?.[3]?.value || "4.9");
  const c0 = useCounter(stat0.num, statsAnim.isVisible);
  const c1 = useCounter(stat1.num, statsAnim.isVisible);
  const c2 = useCounter(stat2.num, statsAnim.isVisible);
  const c3 = useCounter(Math.round(stat3.num * 10), statsAnim.isVisible);
  const counters = [
    { value: `${c0}${stat0.suffix}`, label: data?.landing_stats?.[0]?.label || "Tahun Pengalaman", icon: Award },
    { value: `${c1.toLocaleString()}${stat1.suffix}`, label: data?.landing_stats?.[1]?.label || "Pelanggan Puas", icon: Users },
    { value: `${c2.toLocaleString()}${stat2.suffix}`, label: data?.landing_stats?.[2]?.label || "SPK Selesai", icon: Target },
    { value: `${(c3 / 10).toFixed(1)}${stat3.suffix}`, label: data?.landing_stats?.[3]?.label || "Rating Google", icon: Star },
  ];

  const hero = data?.landing_hero || { tagline: "Bengkel Terpercaya Sejak 2016", title: "Servis Berkualitas, Modifikasi Presisi Tinggi", subtitle: "Spesialis servis rutin, modifikasi, dan jasa bubut custom untuk motor & mobil." };
  const services = data?.landing_services || [];
  const usps = data?.landing_usp || [];
  const testimonials = data?.landing_testimonials || [];
  const contact = data?.landing_contact || { address: "", addressDetail: "", hours: "", hoursClosed: "", phone: "", email: "", whatsapp: "62274123456", mapsEmbed: "" };
  const footer = data?.landing_footer || { description: "", hourWeekday: "", hourSaturday: "", hourSunday: "" };
  const header = data?.landing_header || { logoText: "M", brandName: "MMT Racing", subtitle: "Workshop & Custom Fabrication" };
  const gallery = data?.landing_gallery || [];
  const pricingTabs = [data?.landing_pricing_motor || [], data?.landing_pricing_mobil || [], data?.landing_pricing_bubut || []];
  const titleParts = hero.title.split(/(Modifikasi)/);

  const inputCls = "w-full bg-background border border-surface-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow";

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ========== NAVBAR (Top) ========== */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-background/90 backdrop-blur-xl border-b border-surface-border shadow-sm" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            {data?.BENGKEL_LOGO ? (
              <img src={data.BENGKEL_LOGO} alt={header.brandName} className="h-9 w-auto rounded-md object-contain bg-white/10" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-black text-lg shadow-glossy-primary">{header.logoText}</div>
            )}
            <div>
              <span className="font-black text-lg tracking-tight">{header.brandName}</span>
              <span className="hidden sm:block text-[9px] text-muted-foreground -mt-1">{header.subtitle}</span>
            </div>
          </Link>
          <div className="hidden lg:flex items-center gap-6">
            {["Layanan", "Harga", "Antrian", "Galeri", "Testimoni", "Kontak"].map(item => {
              const isActive = activeSection === item.toLowerCase();
              return (
                <a key={item} href={`#${item.toLowerCase()}`} className={`text-sm font-medium transition-colors relative ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  {item}
                  {isActive && <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full" />}
                </a>
              );
            })}
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="p-2 rounded-lg hover:bg-surface-hover transition-colors text-muted-foreground" aria-label="Toggle tema gelap/terang">
              {mounted ? (theme === "dark" ? <Sun size={16} /> : <Moon size={16} />) : <Moon size={16} />}
            </button>
            <a href="#booking" className="btn-glossy bg-primary text-white px-5 py-2 rounded-xl text-sm font-bold shadow-glossy-primary hover:shadow-glossy-primary-dark">Booking Online</a>
          </div>
          {/* Mobile: dark mode + login */}
          <div className="lg:hidden flex items-center gap-2">
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="p-2 rounded-lg hover:bg-surface-hover transition-colors text-muted-foreground" aria-label="Toggle tema gelap/terang" suppressHydrationWarning>
              {mounted ? (theme === "dark" ? <Sun size={18} /> : <Moon size={18} />) : <Moon size={18} />}
            </button>
            <Link href="/login" className="text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-surface-border">Login</Link>
          </div>
        </div>
      </nav>

      {/* ========== HERO ========== */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Gradient base */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5 dark:to-primary/15" />

        {/* Floating gradient orbs */}
        <div className="hero-orb-1 absolute top-[10%] right-[15%] w-80 h-80 lg:w-[600px] lg:h-[600px] bg-primary/20 dark:bg-primary/30 rounded-full blur-[80px] lg:blur-[120px]" />
        <div className="hero-orb-2 absolute bottom-[15%] left-[5%] w-72 h-72 lg:w-[450px] lg:h-[450px] bg-primary/15 dark:bg-primary/25 rounded-full blur-[60px] lg:blur-[100px]" />
        <div className="hidden lg:block hero-orb-3 absolute top-[45%] left-[55%] w-56 h-56 lg:w-80 lg:h-80 bg-blue-500/10 dark:bg-blue-400/20 rounded-full blur-[60px]" />

        {/* Center glow pulse */}
        <div className="hero-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] lg:w-[700px] lg:h-[700px] bg-primary/10 dark:bg-primary/20 rounded-full blur-[100px]" />

        {/* Rotating geometric ring — desktop only for perf */}
        <div className="hidden lg:block hero-ring absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] lg:w-[800px] lg:h-[800px] opacity-[0.12] dark:opacity-[0.18]">
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary/50" />
          <div className="absolute inset-8 rounded-full border border-primary/30" />
          <div className="absolute inset-20 rounded-full border border-dashed border-primary/20" />
        </div>

        {/* Animated dot grid — desktop only */}
        <div className="hidden lg:block hero-grid absolute inset-0 opacity-[0.06] dark:opacity-[0.10]" style={{ backgroundImage: "radial-gradient(circle, currentColor 1.2px, transparent 1.2px)", backgroundSize: "36px 36px" }} />

        {/* Floating particles — desktop only for perf */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden hidden lg:block">
          <div className="hero-particle-1 absolute top-[25%] left-[12%] w-3 h-3 bg-primary/60 dark:bg-primary/80 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
          <div className="hero-particle-2 absolute top-[55%] right-[18%] w-2 h-2 bg-primary/50 dark:bg-primary/70 rounded-full shadow-[0_0_6px_rgba(239,68,68,0.3)]" />
          <div className="hero-particle-3 absolute top-[40%] left-[38%] w-1.5 h-1.5 bg-foreground/30 dark:bg-foreground/50 rounded-full" />
          <div className="hero-particle-4 absolute top-[20%] right-[30%] w-3.5 h-3.5 bg-primary/35 dark:bg-primary/55 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.3)]" />
          <div className="hero-particle-5 absolute bottom-[30%] left-[50%] w-2 h-2 bg-blue-500/40 dark:bg-blue-400/60 rounded-full shadow-[0_0_6px_rgba(59,130,246,0.3)]" />
          <div className="hero-particle-6 absolute top-[65%] left-[25%] w-2.5 h-2.5 bg-primary/45 dark:bg-primary/65 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.3)]" />
          <div className="hero-particle-7 absolute top-[35%] right-[12%] w-1.5 h-1.5 bg-amber-500/30 dark:bg-amber-400/50 rounded-full" />
        </div>

        {/* Soft edge vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_50%,var(--background)_90%)]" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center py-32">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-6 animate-in fade-in duration-700">
            <Zap size={12} /> {hero.tagline}
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight leading-[1.1] mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {titleParts.map((part, i) => part === "Modifikasi" ? <span key={i} className="text-primary">{part}</span> : <span key={i}>{part}</span>)}
          </h1>
          <p className="text-base lg:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">{hero.subtitle}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <a href="#booking" className="w-full sm:w-auto btn-glossy bg-primary text-white px-8 py-3.5 rounded-xl font-bold text-sm shadow-glossy-primary hover:shadow-glossy-primary-dark flex items-center justify-center gap-2">
              <Calendar size={18} /> Booking Online
            </a>
            <a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm bg-emerald-500 text-white shadow-lg hover:bg-emerald-600 transition-colors">
              <MessageCircle size={18} /> Chat WhatsApp
            </a>
          </div>
          {/* Live queue badge */}
          <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-hover border border-surface-border text-xs animate-in fade-in duration-700 delay-500">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            {queueData && queueData.total > 0 ? (
              <span className="text-muted-foreground">
                <b className="text-foreground">{queueData.dikerjakan}</b> sedang dikerjakan · <b className="text-foreground">{queueData.antri}</b> antri
              </span>
            ) : (
              <span className="text-muted-foreground">Bengkel siap melayani — tidak ada antrian</span>
            )}
            <a href="#antrian" className="text-primary font-medium hover:underline">Lihat →</a>
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 text-muted-foreground animate-in fade-in duration-700 delay-500">
            <ChevronDown size={20} className="animate-bounce" />
            <span className="text-xs">Scroll untuk eksplorasi</span>
          </div>
        </div>
      </section>

      {/* ========== STATS ========== */}
      <section ref={statsAnim.ref} className="relative py-16 lg:py-20 bg-gradient-to-r from-primary to-primary/80">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {counters.map((s, i) => (
              <div key={i} className={`text-center text-white transition-all duration-700 ${statsAnim.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${i * 150}ms` }}>
                <s.icon size={28} className="mx-auto mb-2 opacity-60" />
                <p className="text-3xl lg:text-4xl font-black">{s.value}</p>
                <p className="text-xs lg:text-sm opacity-80 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== LIVE ANTRIAN ========== */}
      <section id="antrian" className="py-16 lg:py-24 bg-surface-hover/30">
        <AnimatedSection>
          <div className="max-w-7xl mx-auto px-4 lg:px-8">
            <div className="text-center mb-10">
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Live Antrian</span>
              <h2 className="text-3xl lg:text-4xl font-black mt-2">Status Bengkel Saat Ini</h2>
              <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Data real-time langsung dari sistem. Cek antrian sebelum datang ke bengkel.</p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto mb-8">
              <div className="glass-panel p-4 text-center">
                <p className="text-2xl font-black text-amber-500">{queueData?.antri ?? 0}</p>
                <p className="text-[10px] text-muted-foreground font-medium mt-1">Antri</p>
              </div>
              <div className="glass-panel p-4 text-center">
                <p className="text-2xl font-black text-blue-500">{queueData?.dikerjakan ?? 0}</p>
                <p className="text-[10px] text-muted-foreground font-medium mt-1">Dikerjakan</p>
              </div>
              <div className="glass-panel p-4 text-center">
                <p className="text-2xl font-black text-foreground">{queueData?.total ?? 0}</p>
                <p className="text-[10px] text-muted-foreground font-medium mt-1">Total Aktif</p>
              </div>
            </div>

            {/* Category filter */}
            <div className="flex flex-wrap justify-center gap-1 mb-6 bg-surface-hover/50 rounded-xl border border-surface-border p-1 max-w-fit mx-auto">
              {["Semua", "Servis Harian", "Modifikasi", "Bubut"].map((t) => (
                <button key={t} onClick={() => setActiveQueueTab(t)} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeQueueTab === t ? "bg-primary text-white shadow-glossy-primary" : "text-muted-foreground hover:bg-surface"}`}>
                  {t}
                </button>
              ))}
            </div>

            {queueData && (
              <>
                {queueData.queue.length > 0 ? (
                  <>
                    <div className="max-w-2xl mx-auto space-y-2">
                    {queueData.queue
                      .filter((q) => {
                        if (activeQueueTab === "Semua") return true;
                        if (activeQueueTab === "Servis Harian") return q.mode?.toLowerCase().includes("servis") || q.mode?.toLowerCase().includes("harian");
                        if (activeQueueTab === "Modifikasi") return q.mode?.toLowerCase().includes("modif");
                        if (activeQueueTab === "Bubut") return q.mode?.toLowerCase().includes("bubut");
                        return true;
                      })
                      .map((q, i) => (
                      <div key={i} className="glass-panel px-4 py-3 flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${q.status === "dikerjakan" ? "bg-blue-500 animate-pulse" : "bg-amber-500"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-mono font-bold text-xs">{q.noSpk}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${q.status === "dikerjakan" ? "bg-blue-500/15 text-blue-500" : "bg-amber-500/15 text-amber-500"}`}>
                              {q.status === "dikerjakan" ? "🔧 Dikerjakan" : "⏳ Antri"}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-border text-muted-foreground font-medium">{q.mode}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {q.pelanggan} {q.kendaraan ? `· ${q.kendaraan}` : ""} {q.plat ? `(${q.plat})` : ""}
                          </p>
                        </div>
                        {q.status === "dikerjakan" && (
                          <div className="text-right shrink-0">
                            <div className="w-16 h-1.5 bg-surface-border rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${q.progress}%` }} />
                            </div>
                            <span className="text-[10px] text-muted-foreground">{q.progress}%</span>
                          </div>
                        )}
                        {q.mekanik && <span className="text-[10px] text-muted-foreground hidden sm:block shrink-0">{q.mekanik}</span>}
                      </div>
                    ))}
                    
                    {queueData.queue.filter((q) => {
                        if (activeQueueTab === "Semua") return true;
                        if (activeQueueTab === "Servis Harian") return q.mode?.toLowerCase().includes("servis") || q.mode?.toLowerCase().includes("harian");
                        if (activeQueueTab === "Modifikasi") return q.mode?.toLowerCase().includes("modif");
                        if (activeQueueTab === "Bubut") return q.mode?.toLowerCase().includes("bubut");
                        return true;
                    }).length === 0 && (
                      <div className="glass-panel p-6 text-center text-sm text-muted-foreground">
                        Tidak ada antrian untuk kategori {activeQueueTab} saat ini.
                      </div>
                    )}
                  </div>
                  <p className="text-center text-[10px] text-muted-foreground mt-4">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-pulse mr-1" />
                    Update otomatis setiap 30 detik · Nama pelanggan disamarkan untuk privasi
                  </p>
                </>
                ) : (
                  <div className="max-w-md mx-auto glass-panel p-8 text-center mt-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                      <CheckCircle2 size={32} className="text-emerald-500" />
                    </div>
                    <h3 className="font-bold text-lg">Bengkel Siap Melayani!</h3>
                    <p className="text-sm text-muted-foreground mt-2">Saat ini tidak ada total antrian. Anda bisa langsung datang atau booking online.</p>
                    <a href="#booking" className="inline-flex items-center gap-2 mt-4 btn-glossy bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-glossy-primary">
                      <Calendar size={16} /> Booking Sekarang
                    </a>
                  </div>
                )}
              </>
            )}
          </div>
        </AnimatedSection>
      </section>

      {/* ========== LAYANAN ========== */}
      <section id="layanan" className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <AnimatedSection className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Layanan Kami</span>
            <h2 className="text-3xl lg:text-4xl font-black mt-2">Solusi Lengkap untuk Kendaraan Anda</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Dari perawatan rutin hingga modifikasi presisi tinggi — semua dikerjakan di satu tempat.</p>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {services.map((svc, i) => {
              const IconComp = ICON_MAP[svc.icon] || Wrench;
              return (
                <AnimatedSection key={i} delay={i * 100}>
                  <div className="group glass-panel p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${svc.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                      <IconComp size={22} className="text-white" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">{svc.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{svc.desc}</p>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========== KEUNGGULAN ========== */}
      <section className="py-16 lg:py-24 bg-surface-hover/30">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <AnimatedSection className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Kenapa MMT Racing?</span>
            <h2 className="text-3xl lg:text-4xl font-black mt-2">Pilihan Tepat untuk Kendaraan Anda</h2>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {usps.map((usp, i) => {
              const IconComp = ICON_MAP[usp.icon] || Shield;
              const colors = ["text-emerald-500 bg-emerald-500/10", "text-blue-500 bg-blue-500/10", "text-amber-500 bg-amber-500/10", "text-purple-500 bg-purple-500/10"];
              return (
                <AnimatedSection key={i} delay={i * 100}>
                  <div className="glass-panel p-5 text-center hover:shadow-md transition-shadow h-full">
                    <div className={`w-14 h-14 rounded-2xl ${colors[i % 4]} flex items-center justify-center mx-auto mb-3`}>
                      <IconComp size={24} />
                    </div>
                    <h4 className="font-bold mb-1">{usp.title}</h4>
                    <p className="text-xs text-muted-foreground">{usp.desc}</p>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========== HARGA ========== */}
      <section id="harga" className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <AnimatedSection className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Daftar Harga</span>
            <h2 className="text-3xl lg:text-4xl font-black mt-2">Harga Transparan, Tanpa Kejutan</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Harga sudah termasuk jasa. Sparepart original.</p>
          </AnimatedSection>
          <AnimatedSection>
            <div className="flex justify-center gap-1 mb-8 bg-surface-hover rounded-xl border border-surface-border p-1 max-w-md mx-auto">
              {["Motor", "Mobil", "Bubut"].map((t, i) => (
                <button key={i} onClick={() => setActiveTab(i)} className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === i ? "bg-primary text-white shadow-glossy-primary" : "text-muted-foreground hover:bg-surface"}`}>{t}</button>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {(pricingTabs[activeTab] || []).map((p, i) => (
                <div key={i} className={`glass-panel p-5 relative transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${p.popular ? "border-primary/40 shadow-glossy-primary" : ""}`}>
                  {p.popular && <span className="absolute -top-2.5 left-4 px-3 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold">POPULER</span>}
                  <h4 className="font-bold">{p.name}</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{p.note}</p>
                  <p className="text-xl font-black text-primary mt-2 font-mono">{p.price}</p>
                </div>
              ))}
            </div>
          </AnimatedSection>
          <p className="text-center text-xs text-muted-foreground mt-6">* Harga dapat berubah sesuai kondisi kendaraan. Konsultasi gratis via WhatsApp.</p>
        </div>
      </section>

      {/* ========== GALERI ========== */}
      <section id="galeri" className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <AnimatedSection className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Galeri</span>
            <h2 className="text-3xl lg:text-4xl font-black mt-2">Hasil Kerja Kami</h2>
          </AnimatedSection>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {gallery.map((g, i) => (
              <AnimatedSection key={i} delay={i * 80}>
                <div className="aspect-square bg-gradient-to-br from-surface-hover to-surface relative rounded-xl overflow-hidden group cursor-pointer border border-surface-border">
                  <GalleryImage src={g.image} alt={g.title} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                    <div className="text-white"><p className="text-sm font-bold">{g.title}</p><p className="text-[10px] opacity-75">{g.sub}</p></div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ========== TESTIMONI ========== */}
      <section id="testimoni" className="py-16 lg:py-24 bg-surface-hover/30">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <AnimatedSection className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Testimoni</span>
            <h2 className="text-3xl lg:text-4xl font-black mt-2">Apa Kata Pelanggan Kami</h2>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {testimonials.map((t, i) => (
              <AnimatedSection key={i} delay={i * 100}>
                <div className="glass-panel p-5 h-full flex flex-col">
                  <div className="flex gap-1 mb-3">
                    {Array.from({ length: t.rating }, (_, j) => <Star key={j} size={14} className="fill-amber-400 text-amber-400" />)}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">&quot;{t.text}&quot;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{t.name.charAt(0)}</div>
                    <div><p className="text-sm font-bold">{t.name}</p><p className="text-[10px] text-muted-foreground">{t.role}</p></div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ========== BOOKING FUNGSIONAL (Multi-Step Wizard) ========== */}
      <section id="booking" className="py-16 lg:py-24">
        <div className="max-w-3xl mx-auto px-4 lg:px-8">
          <AnimatedSection className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Booking Online</span>
            <h2 className="text-3xl lg:text-4xl font-black mt-2">Reservasi Jadwal Servis</h2>
            <p className="text-muted-foreground mt-3">3 langkah mudah. Kami akan menghubungi via WhatsApp untuk konfirmasi.</p>
          </AnimatedSection>
          <AnimatedSection>
            {bookingStatus === "success" ? (
              <div className="glass-panel p-8 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <CheckCircle2 size={32} className="text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold">Booking Berhasil!</h3>
                <p className="text-sm text-muted-foreground">{bookingMsg}</p>
                <p className="text-xs text-muted-foreground">Anda akan diarahkan ke WhatsApp untuk konfirmasi...</p>
                <button onClick={() => { setBookingStatus("idle"); setBookingStep(1); }} className="text-sm text-primary font-medium hover:underline">Buat booking baru</button>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="glass-panel p-6 lg:p-8 space-y-5">
                {/* Honeypot (hidden) */}
                <input type="text" name="_hp" value={bookingForm._hp} onChange={e => setBookingForm({ ...bookingForm, _hp: e.target.value })} className="hidden" tabIndex={-1} autoComplete="off" />

                {bookingStatus === "error" && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
                    <AlertCircle size={16} /> {bookingMsg}
                  </div>
                )}

                {/* Progress Steps */}
                <div className="flex items-center justify-center gap-2 mb-2">
                  {[{n:1,l:"Data Diri"},{n:2,l:"Kendaraan"},{n:3,l:"Konfirmasi"}].map((s,i) => (
                    <div key={s.n} className="flex items-center gap-1.5">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                        bookingStep >= s.n ? "bg-primary text-white border-primary" : "border-surface-border text-muted-foreground"
                      }`}>{bookingStep > s.n ? <Check size={14} /> : s.n}</div>
                      <span className={`text-[10px] ${bookingStep >= s.n ? "font-bold text-primary" : "text-muted-foreground"}`}>{s.l}</span>
                      {i < 2 && <div className={`w-6 sm:w-10 h-0.5 ${bookingStep > s.n ? "bg-primary" : "bg-surface-border"}`} />}
                    </div>
                  ))}
                </div>

                {/* Step 1: Data Diri */}
                {bookingStep === 1 && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Nama Lengkap *</label>
                        <input type="text" required value={bookingForm.nama} onChange={e => setBookingForm({ ...bookingForm, nama: e.target.value })} placeholder="Budi Santoso" className={inputCls} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">No. WhatsApp *</label>
                        <input type="tel" required value={bookingForm.whatsapp} onChange={e => { setBookingForm({ ...bookingForm, whatsapp: e.target.value }); validateWa(e.target.value); }} placeholder="08123456789" className={`${inputCls} ${waError ? "ring-2 ring-red-500/50" : ""}`} />
                        {waError && <p className="text-[10px] text-red-500">{waError}</p>}
                      </div>
                    </div>
                    <button type="button" disabled={!canGoStep2} onClick={() => setBookingStep(2)}
                      className="w-full btn-glossy bg-primary text-white py-3 rounded-xl font-bold text-sm shadow-glossy-primary hover:shadow-glossy-primary-dark flex items-center justify-center gap-2 disabled:opacity-40">
                      Lanjut: Data Kendaraan <ArrowRight size={16} />
                    </button>
                  </div>
                )}

                {/* Step 2: Kendaraan & Layanan */}
                {bookingStep === 2 && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Jenis Kendaraan *</label>
                        <select value={bookingForm.jenisKendaraan} onChange={e => setBookingForm({ ...bookingForm, jenisKendaraan: e.target.value })} className={inputCls}>
                          <option>Motor Matic</option><option>Motor Sport</option><option>Motor Bebek</option><option>Mobil</option><option>Bubut Custom (Tanpa Kendaraan)</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Merek &amp; Tipe</label>
                        <input type="text" value={bookingForm.merkTipe} onChange={e => setBookingForm({ ...bookingForm, merkTipe: e.target.value })} placeholder="Honda Vario 150" className={inputCls} />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">No. Plat</label>
                        <input type="text" value={bookingForm.platNomor} onChange={e => setBookingForm({ ...bookingForm, platNomor: e.target.value.toUpperCase() })} placeholder="AB 1234 CD" className={`${inputCls} font-mono uppercase`} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Layanan *</label>
                        <select value={bookingForm.layanan} onChange={e => setBookingForm({ ...bookingForm, layanan: e.target.value })} className={inputCls}>
                          <option>Servis Rutin</option><option>Modifikasi</option><option>Jasa Bubut Custom</option><option>Express Service</option><option>Lainnya</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Tanggal Booking</label>
                        <input type="date" min={todayStr} value={bookingForm.tanggal} onChange={e => setBookingForm({ ...bookingForm, tanggal: e.target.value })} className={inputCls} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Jam Preferensi</label>
                        <select value={bookingForm.jamPreferensi} onChange={e => setBookingForm({ ...bookingForm, jamPreferensi: e.target.value })} className={inputCls}>
                          <option value="">Fleksibel</option>
                          {["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00"].map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Keluhan / Catatan</label>
                      <textarea value={bookingForm.keluhan} onChange={e => setBookingForm({ ...bookingForm, keluhan: e.target.value })} placeholder="Jelaskan keluhan atau request khusus..." rows={3} className={inputCls} />
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setBookingStep(1)} className="px-5 py-3 rounded-xl text-sm font-medium border border-surface-border hover:bg-surface-hover transition-colors">Kembali</button>
                      <button type="button" disabled={!canGoStep3} onClick={() => setBookingStep(3)}
                        className="flex-1 btn-glossy bg-primary text-white py-3 rounded-xl font-bold text-sm shadow-glossy-primary hover:shadow-glossy-primary-dark flex items-center justify-center gap-2 disabled:opacity-40">
                        Lanjut: Konfirmasi <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Konfirmasi & Kirim */}
                {bookingStep === 3 && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="bg-surface-hover/50 rounded-xl p-4 space-y-2.5 border border-surface-border">
                      <p className="text-xs font-bold text-primary uppercase tracking-wider">Ringkasan Booking</p>
                      {[
                        ["Nama", bookingForm.nama],
                        ["WhatsApp", bookingForm.whatsapp],
                        ["Kendaraan", `${bookingForm.jenisKendaraan}${bookingForm.merkTipe ? " · " + bookingForm.merkTipe : ""}`],
                        ["No. Plat", bookingForm.platNomor || "—"],
                        ["Layanan", bookingForm.layanan],
                        ["Tanggal", bookingForm.tanggal || "Secepatnya"],
                        ["Jam", bookingForm.jamPreferensi || "Fleksibel"],
                        ["Keluhan", bookingForm.keluhan || "—"],
                      ].map(([label, val], i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium text-right max-w-[60%] truncate">{val}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setBookingStep(2)} className="px-5 py-3 rounded-xl text-sm font-medium border border-surface-border hover:bg-surface-hover transition-colors">Ubah</button>
                      <button type="submit" disabled={bookingStatus === "loading"}
                        className="flex-1 btn-glossy bg-primary text-white py-3.5 rounded-xl font-bold text-sm shadow-glossy-primary hover:shadow-glossy-primary-dark flex items-center justify-center gap-2 disabled:opacity-60">
                        {bookingStatus === "loading" ? <><Loader2 size={18} className="animate-spin" /> Mengirim...</> : <><Calendar size={18} /> Konfirmasi &amp; Kirim Booking</>}
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center">Booking akan dikonfirmasi via WhatsApp dalam 15 menit pada jam kerja.</p>
                  </div>
                )}
              </form>
            )}
          </AnimatedSection>
        </div>
      </section>

      {/* ========== KONTAK & LOKASI ========== */}
      <section id="kontak" className="py-16 lg:py-24 bg-surface-hover/30">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8">
            <AnimatedSection>
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Kunjungi Kami</span>
              <h2 className="text-3xl font-black mt-2 mb-6">Lokasi &amp; Jam Operasional</h2>
              <div className="space-y-4">
                <div className="flex gap-3"><MapPin size={20} className="text-primary shrink-0 mt-0.5" /><div><p className="font-medium">{contact.address}</p><p className="text-xs text-muted-foreground">{contact.addressDetail}</p></div></div>
                <div className="flex gap-3"><Clock size={20} className="text-primary shrink-0 mt-0.5" /><div><p className="font-medium">{contact.hours}</p><p className="text-xs text-muted-foreground">{contact.hoursClosed}</p></div></div>
                <div className="flex gap-3"><Phone size={20} className="text-primary shrink-0 mt-0.5" /><div><p className="font-medium">{contact.phone}</p><p className="text-xs text-muted-foreground">WhatsApp &amp; Telepon</p></div></div>
                <div className="flex gap-3"><Mail size={20} className="text-primary shrink-0 mt-0.5" /><div><p className="font-medium">{contact.email}</p><p className="text-xs text-muted-foreground">Email untuk kerjasama &amp; penawaran</p></div></div>
              </div>
            </AnimatedSection>
            <AnimatedSection delay={200}>
              {contact.mapsEmbed ? (
                <div className="glass-panel overflow-hidden h-64 lg:h-full rounded-xl" dangerouslySetInnerHTML={{ __html: contact.mapsEmbed }} />
              ) : (
                <div className="glass-panel overflow-hidden h-64 lg:h-auto flex items-center justify-center bg-surface-hover rounded-xl">
                  <div className="text-center text-muted-foreground">
                    <MapPin size={40} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">Google Maps</p>
                    <p className="text-xs opacity-60">Atur embed peta di Admin &gt; Settings &gt; Landing</p>
                  </div>
                </div>
              )}
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="bg-foreground text-background py-12">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-black">{header.logoText}</div>
                <span className="font-black text-lg">{header.brandName}</span>
              </div>
              <p className="text-xs opacity-60 leading-relaxed">{footer.description}</p>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-3">Layanan</h4>
              <ul className="space-y-2 text-xs opacity-60">
                <li>Servis Rutin Motor &amp; Mobil</li><li>Modifikasi &amp; Performance</li><li>Jasa Bubut Custom CNC</li><li>Detailing &amp; Coating</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-3">Link</h4>
              <ul className="space-y-2 text-xs opacity-60">
                <li><a href="#layanan" className="hover:opacity-100">Layanan</a></li><li><a href="#harga" className="hover:opacity-100">Harga</a></li><li><a href="#booking" className="hover:opacity-100">Booking Online</a></li><li><a href="#kontak" className="hover:opacity-100">Kontak</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-3">Jam Kerja</h4>
              <ul className="space-y-2 text-xs opacity-60"><li>{footer.hourWeekday}</li><li>{footer.hourSaturday}</li><li>{footer.hourSunday}</li></ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between text-[10px] opacity-40">
            <p>© 2026 MMT Racing. All rights reserved.</p>
            <p>Built with ❤️ in Yogyakarta</p>
          </div>
        </div>
      </footer>

      {/* ========== FLOATING WHATSAPP ========== */}
      <a href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent("Halo MMT Racing, saya ingin servis kendaraan")}`} target="_blank" rel="noopener noreferrer"
        aria-label="Chat WhatsApp"
        className="fixed bottom-28 lg:bottom-6 right-4 lg:right-6 z-40 w-12 h-12 lg:w-14 lg:h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform hover:bg-emerald-600">
        <MessageCircle size={22} className="lg:hidden" />
        <MessageCircle size={26} className="hidden lg:block" />
        <span className="absolute -top-1 -right-1 w-3 h-3 lg:w-4 lg:h-4 bg-primary rounded-full border-2 border-background animate-ping" />
        <span className="absolute -top-1 -right-1 w-3 h-3 lg:w-4 lg:h-4 bg-primary rounded-full border-2 border-background" />
      </a>

      {/* ========== MOBILE BOTTOM NAV (iOS-style) ========== */}
      <div className="fixed bottom-4 left-3 right-3 z-50 lg:hidden safe-bottom">
        <nav className="bg-background/70 backdrop-blur-2xl border border-surface-border/50 rounded-[20px] shadow-[0_8px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)] px-1 py-1 flex items-center justify-around gap-0.5" aria-label="Navigasi utama mobile">
          {[
            { icon: Home, label: "Home", id: "home" },
            { icon: Wrench, label: "Layanan", id: "layanan" },
            { icon: List, label: "Antrian", id: "antrian" },
            { icon: Tag, label: "Harga", id: "harga" },
          ].map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button key={item.id} onClick={() => scrollToSection(item.id)}
                aria-label={item.label}
                className={`relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all duration-300 active:scale-90 ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}>
                {isActive && <div className="absolute inset-0 bg-primary/10 dark:bg-primary/20 rounded-2xl transition-all duration-300" />}
                <item.icon size={20} strokeWidth={isActive ? 2.2 : 1.6} className="relative z-10" />
                <span className={`text-[9px] relative z-10 ${isActive ? "font-bold" : "font-medium"}`}>{item.label}</span>
              </button>
            );
          })}

          {/* Booking */}
          {(() => {
            const isActive = activeSection === "booking";
            return (
              <button onClick={() => scrollToSection("booking")}
                aria-label="Booking"
                className={`relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all duration-300 active:scale-90 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}>
                {isActive && <div className="absolute inset-0 bg-primary/10 dark:bg-primary/20 rounded-2xl transition-all duration-300" />}
                <Calendar size={20} strokeWidth={isActive ? 2.2 : 1.6} className="relative z-10" />
                <span className={`text-[9px] relative z-10 ${isActive ? "font-bold" : "font-medium"}`}>Booking</span>
              </button>
            );
          })()}
        </nav>
      </div>
    </div>
  );
}
