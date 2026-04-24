import { Response } from 'express';

export function sendSuccess(res: Response, data: any = null, message: string = 'Berhasil', statusCode: number = 200) {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function sendCreated(res: Response, data: any = null, message: string = 'Data berhasil dibuat') {
  sendSuccess(res, data, message, 201);
}

export function sendPaginated(res: Response, data: any[], total: number, page: number, limit: number, message: string = 'Berhasil') {
  res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  });
}

export function parsePagination(query: any): { page: number; limit: number; skip: number } {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

export function generateCode(prefix: string, counter: number, padLength: number = 3): string {
  return `${prefix}-${String(counter).padStart(padLength, '0')}`;
}

export function generateInvoiceNo(): string {
  const now = new Date();
  const y = String(now.getFullYear()).slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  // Gunakan millisecond + random 3 digit untuk menghindari collision (1000 * 1000 = 1jt kombinasi/hari)
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  const rand = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `INV-${y}${m}${d}-${ms}${rand}`;
}

export function generateSpkNo(): string {
  const now = new Date();
  const y = String(now.getFullYear()).slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  const rand = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `SPK-${y}${m}${d}-${ms}${rand}`;
}
