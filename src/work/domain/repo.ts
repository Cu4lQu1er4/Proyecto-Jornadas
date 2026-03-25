import { WorkdayHistoryCreate } from "./history.repo";

export const WORKDAY_REPO = Symbol('WORKDAY_REPO');

export interface WorkdayRepo {
  hasOpen(employeeId: string): Promise<boolean>;

  open(
    employeeId: string,
    startTime: Date,
  ): Promise<void>;

  getStart(
    employeeId: string,
  ): Promise<Date>;

  close(
    employeeId: string,
    endTime: Date,
  ): Promise<void>;

  closeWithHistory(
    employeeId: string,
    history: WorkdayHistoryCreate,
    periodId: string,
  ): Promise<void>;

  getMarks(
    employeeId: string,
    from: Date,
    to: Date
  ): Promise<any[]>;
}