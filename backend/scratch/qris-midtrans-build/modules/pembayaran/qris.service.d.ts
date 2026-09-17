import { Queryable } from '../../config/db';
export type QrisMode = 'static' | 'midtrans' | 'legacy';
export declare function ensureQrisSchema(): Promise<unknown>;
export declare function getQrisSettings(): Promise<{
    midtransReady: boolean;
    midtransEnvironment: "production" | "sandbox";
    configured: boolean;
    enabled: boolean;
    mode: string;
} | {
    midtransReady: boolean;
    midtransEnvironment: "production" | "sandbox";
    mode: QrisMode;
    merchantName: string | undefined;
    merchantCity: string | undefined;
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
export declare function saveQrisSettings(payload: string, enabled: boolean, userId: number, mode?: QrisMode): Promise<{
    midtransReady: boolean;
    midtransEnvironment: "production" | "sandbox";
    configured: boolean;
    enabled: boolean;
    mode: string;
} | {
    midtransReady: boolean;
    midtransEnvironment: "production" | "sandbox";
    mode: QrisMode;
    merchantName: string | undefined;
    merchantCity: string | undefined;
    payload: string;
    enabled: boolean;
    updatedAt: string;
    updatedBy: number;
    configured: boolean;
}>;
export declare function createQrisAttempt(invoiceId: number, amount: number, userId: number): Promise<{
    id: string;
    mode: "midtrans";
    payload: string;
    qrImageUrl: string;
    amount: number;
    merchantName: string;
    merchantCity: string;
    noInvoice: string;
} | {
    id: `${string}-${string}-${string}-${string}-${string}`;
    payload: string;
    amount: number;
    merchantName: string;
    merchantCity: string;
    noInvoice: string;
    mode: "static" | "legacy";
    qrImageUrl: string | undefined;
}>;
export interface QrisConfirmation {
    qrisAttemptId?: string;
    qrisReference?: string;
    qrisVerified?: boolean;
}
export declare function confirmQrisAttempt(tx: Queryable, invoiceId: number, amount: number, input: QrisConfirmation, userId?: number): Promise<string>;
