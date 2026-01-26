export interface Period {
  id: string;
  year: number;
  month: number;
  half: number;
  startDate: Date;
  endDate: Date;
  closedAt: Date | null;
  closedBy?: string | null;
}