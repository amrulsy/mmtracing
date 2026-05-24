import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { upload } from '../../middleware/upload';
import { sendSuccess } from '../../shared/utils';
import { BadRequestError } from '../../shared/errors';

const router = Router();
router.use(authMiddleware);

// POST /upload/image — generic image upload, returns url
// Dipakai oleh fitur foto pelanggan & kendaraan.
router.post('/image', upload.single('image'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    if (!file) throw new BadRequestError('File gambar wajib diupload dengan field "image"');
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestError('File bukan gambar');
    }
    const url = `/uploads/${file.filename}`;
    sendSuccess(res, { url, filename: file.filename, size: file.size }, 'Gambar berhasil diupload');
  } catch (e) { next(e); }
});

export default router;
