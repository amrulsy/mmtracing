import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors';
import logger from '../config/logger';

/** Modules where errors are considered critical (data integrity risk) */
const CRITICAL_MODULES = ['inventaris', 'pembayaran', 'spk', 'stok', 'transaksi'];

function isCriticalPath(path: string): boolean {
  return CRITICAL_MODULES.some(m => path.includes(m));
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const context = {
    path: req.path, 
    method: req.method,
    ip: req.ip,
    userId: (req as any).user?.id || null,
  };

  if (err instanceof AppError) {
    logger.warn(`[${err.statusCode}] ${err.message}`, context);
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // MySQL errors
  if ((err as any).code === 'ER_DUP_ENTRY') {
    res.status(409).json({
      success: false,
      message: 'Data dengan nilai tersebut sudah ada (duplikat)',
    });
    return;
  }
  if ((err as any).code === 'ER_NO_REFERENCED_ROW_2' || (err as any).code === 'ER_ROW_IS_REFERENCED_2') {
    res.status(409).json({
      success: false,
      message: 'Data terkait dengan entitas lain, tidak dapat diproses',
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

  // Classify severity: critical for data-integrity modules
  if (isCriticalPath(req.path)) {
    logger.crit(`[CRITICAL] Unhandled error on ${req.method} ${req.path}: ${err.message}`, {
      ...context,
      stack: err.stack,
      errorName: err.name,
    });
  } else {
    logger.error('Unhandled error:', { ...context, stack: err.stack, errorName: err.name });
  }

  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Terjadi kesalahan server',
  });
}

