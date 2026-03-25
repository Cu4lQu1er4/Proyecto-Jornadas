import { Workday } from "../domain/workday";
import { WorkdayRepo } from "../domain/repo";
import {
  WorkdayHistoryCreate,
} from "../domain/history.repo";
import { WorkdayOpenError } from "../domain/errors";
import { WorkdayRules } from "../domain/rules";
import { PeriodRepo } from "../domain/period.repo";
import { getPeriodForDate, ensurePeriodIsOpen } from "../domain/period-rules";
import { EmployeeScheduleService } from "./employee-schedule.service";
import { buildIntervals } from "../domain/calc";

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
    private readonly rules: WorkdayRules,
    private readonly periodRepo: PeriodRepo,
    private readonly scheduleService: EmployeeScheduleService,
  ) {}

  async execute(cmd: EndCmd): Promise<EndResult> {
    const { employeeId, now } = cmd;

    const hasOpen = await this.repo.hasOpen(employeeId);
    if (!hasOpen) throw new WorkdayOpenError();

    const startTime = await this.repo.getStart(employeeId);
    if (!startTime) throw new WorkdayOpenError();

    const periodDesc = getPeriodForDate(startTime);
    const period = await this.periodRepo.findOrCreate(periodDesc);
    ensurePeriodIsOpen(period);

    const marks = await this.repo.getMarks(employeeId, startTime, now);

    const intervals = buildIntervals(startTime, now, marks);
    
    const workday = new Workday(startTime, now, intervals );

    const days = await this.scheduleService.getScheduleForEmployee(employeeId, now);

    const expectedMinutes = workday.expectedMinutesFromSchedule(days ?? []);

    const workedMinutes = workday.workedMinutes(this.rules);

    const deltaMinutes = workedMinutes - expectedMinutes;

  
    const lateArrival = workday.lateArrival(this.rules);
    const earlyLeave = workday.earlyLeave(this.rules);

    await this.repo.closeWithHistory(
      employeeId,
      {
        employeeId,
        startTime,
        endTime: now,
        workedMinutes,
        expectedMinutes,
        deltaMinutes,
        lateArrival,
        earlyLeave,
        periodId: period.id,
      },
      period.id,
    );

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
