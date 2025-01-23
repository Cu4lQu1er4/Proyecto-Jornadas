import { WorkdayAdjustment } from "./adjustment";

export interface WorkdayAdjustmentRepo {
  add(addjustment: WorkdayAdjustment): Promise<void>;
  findByHistory(historyId: string): Promise<WorkdayAdjustment[]>;
}