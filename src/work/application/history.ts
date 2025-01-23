import { classifyWorkday } from "../domain/status";
import {
  WorkdayHistoryReader,
} from "../domain/history.repo";
import { applyAdjustments } from "../domain/apply-adjustments";

export interface GetHistoryCmd {
  employeeId: string;
  from?: Date;
  to?: Date;
}

export interface WorkHistorySummary {
  totalWorkedMinutes: number;
  totalExpectedMinutes: number;
  totalDeltaMinutes: number;
  days: {
    NORMAL: number;
    INCOMPLETE: number;
    IRREGULAR: number;
  };
}

export class GetWorkHistory {
  constructor(
    private readonly historyRepo: WorkdayHistoryReader,
  ) {}

  async execute(cmd: GetHistoryCmd) {
    const { employeeId, from, to } = cmd;

    let entries = await this.historyRepo.findByEmployee(employeeId);

    const enriched = entries.map(entry => {
      const finalDeltaMinutes = entry.deltaMinutes;

      return {
        ...entry,
        finalDeltaMinutes,
        status: classifyWorkday(
          entry.workedMinutes,
          entry.expectedMinutes,
          finalDeltaMinutes,
          entry.lateArrival,
          entry.earlyLeave,
        ),
      };
    });

    const summary: WorkHistorySummary = {
      totalWorkedMinutes: 0,
      totalExpectedMinutes: 0,
      totalDeltaMinutes: 0,
      days: {
        NORMAL: 0,
        INCOMPLETE: 0,
        IRREGULAR: 0,
      },
    };

    for (const entry of enriched) {
      summary.totalWorkedMinutes += entry.workedMinutes;
      summary.totalExpectedMinutes += entry.expectedMinutes;
      summary.totalDeltaMinutes += entry.finalDeltaMinutes;
      summary.days[entry.status]++;
    }

    return {
      employeeId,
      summary,
      total: enriched.length,
      entries: enriched,
    };
  }
}
