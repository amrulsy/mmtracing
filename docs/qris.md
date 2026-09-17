# QRIS bernominal dengan verifikasi kasir

Menu: **Pengaturan → QRIS** (`/app/settings/qris`). Pengelola membutuhkan akses `settings: full`; pembuatan dan konfirmasi pembayaran membutuhkan `pembayaran: edit`.

1. Unggah QRIS statis asli dalam PNG/JPG/WebP, maksimal 5 MB dan 20 megapiksel.
2. Periksa pratinjau dan nama merchant. Unggahan hanya diproses dalam memori; belum mengganti pengaturan sampai **Simpan pengaturan** ditekan.
3. Aktifkan QRIS dan simpan. Pastikan penggunaan QR bernominal didukung penyedia, kemudian uji transaksi kecil sebelum digunakan rutin.
4. Di kasir atau modal pembayaran invoice/WO, pilih QRIS. Backend memeriksa nominal terhadap sisa tagihan, membuat QR bernominal, dan menyimpan sesi pembayaran.
5. Kasir memeriksa dana masuk di aplikasi merchant, memasukkan referensi/RRN, mencentang verifikasi, lalu mengonfirmasi. Tidak ada deteksi lunas otomatis.

## Penyimpanan dan deployment

- Jalankan `npm ci` di `backend` untuk dependensi `jsqr`, kemudian build frontend/backend seperti biasa. Backend menggunakan `sharp` yang sudah tersedia untuk membaca gambar, dan jsQR (MIT) untuk decoding. Converter TLV/CRC ditulis lokal tanpa layanan eksternal.
- Pengaturan disimpan sebagai JSON pada key `qris_config` di tabel `settings`; perubahan dicatat dalam `activity_logs`.
- Tabel baru `qris_payment_attempts` dibuat secara idempotent pada penggunaan QRIS pertama. Akun DB aplikasi memerlukan izin `CREATE TABLE` saat inisialisasi. Alternatif: DBA menjalankan DDL dari `ensureQrisSchema` di `backend/src/modules/pembayaran/qris.service.ts` sebelum aplikasi digunakan. Tabel pembayaran lama tidak diubah.
- Tabel sesi menyimpan nominal, payload, merchant, pembuat, referensi, petugas verifikasi, dan waktu. Backup/restore database harus menyertakan tabel ini (ekspor backup JSON lama aplikasi bukan backup database lengkap).
- Konfirmasi sesi dan pencatatan pembayaran berjalan dalam transaksi SQL yang sama. Baris invoice dan sesi dikunci; unique index pada hash referensi mencegah referensi yang sama dicatat ulang, termasuk lintas invoice. Referensi dibandingkan tanpa perbedaan kapital/spasi/tanda pemisah.
- Pembayaran parsial didukung. Rentang nominal Rp1–Rp10.000.000, Rupiah bulat; QR dengan tip/biaya tambahan ditolak agar nominal tagihan tidak berubah diam-diam.

## Batasan operasional

- QR hasil konversi bukan API gateway, tidak mempunyai callback pembayaran, tidak menjamin penerimaan oleh semua penyedia, dan tidak memiliki kedaluwarsa jaringan yang dikendalikan aplikasi.
- Menutup layar, mengganti QRIS, atau menonaktifkan pengaturan tidak membatalkan QR yang telah ditampilkan. Sesi lama tetap dapat dikonfirmasi agar dana yang sudah masuk tetap dapat dicatat.
- Setelah respons konfirmasi terputus, periksa riwayat invoice sebelum membuat pembayaran baru. Konfirmasi ulang sesi yang sudah diproses ditolak.
- Referensi transaksi harus berasal dari aplikasi merchant, bukan hanya screenshot pelanggan. Jika penyedia menggunakan ulang referensi, jangan mengarang referensi pengganti; rekonsiliasi secara terpisah dahulu.
- Refund lokal tidak mengirim uang kembali ke pelanggan dan tidak membuka kembali referensi QRIS yang sudah dipakai.

## Pemeriksaan

`cd backend` lalu `node --import tsx --test src/modules/pembayaran/qris.test.ts` menguji CRC, validasi payload, batas nominal, decoding gambar, kecocokan sesi, dan konflik referensi dengan fixture merchant sintetis. Fixture tidak boleh digunakan untuk menerima pembayaran nyata.

Jika runtime `tsx` tidak tersedia dalam sandbox Windows, kompilasi dengan `node node_modules/typescript/bin/tsc --ignoreDeprecations 6.0 --outDir scratch/qris-test-build`, lalu jalankan `node --test scratch/qris-test-build/modules/pembayaran/qris.test.js`.
