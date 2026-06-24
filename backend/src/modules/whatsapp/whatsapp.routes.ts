import { Router, Request, Response, NextFunction } from 'express';
import { whatsappService } from './whatsapp.service';
import { authMiddleware, requireRole, requirePermission } from '../../middleware/auth';
import { sendSuccess } from '../../shared/utils';
import QRCode from 'qrcode';

const router = Router();
router.use(authMiddleware);

router.get('/status', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Inisialisasi gateway jika belum (init aman dipanggil berkali-kali karena ada flag initialized)
    whatsappService.init().catch((err) => {
      console.error('[WhatsApp] Error during lazy init:', err);
    });

    let qrDataURL = null;
    if (whatsappService.status === 'qr' && whatsappService.qrCode) {
      qrDataURL = await QRCode.toDataURL(whatsappService.qrCode);
    }

    sendSuccess(res, {
      status: whatsappService.status,
      qr: qrDataURL
    });
  } catch (e) {
    next(e);
  }
});

router.post('/logout', requirePermission('settings', 'full'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await whatsappService.logout();
    sendSuccess(res, null, 'Berhasil mendaftarkan ulang gateway (Logout)');
  } catch (e) {
    next(e);
  }
});

router.post('/retry', requirePermission('settings', 'full'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    if (whatsappService.status === 'disconnected' || whatsappService.status === 'qr') {
      whatsappService.logout(); // restarts standard
    }
    sendSuccess(res, null, 'Memulai ulang koneksi...');
  } catch (e) {
    next(e);
  }
});

router.post('/test', requirePermission('settings', 'full'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ success: false, message: 'Nomor HP dan pesan diperlukan' });
    }
    await whatsappService.sendMessage(phone, message);
    sendSuccess(res, null, 'Pesan uji coba terkirim');
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message || 'Gagal mengirim pesan uji coba' });
  }
});

export default router;
