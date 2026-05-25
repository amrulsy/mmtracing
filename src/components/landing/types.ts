export interface LandingData {
  landing_header: HeaderData;
  landing_hero: { tagline: string; title: string; subtitle: string };
  landing_stats: { value: string; label: string }[];
  landing_services: { icon: string; title: string; desc: string; color: string }[];
  landing_usp: { icon: string; title: string; desc: string }[];
  landing_pricing_motor: PricingItem[];
  landing_pricing_mobil: PricingItem[];
  landing_pricing_bubut: PricingItem[];
  landing_testimonials: TestimonialItem[];
  landing_contact: ContactData;
  landing_footer: FooterData;
  landing_gallery: GalleryItem[];
  BENGKEL_LOGO?: string;
}

export interface HeaderData {
  logoText: string;
  brandName: string;
  subtitle: string;
}

export interface FooterData {
  description: string;
  hourWeekday: string;
  hourSaturday: string;
  hourSunday: string;
}

export interface ContactData {
  address: string;
  addressDetail: string;
  hours: string;
  hoursClosed: string;
  phone: string;
  email: string;
  whatsapp: string;
  mapsEmbed?: string;
}

export interface GalleryItem {
  title: string;
  sub: string;
  image?: string;
}

export interface PricingItem {
  name: string;
  price: string;
  note: string;
  popular: boolean;
}

export interface TestimonialItem {
  name: string;
  role: string;
  text: string;
  rating: number;
}

export interface QueueData {
  antri: number;
  dikerjakan: number;
  total: number;
  queue: QueueItem[];
}

export interface QueueItem {
  noSpk: string;
  status: string;
  mode: string;
  progress: number;
  pelanggan: string;
  kendaraan: string | null;
  plat: string | null;
  mekanik: string | null;
}

export interface BookingFormData {
  nama: string;
  whatsapp: string;
  jenisKendaraan: string;
  merkTipe: string;
  platNomor: string;
  layanan: string;
  tanggal: string;
  jamPreferensi: string;
  keluhan: string;
  _hp: string;
}
