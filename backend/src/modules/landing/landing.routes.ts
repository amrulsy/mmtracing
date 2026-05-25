import { Router, Request, Response, NextFunction } from 'express';
import db from '../../config/db';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { sendSuccess } from '../../shared/utils';
import { createRateLimiter } from '../../middleware/rateLimit';

// Rate limiter: max 5 booking requests per IP per 10 minutes
const bookingLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: 'Terlalu banyak permintaan booking. Silakan coba lagi dalam beberapa menit.',
});

const router = Router();

// Default landing content (used as fallback)
const LANDING_DEFAULTS: Record<string, string> = {
  landing_header: JSON.stringify({
    logoText: "M",
    brandName: "MMT Racing",
    subtitle: "Workshop & Custom Fabrication"
  }),
  landing_hero: JSON.stringify({
    tagline: "Bengkel Terpercaya Sejak 2016",
    title: "Servis Berkualitas, Modifikasi Presisi Tinggi",
    subtitle: "Spesialis servis rutin, modifikasi, dan jasa bubut custom untuk motor & mobil. Dikerjakan mekanik berpengalaman dengan garansi resmi."
  }),
  landing_stats: JSON.stringify([
    { value: "10+", label: "Tahun Pengalaman" },
    { value: "5,200+", label: "Pelanggan Puas" },
    { value: "15,800+", label: "SPK Selesai" },
    { value: "4.9", label: "Rating Google" }
  ]),
  landing_services: JSON.stringify([
    { icon: "Wrench", title: "Servis Rutin", desc: "Ganti oli, tune up, CVT clean, ganti kampas rem, dan perawatan berkala lainnya.", color: "from-blue-500 to-blue-600", image: "" },
    { icon: "Cog", title: "Modifikasi", desc: "Custom exhaust, bore up, suspension upgrade, body kit, dan modifikasi performa.", color: "from-red-500 to-red-600", image: "" },
    { icon: "Hammer", title: "Jasa Bubut Custom", desc: "Bubut velg, spacer, adapter, shaft, dan komponen custom lainnya dengan presisi CNC.", color: "from-purple-500 to-purple-600", image: "" },
    { icon: "Shield", title: "Quality Check", desc: "Inspeksi menyeluruh: mesin, kelistrikan, body, ban. Laporan digital lengkap.", color: "from-emerald-500 to-emerald-600", image: "" },
    { icon: "Eye", title: "Detailing & Coating", desc: "Poles body, nano ceramic coating, engine dress-up untuk tampilan showroom.", color: "from-amber-500 to-amber-600", image: "" },
    { icon: "Clock", title: "Express Service", desc: "Layanan cepat untuk servis ringan. Selesai dalam 30-60 menit dengan appointment.", color: "from-cyan-500 to-cyan-600", image: "" }
  ]),
  landing_usp: JSON.stringify([
    { icon: "Shield", title: "Garansi Resmi", desc: "Jasa 30 hari, sparepart 6 bulan. Klaim mudah." },
    { icon: "Eye", title: "100% Transparan", desc: "Lihat progress real-time. Tidak ada biaya tersembunyi." },
    { icon: "Award", title: "Mekanik Bersertifikat", desc: "Tim kami terlatih dan berpengalaman 5+ tahun." },
    { icon: "Zap", title: "Cepat & Tepat Waktu", desc: "Estimasi akurat. Notifikasi WA otomatis." }
  ]),
  landing_pricing_motor: JSON.stringify([
    { name: "Ganti Oli + Filter", price: "Rp 85.000", note: "Yamalube 10W-40", popular: false },
    { name: "Tune Up Standard", price: "Rp 50.000", note: "Busi + karbu + filter", popular: false },
    { name: "Paket Servis Lengkap", price: "Rp 285.000", note: "Tune Up + Oli + CVT + Busi", popular: true },
    { name: "Ganti Kampas Rem", price: "Rp 65.000", note: "Depan/belakang + jasa", popular: false },
    { name: "Servis CVT", price: "Rp 75.000", note: "Van belt + roller + clean", popular: false },
    { name: "Balancing Roda", price: "Rp 40.000", note: "Per roda", popular: false }
  ]),
  landing_pricing_mobil: JSON.stringify([
    { name: "Ganti Oli Mesin", price: "Rp 350.000", note: "Shell Helix 5W-30 4L", popular: false },
    { name: "Tune Up Mesin", price: "Rp 250.000", note: "Busi + filter + scan ECU", popular: true },
    { name: "Servis AC", price: "Rp 200.000", note: "Isi freon + cek kompresor", popular: false },
    { name: "Ganti Kampas Rem", price: "Rp 350.000", note: "Depan set + jasa", popular: false },
    { name: "Spooring + Balancing", price: "Rp 250.000", note: "4 roda", popular: false },
    { name: "Scanner Diagnosa", price: "Rp 100.000", note: "OBD2 full scan", popular: false }
  ]),
  landing_pricing_bubut: JSON.stringify([
    { name: "Bubut Velg Motor", price: "Rp 300.000", note: "Per velg, presisi 0.01mm", popular: true },
    { name: "Custom Spacer", price: "Rp 150.000", note: "Aluminium 6061", popular: false },
    { name: "Bubut Shaft Custom", price: "Rp 200.000", note: "Material besi/stainless", popular: false },
    { name: "Adapter Caliper", price: "Rp 250.000", note: "Bahan billet aluminium", popular: false },
    { name: "Custom Bracket", price: "Rp 175.000", note: "Sesuai desain customer", popular: false },
    { name: "Boring Cylinder", price: "Rp 450.000", note: "Oversize + honing", popular: false }
  ]),
  landing_testimonials: JSON.stringify([
    { name: "Budi Santoso", role: "Pelanggan Setia 3 Tahun", text: "Bengkel paling jujur dan transparan. Semua dikerjakan sesuai estimasi. Bisa pantau lewat WhatsApp juga!", rating: 5, avatar: "" },
    { name: "Anton Wijaya", role: "Owner Avanza", text: "Servis besar mobil di sini selalu puas hasilnya. Mekaniknya teliti dan garansi pekerjaan 30 hari.", rating: 5, avatar: "" },
    { name: "Doni Pratama", role: "Modifikasi NMAX", text: "Bubut velg presisi banget! Sesuai desain yang saya mau. Hasilnya rapi dan finishing perfect.", rating: 5, avatar: "" },
    { name: "Siti Nurhasanah", role: "Honda Beat Owner", text: "Tune up cepet, harga terjangkau, dikabarin detail via WA pas udah selesai. Top!", rating: 5, avatar: "" },
    { name: "Reza Kurniawan", role: "Rider CBR 150R", text: "Custom knalpot racing hasilnya mantap! Suara pas, power naik. Recommended buat modifikator.", rating: 5, avatar: "" },
    { name: "PT Maju Jaya Teknik", role: "Klien Korporat", text: "Kerjasama bubut shaft custom untuk mesin industri. Presisi dan on-time delivery.", rating: 5, avatar: "" }
  ]),
  landing_contact: JSON.stringify({
    address: "Jl. Kaliurang Km 10, Yogyakarta",
    addressDetail: "Sebelah utara Indomaret, sebelum pertigaan Candi Gebang",
    hours: "Senin — Sabtu: 08:00 — 17:00",
    hoursClosed: "Minggu & Hari Besar: Tutup",
    phone: "0274-123456 / 0812-3456-7890",
    email: "info@mmtracing.co.id",
    whatsapp: "62274123456",
    mapsEmbed: ""
  }),
  landing_footer: JSON.stringify({
    description: "Bengkel servis, modifikasi, dan jasa bubut custom terpercaya di Yogyakarta. Berdiri sejak 2016.",
    hourWeekday: "Senin — Jumat: 08:00 — 17:00",
    hourSaturday: "Sabtu: 08:00 — 15:00",
    hourSunday: "Minggu: Tutup"
  }),
  landing_gallery: JSON.stringify([
    { title: "Custom Bubut Velg", sub: "Yamaha NMAX", image: "" },
    { title: "Bore Up 200cc", sub: "Honda PCX", image: "" },
    { title: "Full Exhaust System", sub: "Kawasaki Ninja 250", image: "" },
    { title: "Engine Dress Up", sub: "Honda Beat", image: "" },
    { title: "Bracket Caliper", sub: "Custom CNC", image: "" },
    { title: "Servis Besar", sub: "Toyota Avanza", image: "" },
    { title: "Nano Ceramic Coating", sub: "Yamaha R15", image: "" },
    { title: "CVT Upgrade", sub: "Honda Vario 160", image: "" }
  ]),
};

