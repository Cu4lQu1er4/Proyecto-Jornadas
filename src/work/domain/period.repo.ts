import { PeriodDescriptor } from "./period-rules";

export interface Period {
  id: string;
  year: number;
  month: number;
  half: 1 | 2;
  startDate: Date;
  endDate: Date;
  closedAt: Date | null;
  closedBy: string | null;
}

export interface PeriodRepo {
  findByDate(desc: PeriodDescriptor): Promise<Period | null>;
  findById(id: string): Promise<Period | null>;
  create(desc: PeriodDescriptor): Promise<Period>;
  findOrCreate(desc: PeriodDescriptor): Promise<Period>;
  close(id: string, data: { closedAt: Date; closedBy: string }): Promise<void>;
}
