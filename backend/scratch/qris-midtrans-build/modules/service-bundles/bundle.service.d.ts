import { CreateBundleInput, UpdateBundleInput } from './bundle.schema';
export interface Bundle {
    id: string;
    name: string;
    description: string | null;
    icon: string;
    items: Array<{
        type: 'jasa' | 'sparepart';
        id: number;
        qty: number;
    }>;
    estimasiWaktu: string | null;
    garansi: string | null;
    isActive: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare class BundleService {
    findAll(activeOnly?: boolean): Promise<Bundle[]>;
    findById(id: string): Promise<Bundle>;
    create(input: CreateBundleInput): Promise<Bundle>;
    update(id: string, input: UpdateBundleInput): Promise<Bundle>;
    delete(id: string): Promise<void>;
    private mapRowToBundle;
    private generateBundleId;
}
export declare const bundleService: BundleService;
