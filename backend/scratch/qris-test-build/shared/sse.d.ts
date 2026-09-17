import { Response } from 'express';
/** SSE event types */
export type SSEEvent = 'wo:updated' | 'wo:selesai' | 'wo:kendala' | 'pembayaran:lunas' | 'pembayaran:bayar' | 'inventaris:stok-update' | 'notifikasi:new';
declare class SSEManager {
    private clients;
    private nextId;
    /** Add a new SSE client connection */
    addClient(res: Response): number;
    /** Broadcast event to all connected clients */
    broadcast(event: SSEEvent, data?: Record<string, unknown>): void;
    /** Get count of connected clients */
    get clientCount(): number;
}
export declare const sseManager: SSEManager;
export {};