// GET /landing/content — PUBLIC (no auth)
router.get('/content', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await db.query(
      "SELECT * FROM settings WHERE `group` IN ('landing', 'bengkel')"
    );

    // Build result from DB, with defaults as fallback
    const data: Record<string, any> = {};
    const keys = Object.keys(LANDING_DEFAULTS);

    for (const key of keys) {
      const found = settings.find(s => s.key === key);
      try {
        data[key] = JSON.parse(found ? found.value : LANDING_DEFAULTS[key]);
      } catch {
        data[key] = LANDING_DEFAULTS[key];
      }
    }

    const bengkelLogo = settings.find(s => s.key === 'BENGKEL_LOGO');
    if (bengkelLogo) {
      data.BENGKEL_LOGO = bengkelLogo.value;
    }

    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

// PUT /landing/content — PROTECTED (Admin only)
router.put('/content', authMiddleware, requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as Record<string, any>;
    const validKeys = Object.keys(LANDING_DEFAULTS);

    const updates = Object.entries(body)
      .filter(([key]) => validKeys.includes(key))
      .map(([key, value]) => ({
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value),
        group: 'landing',
      }));

    // Upsert each setting
    await Promise.all(
      updates.map(u =>
        db.upsert('settings', { key: u.key, value: u.value, group: u.group }, ['value'])
      )
    );

    sendSuccess(res, null, 'Konten landing berhasil diperbarui');
  } catch (e) {
    next(e);
  }
});

