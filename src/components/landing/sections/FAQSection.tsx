"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import AnimatedSection from "../ui/AnimatedSection";
import type { FAQItem } from "../types";

const FAQ_DATA: FAQItem[] = [
  { q: "Bagaimana cara konsultasi layanan?", a: "Gunakan tombol WhatsApp jika nomor bengkel tersedia, atau isi formulir booking untuk menyampaikan kebutuhan Anda." },
  { q: "Apakah bisa booking online?", a: "Ya. Ajukan jadwal pilihan melalui formulir atau WhatsApp. Ketersediaan waktu dikonfirmasi oleh bengkel." },
  { q: "Apa yang perlu disiapkan untuk jasa bubut?", a: "Siapkan foto atau contoh komponen, ukuran, serta penjelasan fungsi komponen. Material dan kemungkinan pengerjaan dibahas bersama bengkel." },
  { q: "Bagaimana mengetahui biaya dan waktu pengerjaan?", a: "Minta konfirmasi biaya dan estimasi pengerjaan kepada bengkel sesuai kondisi motor atau detail komponen Anda." },
  { q: "Apakah pekerjaan dapat dilacak?", a: "Halaman Lacak SPK dapat digunakan dengan nomor SPK dan PIN yang diberikan oleh bengkel." },
];

export default function FAQSection({ faqs }: { faqs?: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const items = faqs?.length ? faqs : FAQ_DATA;
  return <section id="faq" className="py-16 lg:py-24"><div className="max-w-3xl mx-auto px-4 lg:px-8">
    <AnimatedSection className="text-center mb-12"><span className="text-xs font-bold uppercase tracking-widest text-primary">FAQ</span><h2 className="text-3xl lg:text-4xl font-black mt-2">Sebelum berkunjung</h2><p className="text-muted-foreground mt-3">Beberapa hal yang bisa Anda siapkan sebelum berkonsultasi.</p></AnimatedSection>
    <AnimatedSection><div className="space-y-3">{items.map((faq, index) => { const open = openIndex === index; return <div key={faq.q} className={`glass-panel overflow-hidden transition-all duration-300 ${open ? "shadow-md border-primary/20" : ""}`}><button type="button" aria-expanded={open} onClick={() => setOpenIndex(open ? null : index)} className="w-full flex items-center gap-3 p-4 lg:p-5 text-left hover:bg-surface-hover/50 transition-colors"><HelpCircle size={18} className={`shrink-0 ${open ? "text-primary" : "text-muted-foreground"}`}/><span className="flex-1 text-sm font-semibold">{faq.q}</span><ChevronDown size={16} className={`shrink-0 text-muted-foreground transition-transform duration-300 ${open ? "rotate-180 text-primary" : ""}`}/></button><div className={`overflow-hidden transition-all duration-300 ease-out ${open ? "max-h-48 opacity-100" : "max-h-0 opacity-0"}`}><p className="px-4 lg:px-5 pb-4 lg:pb-5 pl-11 lg:pl-12 text-sm text-muted-foreground leading-relaxed">{faq.a}</p></div></div>; })}</div></AnimatedSection>
  </div></section>;
}
