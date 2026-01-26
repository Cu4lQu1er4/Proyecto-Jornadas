import { Workday } from "../domain/workday";
import { WorkdayRepo } from "../domain/repo";
import { WorkdayHistoryWriter, WorkdayHistoryCreate } from "../domain/history.repo";
import { WorkdayOpenError } from "../domain/errors";
import { WorkdayRules } from "../domain/rules";
import { PeriodRepo } from "../domain/period.repo";
import { getPeriodForDate } from "../domain/period-rules";
import { applyBreaks } from "../domain/apply-rules";
import { ensurePeriodIsOpen } from "../domain/period-rules";

export interface EndCmd {
  employeeId: string;
  now: Date;
}

export interface EndResult {
  workedMinutes: number;
  expectedMinutes: number;
  deltaMinutes: number;
  lateArrival: boolean;
  earlyLeave: boolean;
  periodId: string;
}

export class EndWorkday {
  constructor(
    private readonly repo: WorkdayRepo,
    private readonly historyRepo: WorkdayHistoryWriter,
    private readonly rules: WorkdayRules,
    private readonly periodRepo: PeriodRepo,
  ) {}

  async execute(cmd: EndCmd): Promise<EndResult> {
    const { employeeId, now } = cmd;

    const hasOpen = await this.repo.hasOpen(employeeId);
    if (!hasOpen) throw new WorkdayOpenError();

    const startTime = await this.repo.getStart(employeeId);

    const periodDesc = getPeriodForDate(now);
    const period = await this.periodRepo.findOrCreate(periodDesc);

    ensurePeriodIsOpen(period);

    const workday = new Workday(startTime, now);

    const grossWorkedMinutes = workday.workedMinutes(this.rules);

    const breakMinutes = applyBreaks (
      startTime,
      now,
      this.rules.breaks,
    );

    const workedMinutes = Math.max(
      0,
      grossWorkedMinutes - breakMinutes
    );

    const expectedMinutes = workday.expectedMinutes(this.rules);
    const deltaMinutes = workedMinutes - expectedMinutes;

    const lateArrival = workday.isLateArrival(this.rules);
    const earlyLeave = workday.isEarlyLeave(this.rules);

    await this.repo.close(employeeId, now);

    const history: WorkdayHistoryCreate = {
      employeeId,
      startTime,
      endTime: now,
      workedMinutes,
      expectedMinutes,
      deltaMinutes,
      lateArrival,
      earlyLeave,
      periodId: period.id,
    };

    await this.historyRepo.save(history);

    return {
      workedMinutes,
      expectedMinutes,
      deltaMinutes,
      lateArrival,
      earlyLeave,
      periodId: period.id,
    };
  }
}