// GET /landing/queue — PUBLIC (live antrian bengkel)
router.get('/queue', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const activeSpk = await db.query(
      `SELECT s.id, s.noSpk, s.status, s.mode, s.progress, s.prioritas, s.createdAt,
              p.name AS pelangganName,
              k.name AS kendaraanName, k.plat AS kendaraanPlat,
              m.name AS mekanikName
       FROM spk s
       LEFT JOIN pelanggan p ON p.id = s.pelangganId
       LEFT JOIN kendaraan k ON k.id = s.kendaraanId
       LEFT JOIN mekanik m ON m.id = s.mekanikId
       WHERE s.status IN ('antri', 'dikerjakan')
       ORDER BY s.prioritas DESC, s.createdAt ASC LIMIT 20`
    );

    // Anonymize names: "Budi Santoso" → "B***o"
    const queue = activeSpk.map((spk: any) => ({
      noSpk: spk.noSpk,
      status: spk.status,
      mode: spk.mode,
      progress: spk.progress,
      prioritas: spk.prioritas,
      pelanggan: spk.pelangganName && spk.pelangganName.length > 2
        ? spk.pelangganName[0] + '***' + spk.pelangganName.slice(-1)
        : '***',
      kendaraan: spk.kendaraanName || null,
      plat: spk.kendaraanPlat
        ? spk.kendaraanPlat.split(' ').map((p: string, i: number) => i === 0 ? p : '***').join(' ')
        : null,
      mekanik: spk.mekanikName || null,
    }));

    const antri = activeSpk.filter((s: any) => s.status === 'antri').length;
    const dikerjakan = activeSpk.filter((s: any) => s.status === 'dikerjakan').length;

    sendSuccess(res, { antri, dikerjakan, total: queue.length, queue });
  } catch (e) {
    next(e);
  }
});

// POST /landing/booking — PUBLIC (submit booking from landing page)
router.post('/booking', bookingLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nama, whatsapp, jenisKendaraan, merkTipe, platNomor, layanan, tanggal, jamPreferensi, keluhan, _hp } = req.body;

    // Honeypot check — if _hp field is filled, it's a bot
    if (_hp) {
      // Return fake success to confuse bots
      res.status(200).json({ success: true, data: { id: 0 }, message: 'Booking berhasil dikirim' });
      return;
    }

    // Basic validation
    if (!nama || !whatsapp || !jenisKendaraan || !layanan) {
      res.status(400).json({
        success: false,
        message: 'Nama, WhatsApp, jenis kendaraan, dan layanan wajib diisi',
      });
      return;
    }

    // WhatsApp format validation
    const waClean = String(whatsapp).replace(/[^0-9]/g, '');
    const waRegex = /^(08|628)[0-9]{8,12}$/;
    if (!waRegex.test(waClean)) {
      res.status(400).json({
        success: false,
        message: 'Format nomor WhatsApp tidak valid. Gunakan format 08xx atau 628xx.',
      });
      return;
    }

    // Date validation — must not be in the past
    if (tanggal) {
      const bookingDate = new Date(tanggal);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (bookingDate < today) {
        res.status(400).json({
          success: false,
          message: 'Tanggal booking tidak boleh di masa lalu.',
        });
        return;
      }
    }

    // Sanitize text inputs — strip HTML tags
    const sanitize = (s: string | undefined | null) => s ? String(s).replace(/<[^>]*>/g, '').trim() : null;

    // Duplicate check — same WA + same tanggal within last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const duplicate = await db.queryOne<{ id: number }>(
      "SELECT id FROM bookings WHERE whatsapp IN (?, ?, ?) AND createdAt >= ? AND status = 'baru' LIMIT 1",
      [waClean, waClean.replace(/^62/, '0'), '0' + waClean.slice(2), twentyFourHoursAgo]
    );
    if (duplicate) {
      res.status(409).json({
        success: false,
        message: `Anda sudah memiliki booking aktif #${duplicate.id}. Silakan tunggu konfirmasi kami.`,
      });
      return;
    }

    const bookingId = await db.insert('bookings', {
      nama: sanitize(nama)!,
      whatsapp: waClean,
      jenisKendaraan: sanitize(jenisKendaraan)!,
      merkTipe: sanitize(merkTipe),
      platNomor: sanitize(platNomor),
      layanan: sanitize(layanan)!,
      tanggal: tanggal ? new Date(tanggal) : null,
      jamPreferensi: jamPreferensi || null,
      keluhan: sanitize(keluhan),
      sumber: 'landing',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    sendSuccess(res, {
      id: bookingId,
      message: `Booking berhasil! Nomor booking: #${bookingId}`,
    }, 'Booking berhasil dikirim');
  } catch (e) {
    next(e);
  }
});

export default router;
