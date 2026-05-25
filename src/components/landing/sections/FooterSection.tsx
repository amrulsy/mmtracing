import type { HeaderData, FooterData } from "../types";

interface FooterSectionProps {
  header: HeaderData;
  footer: FooterData;
}

export default function FooterSection({ header, footer }: FooterSectionProps) {
  return (
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
              <li>Servis Rutin Motor &amp; Mobil</li>
              <li>Modifikasi &amp; Performance</li>
              <li>Jasa Bubut Custom CNC</li>
              <li>Detailing &amp; Coating</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-sm mb-3">Link</h4>
            <ul className="space-y-2 text-xs opacity-60">
              <li><a href="#layanan" className="hover:opacity-100">Layanan</a></li>
              <li><a href="#harga" className="hover:opacity-100">Harga</a></li>
              <li><a href="#booking" className="hover:opacity-100">Booking Online</a></li>
              <li><a href="#faq" className="hover:opacity-100">FAQ</a></li>
              <li><a href="#kontak" className="hover:opacity-100">Kontak</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-sm mb-3">Jam Kerja</h4>
            <ul className="space-y-2 text-xs opacity-60">
              <li>{footer.hourWeekday}</li>
              <li>{footer.hourSaturday}</li>
              <li>{footer.hourSunday}</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between text-[10px] opacity-40">
          <p>&copy; 2026 MMT Racing. All rights reserved.</p>
          <p>Built with ❤️ in Yogyakarta</p>
        </div>
      </div>
    </footer>
  );
}
