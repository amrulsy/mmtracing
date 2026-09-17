/**
 * Gate-Pass: Shared logic for issuing warranty (Garansi) and loyalty points
 * upon Work Order completion + invoice payment (lunas).
 *
 * Called from two places:
 * 1. wo.service.ts — when WO is marked 'selesai' and invoice was already 'lunas'
 * 2. pembayaran.routes.ts — when invoice is marked 'lunas' and WO is already 'selesai'
 */
import type { Queryable } from '../config/db';
export declare function releaseGatePass(tx: Queryable, woId: number): Promise<void>;
