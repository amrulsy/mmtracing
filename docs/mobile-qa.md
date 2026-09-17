# Verifikasi frontend mobile

Perbaikan mencakup navigasi client-side, dialog native (fokus, Escape, pemulihan fokus, latar nonaktif), menu bawah 64 px, label 12 px, kontrol sentuh minimum 44 px, input mobile minimum 16 px, safe area atas/bawah, ikon PWA, dan halaman awal portal.

Build produksi menggunakan Webpack karena plugin next-pwa terpasang menggunakan hook Webpack. Gunakan npm run build. Service worker nonaktif dalam development. File sw.js, workbox, dan worker tambahan dihasilkan saat build, bukan disunting manual. Build membutuhkan akses Google Fonts.

## Pemeriksaan otomatis

- TypeScript: node node_modules/typescript/bin/tsc --noEmit
- ESLint: komponen Modal, BottomNav, PortalBottomNav, PwaInstallBanner dan layout terkait.
- Build: npm run build (menghasilkan service worker dan manifest).
- Smoke test HTTP produksi: /login, /portal/login, /manifest.webmanifest, /sw.js, dan ketiga ikon merespons 200; manifest start_url /portal dan display standalone.
- Ikon PNG: 192 x 192, 512 x 512, Apple touch icon 180 x 180.

## Uji perangkat yang masih perlu dilakukan

Browser/perangkat mobile tidak tersedia pada sesi implementasi. Checklist berikut belum dinyatakan lulus:

1. Android Chrome dan iPhone Safari, lebar 320, 360, 390, 430 px; portrait dan landscape.
2. Masuk sebagai admin: Beranda > Pekerjaan > detail > Progres > Tagihan. Navigasi tidak memuat ulang dokumen.
3. Buka menu Lainnya dan modal form: latar tidak dapat disentuh; Tab tetap di dalam dialog; Escape/tombol tutup mengembalikan fokus ke pemicu.
4. Buat WO tiga langkah, simpan/pulihkan draft, cari pelanggan, tambah jasa, buka keyboard pada input terakhir. Tombol lanjut/simpan tetap dapat dijangkau dan tidak tertutup navigasi atau home indicator.
5. Dengan data uji: update pekerjaan dan pembayaran, pastikan validasi dan umpan balik tetap terlihat. Jangan menggunakan transaksi nyata untuk uji.
6. Portal: Beranda, Tagihan, Poin, Notifikasi, Profil. Label terbaca dan konten terakhir tidak tertutup navigasi.
7. Jaringan lambat/terputus: periksa loading, error, retry, dan draft. Koneksi kembali tidak memuat ulang halaman otomatis. Penyimpanan transaksi offline bukan fitur yang ditambahkan.
8. Build produksi melalui HTTPS: manifest dan ikon berhasil dimuat, service worker terdaftar, pemasangan membuka /portal. Di iPhone gunakan menu Bagikan > Tambahkan ke Layar Utama bila prompt otomatis tidak tersedia.
9. Zoom 200%, mode gelap, pembaca layar, dan prefers-reduced-motion.
