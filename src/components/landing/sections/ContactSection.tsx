"use client";

import { MapPin, Clock, Phone, Mail } from "lucide-react";
import AnimatedSection from "../ui/AnimatedSection";
import type { ContactData } from "../types";

interface ContactSectionProps {
  contact: ContactData;
}

export default function ContactSection({ contact }: ContactSectionProps) {
  return (
    <section id="kontak" className="py-16 lg:py-24 bg-surface-hover/30">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8">
          <AnimatedSection>
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Kunjungi Kami</span>
            <h2 className="text-3xl font-black mt-2 mb-6">Lokasi &amp; Jam Operasional</h2>
            <div className="space-y-4">
              <div className="flex gap-3">
                <MapPin size={20} className="text-primary shrink-0 mt-0.5" />
                <div><p className="font-medium">{contact.address}</p><p className="text-xs text-muted-foreground">{contact.addressDetail}</p></div>
              </div>
              <div className="flex gap-3">
                <Clock size={20} className="text-primary shrink-0 mt-0.5" />
                <div><p className="font-medium">{contact.hours}</p><p className="text-xs text-muted-foreground">{contact.hoursClosed}</p></div>
              </div>
              <div className="flex gap-3">
                <Phone size={20} className="text-primary shrink-0 mt-0.5" />
                <div><p className="font-medium">{contact.phone}</p><p className="text-xs text-muted-foreground">WhatsApp &amp; Telepon</p></div>
              </div>
              <div className="flex gap-3">
                <Mail size={20} className="text-primary shrink-0 mt-0.5" />
                <div><p className="font-medium">{contact.email}</p><p className="text-xs text-muted-foreground">Email untuk kerjasama &amp; penawaran</p></div>
              </div>
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
  );
}
