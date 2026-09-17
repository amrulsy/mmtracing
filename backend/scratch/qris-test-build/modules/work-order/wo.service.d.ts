import { Queryable } from '../../config/db';
import { CreateWoInput, UpdateWoStatusInput } from './wo.schema';
export interface WorkOrderRow {
    id: number;
    noWo: string;
    pelangganId: number;
    kendaraanId: number | null;
    mekanikId: number | null;
    createdById: number;
    mode: 'rutin' | 'modifikasi' | 'bubut';
    status: 'antri' | 'dikerjakan' | 'kendala' | 'selesai' | 'dibatalkan';
    prioritas: 'normal' | 'tinggi' | 'urgent';
    keluhan: string | null;
    judulProyek: string | null;
    spesifikasi: string | null;
    totalHarga: number;
    minimumDp: number;
    totalBayar: number;
    diskon: number;
    startedAt: Date | null;
    estimasiSelesai: Date | null;
    completedAt: Date | null;
    catatan: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface EnrichedWorkOrder extends WorkOrderRow {
    pelanggan?: any;
    kendaraan?: any;
    mekanik?: any;
    createdBy?: any;
    items?: any[];
    stages?: any[];
    photos?: any[];
    pembayaran?: any[];
    garansi?: any[];
}
export declare class WoService {
    findAll(query: any): Promise<{
        data: any[];
        total: number;
        page: number;
        limit: number;
    }>;
    findById(id: number): Promise<EnrichedWorkOrder>;
    create(input: CreateWoInput, userId: number): Promise<EnrichedWorkOrder>;
    updateStatus(id: number, input: UpdateWoStatusInput, userId?: number): Promise<EnrichedWorkOrder>;
    updateProgress(id: number, progress: number, userId?: number): Promise<EnrichedWorkOrder>;
    delete(id: number, userId?: number): Promise<{
        message: string;
    }>;
    /** Restore SPK dari soft delete (admin only) */
    restore(id: number, userId?: number): Promise<{
        message: string;
    }>;
    /** Hitung ulang totalHarga dan minimumDp SPK dari semua items atau stages */
    recalcTotalHarga(tx: Queryable, woId: number): Promise<number>;
    /** Hitung ulang progress SPK otomatis dari status checklist */
    recalcProgress(tx: Queryable, woId: number): Promise<number>;
    addPhoto(woId: number, input: {
        url: string;
        caption?: string;
        type?: string;
    }): Promise<any>;
    stats(): Promise<{
        antri: number;
        dikerjakan: number;
        kendala: number;
        overdue: number;
        pendingPayment: number;
    }>;
    analytics(query: {
        dateFrom?: string;
        dateTo?: string;
    }): Promise<{
        omzetPerMode: Record<string, {
            count: number;
            omzet: number;
            outstanding: number;
        }>;
        topSparepart: any[];
        performa: {
            mekanikId: any;
            nama: any;
            initial: any;
            spkSelesai: number;
            totalRevenue: number;
        }[];
        trend: {
            month: any;
            total: number;
            revenue: number;
        }[];
    }>;
    update(id: number, input: Partial<{
        keluhan: string;
        judulProyek: string;
        spesifikasi: string;
        prioritas: string;
        catatan: string;
        mekanikId: number | null;
        estimasiSelesai: string | null;
    }>, userId?: number): Promise<EnrichedWorkOrder>;
    assignMekanik(id: number, mekanikId: number | null, userId?: number): Promise<EnrichedWorkOrder>;
}
export declare const woService: WoService;
