"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Wrench, Moon, Sun, Home, Tag, List, Calendar,
  MessageCircle, AlertCircle,
} from "lucide-react";

// Types (re-exported for page.tsx backward compat)
import type { LandingData, QueueData, ContactData, HeaderData } from "./types";
export type { LandingData, QueueData };

// UI
import LandingSkeleton from "./ui/LandingSkeleton";
import WaveDivider from "./ui/WaveDivider";

// Sections
import HeroSection from "./sections/HeroSection";
import StatsBar from "./sections/StatsBar";
import QueueSection from "./sections/QueueSection";
import ServicesSection from "./sections/ServicesSection";
import USPSection from "./sections/USPSection";
import PricingSection from "./sections/PricingSection";
import GallerySection from "./sections/GallerySection";
import TestimonialsSection from "./sections/TestimonialsSection";
import BookingSection from "./sections/BookingSection";
import ContactSection from "./sections/ContactSection";
import FAQSection from "./sections/FAQSection";
import FooterSection from "./sections/FooterSection";

// ========== NAVBAR ==========
function Navbar({
  scrolled, activeSection, header, logo, mounted, theme, setTheme,
}: {
  scrolled: boolean; activeSection: string; header: HeaderData;
  logo?: string; mounted: boolean; theme?: string; setTheme: (t: string) => void;
}) {
  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-background/90 backdrop-blur-xl border-b border-surface-border shadow-sm" : "bg-transparent"}`}>
      <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          {logo ? (
            <img src={logo} alt={header.brandName} className="h-9 w-auto rounded-md object-contain bg-white/10" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-black text-lg shadow-glossy-primary">{header.logoText}</div>
          )}
          <div>
            <span className="font-black text-lg tracking-tight">{header.brandName}</span>
            <span className="hidden sm:block text-[9px] text-muted-foreground -mt-1">{header.subtitle}</span>
          </div>
        </Link>
        <div className="hidden lg:flex items-center gap-6">
          {["Layanan", "Harga", "Antrian", "Galeri", "Testimoni", "FAQ", "Kontak"].map((item) => {
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
        {/* Mobile */}
        <div className="lg:hidden flex items-center gap-2">
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="p-2 rounded-lg hover:bg-surface-hover transition-colors text-muted-foreground" aria-label="Toggle tema gelap/terang" suppressHydrationWarning>
            {mounted ? (theme === "dark" ? <Sun size={18} /> : <Moon size={18} />) : <Moon size={18} />}
          </button>
          <Link href="/login" className="text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-surface-border">Login</Link>
        </div>
      </div>
    </nav>
  );
}

// ========== MOBILE BOTTOM NAV ==========
function MobileBottomNav({ activeSection, scrollToSection }: { activeSection: string; scrollToSection: (id: string) => void }) {
  const items = [
    { icon: Home, label: "Home", id: "home" },
    { icon: Wrench, label: "Layanan", id: "layanan" },
    { icon: List, label: "Antrian", id: "antrian" },
    { icon: Tag, label: "Harga", id: "harga" },
    { icon: Calendar, label: "Booking", id: "booking" },
  ];

  return (
    <div className="fixed bottom-4 left-3 right-3 z-50 lg:hidden safe-bottom">
      <nav className="bg-background/70 backdrop-blur-2xl border border-surface-border/50 rounded-[20px] shadow-[0_8px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)] px-1 py-1 flex items-center justify-around gap-0.5" aria-label="Navigasi utama mobile">
        {items.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button key={item.id} onClick={() => scrollToSection(item.id)} aria-label={item.label}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all duration-300 active:scale-90 ${isActive ? "text-primary" : "text-muted-foreground"}`}>
              {isActive && <div className="absolute inset-0 bg-primary/10 dark:bg-primary/20 rounded-2xl transition-all duration-300" />}
              <item.icon size={20} strokeWidth={isActive ? 2.2 : 1.6} className="relative z-10" />
              <span className={`text-[9px] relative z-10 ${isActive ? "font-bold" : "font-medium"}`}>{item.label}</span>
            </button>
          );
        })}
      </nav>
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
  const [data, setData] = useState<LandingData | null>(initialData);
  const [queueData, setQueueData] = useState<QueueData | null>(initialQueue);
  const [dataError, setDataError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => { setMounted(true); }, []);

  // Scroll-based nav + active section tracking
  useEffect(() => {
    const SECTIONS = ["booking", "faq", "kontak", "testimoni", "galeri", "harga", "layanan", "antrian", "home"];
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
    if (sectionId === "home") { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    const el = document.getElementById(sectionId);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: "smooth" });
    }
  }, []);

  // Client-side fetch fallback
  useEffect(() => {
    if (data) return;
    fetch("/api/v1/landing/content")
      .then((r) => r.json())
      .then((res) => { if (res.success) setData(res.data); else setDataError(true); })
      .catch(() => setDataError(true));
  }, [data]);

  // Auto-refresh queue every 30s
  useEffect(() => {
    const fetchQueue = () => {
      fetch("/api/v1/landing/queue")
        .then((r) => r.json())
        .then((res) => { if (res.success) setQueueData(res.data); })
        .catch(() => {});
    };
    if (!queueData) fetchQueue();
    const iv = setInterval(fetchQueue, 30000);
    return () => clearInterval(iv);
  }, []);

  // Loading
  if (!data && !dataError) return <LandingSkeleton />;

  // Error
  if (dataError && !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 px-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold">Gagal Memuat Halaman</h2>
          <p className="text-sm text-muted-foreground">Tidak dapat terhubung ke server. Silakan coba lagi.</p>
          <button onClick={() => window.location.reload()} className="btn-glossy bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-glossy-primary">Muat Ulang</button>
        </div>
      </div>
    );
  }

  // Resolved data with defaults
  const header = data?.landing_header || { logoText: "M", brandName: "MMT Racing", subtitle: "Workshop & Custom Fabrication" };
  const contact: ContactData = data?.landing_contact || { address: "", addressDetail: "", hours: "", hoursClosed: "", phone: "", email: "", whatsapp: "62274123456", mapsEmbed: "" };
  const hero = data?.landing_hero || { tagline: "Bengkel Terpercaya Sejak 2016", title: "Servis Berkualitas, Modifikasi Presisi Tinggi", subtitle: "Spesialis servis rutin, modifikasi, dan jasa bubut custom untuk motor & mobil." };
  const footer = data?.landing_footer || { description: "", hourWeekday: "", hourSaturday: "", hourSunday: "" };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navbar */}
      <Navbar scrolled={scrolled} activeSection={activeSection} header={header} logo={data?.BENGKEL_LOGO} mounted={mounted} theme={theme} setTheme={setTheme} />

      {/* Hero + Trust badges */}
      <HeroSection hero={hero} contact={contact} queueData={queueData} stats={data?.landing_stats} />

      {/* Stats counter */}
      <StatsBar stats={data?.landing_stats} />

      {/* Wave → Queue */}
      <WaveDivider color="fill-[var(--surface-hover)]" className="bg-gradient-to-r from-primary to-primary/80 -mb-px" />
      <QueueSection queueData={queueData} />

      {/* Wave → Services */}
      <WaveDivider flip color="fill-[var(--surface-hover)]" className="bg-background -mb-px" />
      <ServicesSection services={data?.landing_services || []} />

      {/* USP */}
      <WaveDivider color="fill-[var(--surface-hover)]" className="bg-background -mb-px" />
      <USPSection usps={data?.landing_usp || []} />

      {/* Wave → Pricing */}
      <WaveDivider flip color="fill-[var(--surface-hover)]" className="bg-background -mb-px" />
      <PricingSection pricingMotor={data?.landing_pricing_motor || []} pricingMobil={data?.landing_pricing_mobil || []} pricingBubut={data?.landing_pricing_bubut || []} />

      {/* Gallery with lightbox */}
      <GallerySection gallery={data?.landing_gallery || []} />

      {/* Testimonials carousel */}
      <WaveDivider color="fill-[var(--surface-hover)]" className="bg-background -mb-px" />
      <TestimonialsSection testimonials={data?.landing_testimonials || []} />

      {/* Booking wizard */}
      <WaveDivider flip color="fill-[var(--surface-hover)]" className="bg-background -mb-px" />
      <BookingSection contact={contact} />

      {/* FAQ accordion — NEW */}
      <FAQSection />

      {/* Contact & Map */}
      <WaveDivider color="fill-[var(--surface-hover)]" className="bg-background -mb-px" />
      <ContactSection contact={contact} />

      {/* Footer */}
      <FooterSection header={header} footer={footer} />

      {/* Floating WhatsApp */}
      <a
        href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent("Halo MMT Racing, saya ingin servis kendaraan")}`}
        target="_blank" rel="noopener noreferrer" aria-label="Chat WhatsApp"
        className="fixed bottom-28 lg:bottom-6 right-4 lg:right-6 z-40 w-12 h-12 lg:w-14 lg:h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform hover:bg-emerald-600"
      >
        <MessageCircle size={22} className="lg:hidden" />
        <MessageCircle size={26} className="hidden lg:block" />
        <span className="absolute -top-1 -right-1 w-3 h-3 lg:w-4 lg:h-4 bg-primary rounded-full border-2 border-background animate-ping" />
        <span className="absolute -top-1 -right-1 w-3 h-3 lg:w-4 lg:h-4 bg-primary rounded-full border-2 border-background" />
      </a>

      {/* Mobile Bottom Nav */}
      <MobileBottomNav activeSection={activeSection} scrollToSection={scrollToSection} />
    </div>
  );
}
