"use client";

import { MapPin, Clock, Phone, Mail, MessageCircle, Navigation } from "lucide-react";
import AnimatedSection from "../ui/AnimatedSection";
import type { ContactData } from "../types";
import { getWhatsAppUrl } from "../contact";

export default function ContactSection({ contact }: { contact: ContactData }) {
  const whatsapp = getWhatsAppUrl(contact.whatsapp, "Halo, saya ingin bertanya tentang layanan bengkel.");
  const mapsUrl = contact.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address)}` : null;
  const rows = [
    { icon: MapPin, title: "Lokasi bengkel", detail: contact.address, extra: contact.addressDetail, action: mapsUrl ? { href: mapsUrl, label: "Buka petunjuk arah", icon: Navigation } : null },
    { icon: Clock, title: "Jam operasional", detail: contact.hours, extra: contact.hoursClosed },
    { icon: Phone, title: "Telepon", detail: contact.phone, action: contact.phone ? { href: `tel:${contact.phone.replace(/[^+\d]/g, "")}`, label: "Hubungi bengkel" } : null },
    { icon: Mail, title: "Email", detail: contact.email, action: contact.email ? { href: `mailto:${contact.email}`, label: "Kirim email" } : null },
  ].filter((row) => row.detail || row.extra);
  return <section id="kontak" className="contact-redesign py-16 lg:py-24"><div className="max-w-7xl mx-auto px-4 lg:px-8 grid lg:grid-cols-2 gap-10 lg:gap-20 items-start">
    <AnimatedSection><span className="text-xs font-bold uppercase tracking-widest text-red-300">Sampai jumpa di bengkel</span><h2 className="text-4xl lg:text-5xl font-black mt-3 leading-tight">Motor Anda.<br/>Langkah selanjutnya.</h2><p className="mt-5 max-w-md text-sm text-white/70">Konsultasikan kebutuhan Anda sebelum datang atau sebelum mengirim komponen untuk dikerjakan.</p>{whatsapp ? <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex mt-8 items-center gap-2 bg-primary text-white px-6 py-3.5 rounded-xl font-bold text-sm"><MessageCircle size={18}/>Konsultasi via WhatsApp</a> : <p className="mt-8 text-sm text-white/60">Nomor WhatsApp bengkel belum tersedia.</p>}</AnimatedSection>
    <AnimatedSection delay={120}><div className="contact-redesign-panel">{rows.length ? rows.map((row) => <div key={row.title} className="contact-redesign-row"><row.icon size={19}/><div><h3>{row.title}</h3><p>{row.detail}</p>{row.extra && <p>{row.extra}</p>}{row.action && <a href={row.action.href} {...(row.action.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{row.action.label}{row.action.icon && <row.action.icon size={14}/>}</a>}</div></div>) : <div className="contact-redesign-row"><MapPin size={19}/><div><h3>Informasi kunjungan</h3><p>Alamat dan jam operasional akan ditampilkan setelah diatur oleh bengkel.</p></div></div>}</div></AnimatedSection>
  </div></section>;
}
