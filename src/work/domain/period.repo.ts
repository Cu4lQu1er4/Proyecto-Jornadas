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
  findById(id: string): Promise<Period | null>;
  findByDate(desc: {
    year: number;
    month: number;
    half: 1 | 2;
  }): Promise<Period | null>;

  findOrCreate(desc: PeriodDescriptor): Promise<Period>;
  create(desc: PeriodDescriptor): Promise<Period>;

  close(
    id: string,
    data: { closedAt: Date; closedBy: string }
  ): Promise<void>;

  list(params: {
    page: number;
    limit: number;
  }): Promise<{ total: number; items: Period[] }>;

  findByEmployee(employeeId: string): Promise<Period[]>;

  hasOpenWorkdays(periodId: string): Promise<boolean>;

  findOpen(): Promise<Period | null>;
}
