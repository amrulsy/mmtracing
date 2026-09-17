import { Response } from 'express';
export declare function sendSuccess(res: Response, data?: any, message?: string, statusCode?: number): void;
export declare function sendCreated(res: Response, data?: any, message?: string): void;
export declare function sendPaginated(res: Response, data: any[], total: number, page: number, limit: number, message?: string): void;
export declare function parsePagination(query: any): {
    page: number;
    limit: number;
    skip: number;
};
export declare function generateCode(prefix: string, counter: number, padLength?: number): string;
export declare function generateInvoiceNo(): string;
export declare function generateWoNo(): string;
