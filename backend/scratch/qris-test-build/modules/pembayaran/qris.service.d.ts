import { Queryable } from '../../config/db';
export declare function ensureQrisSchema(): Promise<unknown>;
export declare function getQrisSettings(): Promise<{
    configured: boolean;
    enabled: boolean;
} | {
    merchantName: string;
    merchantCity: string;
    payload: string;
    enabled: boolean;
    updatedAt: string;
    updatedBy: number;
    configured: boolean;
}>;
export declare function decodeQrisImage(buffer: Buffer): Promise<{
    payload: string;
    merchantName: string;
    merchantCity: string;
}>;
export declare function saveQrisSettings(payload: string, enabled: boolean, userId: number): Promise<{
    configured: boolean;
    enabled: boolean;
} | {
    merchantName: string;
    merchantCity: string;
    payload: string;
    enabled: boolean;
    updatedAt: string;
    updatedBy: number;
    configured: boolean;
}>;
export declare function createQrisAttempt(invoiceId: number, amount: number, userId: number): Promise<{
    id: `${string}-${string}-${string}-${string}-${string}`;
    payload: string;
    amount: number;
    merchantName: string;
    merchantCity: string;
    noInvoice: string;
}>;
export interface QrisConfirmation {
    qrisAttemptId?: string;
    qrisReference?: string;
    qrisVerified?: boolean;
}
export declare function confirmQrisAttempt(tx: Queryable, invoiceId: number, amount: number, input: QrisConfirmation, userId?: number): Promise<string>;
