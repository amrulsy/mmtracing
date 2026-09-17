import { AddWoItemInput, UpdateWoItemInput } from './wo.schema';
export declare class WoItemsService {
    addItem(woId: number, input: AddWoItemInput, userId?: number): Promise<import("./wo.service").EnrichedWorkOrder>;
    removeItem(woId: number, itemId: number, userId?: number): Promise<import("./wo.service").EnrichedWorkOrder>;
    updateItem(woId: number, itemId: number, input: UpdateWoItemInput, userId?: number): Promise<import("./wo.service").EnrichedWorkOrder>;
    updateItemHpp(woId: number, itemId: number, hargaModal: number, userId?: number): Promise<import("./wo.service").EnrichedWorkOrder>;
}
export declare const woItemsService: WoItemsService;
