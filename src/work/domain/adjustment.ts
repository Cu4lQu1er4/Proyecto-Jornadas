export type AdjustmentType =
  | 'ADD'
  | 'SUBTRACT';

export interface WorkdayAdjustment {
  historyId: string;
  type: AdjustmentType;
  minutes: number;
  reason: string;
  approvedBy: string;
}