import { AddWoStageInput, UpdateWoStageInput } from './wo.schema';
export declare class WoStagesService {
    addStage(woId: number, input: AddWoStageInput, userId?: number): Promise<import("./wo.service").EnrichedWorkOrder>;
    updateStage(woId: number, stageId: number, input: UpdateWoStageInput, userId?: number): Promise<import("./wo.service").EnrichedWorkOrder>;
    removeStage(woId: number, stageId: number, userId?: number): Promise<import("./wo.service").EnrichedWorkOrder>;
}
export declare const woStagesService: WoStagesService;
