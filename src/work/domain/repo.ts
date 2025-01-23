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
}