import { BadRequestError } from '../../shared/errors';

export interface MidtransTransaction {
  status_code: string; order_id: string; transaction_id: string;
  gross_amount: string; currency: string; payment_type: string;
  transaction_status: string; fraud_status?: string;
  actions?: { name: string; url: string }[];
}
export function midtransBase(environment: string) {
  return environment === 'production' ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com';
}
export async function midtransRequest(path: string, environment: string, serverKey: string, body?: unknown): Promise<MidtransTransaction> {
  if (!serverKey?.trim()) throw new BadRequestError('Server Key Midtrans belum dikonfigurasi.');
  try {
    const response = await fetch(`${midtransBase(environment)}/v2/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Basic ${Buffer.from(`${serverKey.trim()}:`).toString('base64')}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
    const result = await response.json() as MidtransTransaction;
    // A duplicate order is recovered with Get Status, never a new order ID.
    if (body && result.status_code === '406') return midtransRequest(`${encodeURIComponent((body as { transaction_details: { order_id: string } }).transaction_details.order_id)}/status`, environment, serverKey);
    if (!response.ok || !['200', '201', '202'].includes(result.status_code)) {
      throw new BadRequestError(`Penolakan Midtrans: ${result.status_message || 'Permintaan tidak diizinkan.'}`);
    }
    return result;
  } catch (error) {
    if (error instanceof BadRequestError) throw error;
    throw new BadRequestError('Midtrans tidak merespons. Periksa koneksi internet atau konfigurasi Anda.');
  }
}
export function validateMidtransTransaction(value: MidtransTransaction, orderId: string, amount: number) {
  if (value.order_id !== orderId || Number(value.gross_amount) !== amount || value.currency !== 'IDR' || value.payment_type !== 'qris' || !value.transaction_id) {
    throw new BadRequestError('Data transaksi Midtrans tidak sesuai dengan sesi pembayaran.');
  }
}
export function requireMidtransSettlement(value: MidtransTransaction, orderId: string, amount: number) {
  validateMidtransTransaction(value, orderId, amount);
  if (value.transaction_status !== 'settlement' || (value.fraud_status && value.fraud_status !== 'accept')) {
    const statuses: Record<string, string> = { pending: 'menunggu pembayaran', expire: 'kedaluwarsa', cancel: 'dibatalkan', deny: 'ditolak', refund: 'dikembalikan' };
    throw new BadRequestError(`Pembayaran Midtrans ${statuses[value.transaction_status] || 'belum berhasil'}. Belum dicatat sebagai pembayaran.`);
  }
}
