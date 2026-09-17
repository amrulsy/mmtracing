export interface MidtransTransaction {
    status_code: string;
    order_id: string;
    transaction_id: string;
    gross_amount: string;
    currency: string;
    payment_type: string;
    transaction_status: string;
    fraud_status?: string;
    actions?: {
        name: string;
        url: string;
    }[];
}
export declare function midtransEnvironment(): 'sandbox' | 'production';
export declare function midtransReady(): boolean;
export declare function midtransBase(environment: string): "https://api.midtrans.com" | "https://api.sandbox.midtrans.com";
export declare function midtransRequest(path: string, environment: string, body?: unknown): Promise<MidtransTransaction>;
export declare function validateMidtransTransaction(value: MidtransTransaction, orderId: string, amount: number): void;
export declare function requireMidtransSettlement(value: MidtransTransaction, orderId: string, amount: number): void;
