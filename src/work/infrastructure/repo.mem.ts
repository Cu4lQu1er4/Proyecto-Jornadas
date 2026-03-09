import { WorkdayHistoryCreate } from "../domain/history.repo";
import { WorkdayRepo } from "../domain/repo";

type OpenWorkday = {
  start: Date;
};

export class WorkdayRepoMem implements WorkdayRepo {
  private openWorkdays = new Map<string, OpenWorkday>();

  async hasOpen(employeeId: string): Promise<boolean> {
    return this.openWorkdays.has(employeeId);
  }

  async open(employeeId: string, startTime: Date): Promise<void> {
    this.openWorkdays.set(employeeId, { start: startTime });
  }

  async getStart(employeeId: string): Promise<Date> {
    const workday = this.openWorkdays.get(employeeId);

    if (!workday) {
      throw new Error('NO_OPEN_WORKDAY')
    }

    return workday.start;
  }

  async close(employeeId: string, endTime: Date): Promise<void> {
    this.openWorkdays.delete(employeeId);
  }

  async closeWithHistory(
    employeeId: string, 
    history: WorkdayHistoryCreate, 
    periodId: string
  ): Promise<void> {
    if (!history.endTime) {
      throw new Error("Invalid endTime");
    }
    
    await this.close(employeeId, history.endTime);
  }
}