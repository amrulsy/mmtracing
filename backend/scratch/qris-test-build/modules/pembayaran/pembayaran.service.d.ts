import { QrisConfirmation } from './qris.service';
export declare class PembayaranService {
    /**
     * Generate a cryptographically random 6-digit PIN for E-Kwitansi access.
     * This replaces the old "last 4 digits of phone" approach.
     */
    static generateSecurePin(): string;
    /** Fetch public E-Kwitansi by publicId, verifying PIN */
    getPublicReceipt(publicId: string, pin: string): Promise<any>;
    /** List all pembayaran with pagination, search, and related data */
    findAll(query: any): Promise<{
        data: any[];
        total: number;
        page: number;
        limit: number;
    }>;
    /** Get financial summary */
    getSummary(): Promise<{
        menunggu: {
            total: number;
            count: number;
        };
        hariIni: {
            total: number;
            count: number;
        };
        bulanIni: number;
    }>;
    /** Get single pembayaran by id with all relations */
    findById(id: number): Promise<any>;
    /** Process payment (partial or full) */
    bayar(id: number, input: {
        jumlah: number;
        metode: string;
        keterangan?: string;
    } & QrisConfirmation, userId?: number): Promise<any>;
    /** Refund — rollback lunas status, delete garansi & loyalty points */
    refund(id: number, userId?: number): Promise<any>;
}
export declare const pembayaranService: PembayaranService;
