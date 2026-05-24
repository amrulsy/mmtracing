import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import { env } from '../config/env';
import fs from 'fs';

// Ensure upload directory exists
const uploadDir = path.resolve(env.upload.dir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipe file ${file.mimetype} tidak diizinkan`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.upload.maxFileSize,
  },
});
