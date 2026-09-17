"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Wrench, Moon, Sun, Home, Tag, List, Calendar,
  MessageCircle, AlertCircle, Search,
} from "lucide-react";

// Types (re-exported for page.tsx backward compat)
import type { LandingData, QueueData, ContactData, HeaderData, NavigationSettings } from "./types";
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
  scrolled, activeSection, header, logo, navigation, theme, setTheme,
}: {
  scrolled: boolean; activeSection: string; header: HeaderData;
  logo?: string; navigation: NavigationSettings; theme?: string; setTheme: (t: string) => void;
}) {
  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-background border-b border-surface-border shadow-sm" : "bg-transparent"}`}>
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
        <div className="hidden lg:flex items-center gap-5">
          {navigation.items.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <a key={item.id} href={`#${item.id}`} className={`text-sm font-medium transition-colors relative ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {item.label}
                {isActive && <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full" />}
              </a>
            );
          })}
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="p-2 rounded-lg hover:bg-surface-hover transition-colors text-muted-foreground" aria-label="Toggle tema gelap/terang">
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <Link href="/track" className="flex items-center gap-1.5 text-sm font-bold text-primary hover:text-primary/80 transition-colors">
            <Search size={16} /> {navigation.trackLabel}
          </Link>
          <a href="#booking" className="bg-red-600 text-white px-6 py-3 rounded-2xl text-sm font-black transition-all">{navigation.ctaLabel}</a>
        </div>
        {/* Mobile */}
        <div className="lg:hidden flex items-center gap-2">
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="p-2 rounded-lg hover:bg-surface-hover transition-colors text-muted-foreground" aria-label="Toggle tema gelap/terang" suppressHydrationWarning>
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link href="/track" className="text-xs font-bold text-primary px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/10 flex items-center gap-1">
            <Search size={12} /> {navigation.trackLabel}
          </Link>
          <Link href="/portal/login" className="text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-surface-border">{navigation.portalLabel}</Link>
        </div>
      </div>
    </nav>
  );
}

// ========== MOBILE BOTTOM NAV ==========
function MobileBottomNav({ activeSection, scrollToSection, navigation }: { activeSection: string; scrollToSection: (id: string) => void; navigation: NavigationSettings }) {
  const defaults = [
    { icon: Home, label: "Home", id: "home" },
    { icon: Wrench, label: "Layanan", id: "layanan" },
    { icon: List, label: "Antrian", id: "antrian" },
    { icon: Tag, label: "Harga", id: "harga" },
    { icon: Calendar, label: "Booking", id: "booking" },
  ];
  const items = defaults.map((item) => ({ ...item, label: item.id === "booking" ? navigation.ctaLabel : navigation.items.find((entry) => entry.id === item.id)?.label || item.label }));

  return (
    <div className="fixed bottom-4 left-3 right-3 z-50 lg:hidden safe-bottom">
      <nav className="bg-background border-t border-surface-border/50 px-1 py-1 flex items-center justify-around gap-0.5" aria-label="Navigasi utama mobile">
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
  const { theme, setTheme } = useTheme();

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
    if (!initialQueue) fetchQueue();
    const iv = setInterval(fetchQueue, 30000);
    return () => clearInterval(iv);
  }, [initialQueue]);

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
          <button onClick={() => window.location.reload()} className="bg-red-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold">Muat Ulang</button>
        </div>
      </div>
    );
  }

  // Resolved data with defaults
  const header = data?.landing_header || { logoText: "M", brandName: "MMT Racing", subtitle: "Workshop & Custom Fabrication" };
  const isTemplateContent = data?.landing_contact?.whatsapp === "62274123456";
  const contact: ContactData = isTemplateContent ? { address: "", addressDetail: "", hours: "", hoursClosed: "", phone: "", email: "", whatsapp: "", mapsEmbed: "" } : data?.landing_contact || { address: "", addressDetail: "", hours: "", hoursClosed: "", phone: "", email: "", whatsapp: "", mapsEmbed: "" };
  const hero = isTemplateContent || !data?.landing_hero ? { tagline: "Bengkel motor & jasa bubut", title: "Performa terjaga, detail bermakna", subtitle: "Konsultasikan perawatan motor dan kebutuhan komponen custom Anda." } : data.landing_hero;
  const services = isTemplateContent ? [
    { icon: "Wrench", title: "Servis & perawatan motor", desc: "Konsultasikan keluhan mesin dan kebutuhan perawatan motor Anda.", color: "" },
    { icon: "Cog", title: "Modifikasi motor", desc: "Diskusikan rencana modifikasi dan kebutuhan komponen sebelum pengerjaan.", color: "" },
    { icon: "Hammer", title: "Jasa bubut custom", desc: "Konsultasikan bentuk, ukuran, material, dan fungsi komponen yang Anda butuhkan.", color: "" },
  ] : data?.landing_services || [];
  const footer = isTemplateContent ? { description: "Bengkel motor & jasa bubut custom.", hourWeekday: "", hourSaturday: "", hourSunday: "", services: [] } : data?.landing_footer || { description: "", hourWeekday: "", hourSaturday: "", hourSunday: "", services: [] };
  const navigation: NavigationSettings = data?.landing_navigation || { items: [{ label: "Layanan", id: "layanan" }, { label: "Harga", id: "harga" }, { label: "Antrian", id: "antrian" }, { label: "Galeri", id: "galeri" }, { label: "FAQ", id: "faq" }, { label: "Kontak", id: "kontak" }], ctaLabel: "Booking Online", trackLabel: "Lacak SPK", portalLabel: "Login" };
  const gallery = (data?.landing_gallery || []).filter((item) => Boolean(item.image));

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navbar */}
      <Navbar scrolled={scrolled} activeSection={activeSection} header={header} logo={data?.BENGKEL_LOGO} navigation={navigation} theme={theme} setTheme={setTheme} />

      {/* Hero + Trust badges */}
      <HeroSection hero={hero} contact={contact} queueData={queueData} stats={data?.landing_stats} />

      {/* Stats counter */}
      {!isTemplateContent && data?.landing_stats?.length ? <StatsBar stats={data.landing_stats} /> : null}

      {/* Wave → Queue */}
      <WaveDivider color="fill-[var(--surface-hover)]" className="bg-gradient-to-r from-primary to-primary/80 -mb-px" />
      <QueueSection queueData={queueData} />

      {/* Wave → Services */}
      <WaveDivider flip color="fill-[var(--surface-hover)]" className="bg-background -mb-px" />
      <ServicesSection services={services} />

      {/* USP */}
      <WaveDivider color="fill-[var(--surface-hover)]" className="bg-background -mb-px" />
      {!isTemplateContent && data?.landing_usp?.length ? <USPSection usps={data.landing_usp} /> : null}

      {/* Wave → Pricing */}
      <WaveDivider flip color="fill-[var(--surface-hover)]" className="bg-background -mb-px" />
      {!isTemplateContent && (data?.landing_pricing_motor?.length || data?.landing_pricing_bubut?.length) ? <PricingSection pricingMotor={data?.landing_pricing_motor || []} pricingBubut={data?.landing_pricing_bubut || []} /> : null}

      {/* Gallery with lightbox — hidden when empty */}
      {gallery.length > 0 && (
        <GallerySection gallery={gallery} />
      )}

      {/* Testimonials carousel */}
      <WaveDivider color="fill-[var(--surface-hover)]" className="bg-background -mb-px" />
      {!isTemplateContent && data?.landing_testimonials?.length ? <TestimonialsSection testimonials={data.landing_testimonials} /> : null}

      {/* Booking wizard */}
      <WaveDivider flip color="fill-[var(--surface-hover)]" className="bg-background -mb-px" />
      <BookingSection contact={contact} settings={data?.landing_booking} />

      {/* FAQ accordion — NEW */}
      <FAQSection faqs={data?.landing_faq} />

      {/* Contact & Map */}
      <WaveDivider color="fill-[var(--surface-hover)]" className="bg-background -mb-px" />
      <ContactSection contact={contact} />

      {/* Footer */}
      <FooterSection header={header} footer={footer} />

      {/* Floating WhatsApp */}
      <a
        href={contact.whatsapp ? `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent("Halo MMT Racing, saya ingin servis kendaraan")}` : "#kontak"}
        target="_blank" rel="noopener noreferrer" aria-label="Chat WhatsApp"
        className="fixed bottom-28 lg:bottom-6 right-4 lg:right-6 z-40 w-12 h-12 lg:w-14 lg:h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform hover:bg-emerald-600"
      >
        <MessageCircle size={22} className="lg:hidden" />
        <MessageCircle size={26} className="hidden lg:block" />
        <span className="absolute -top-1 -right-1 w-3 h-3 lg:w-4 lg:h-4 bg-primary rounded-full border-2 border-background animate-ping" />
        <span className="absolute -top-1 -right-1 w-3 h-3 lg:w-4 lg:h-4 bg-primary rounded-full border-2 border-background" />
      </a>

      {/* Mobile Bottom Nav */}
      <MobileBottomNav activeSection={activeSection} scrollToSection={scrollToSection} navigation={navigation} />
    </div>
  );
}
