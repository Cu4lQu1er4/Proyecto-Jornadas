export interface Period {
  id: string;
  startDate: Date;
  endDate: Date;
  closedAt: Date | null;
}