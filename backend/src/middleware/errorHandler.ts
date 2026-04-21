import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors';
import logger from '../config/logger';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    logger.warn(`[${err.statusCode}] ${err.message}`, { path: req.path, method: req.method });
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Prisma errors
  if ((err as any).code === 'P2002') {
    res.status(409).json({
      success: false,
      message: 'Data dengan nilai tersebut sudah ada (duplikat)',
    });
    return;
  }
  if ((err as any).code === 'P2025') {
    res.status(404).json({
      success: false,
      message: 'Data tidak ditemukan',
    });
    return;
  }

  // Multer errors
  if (err.name === 'MulterError') {
    res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
    return;
  }

  // Unknown errors
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Terjadi kesalahan server',
  });
}
