import { WorkdayRules, BreakRule } from "./rules";

export class Workday {
  constructor(
    private readonly start: Date,
    private readonly end: Date,
  ) {}

  private minutesBetween(a: Date, b: Date): number {
    return Math.round((b.getTime() - a.getTime()) / 1000 / 60);
  }

  private buildBreakDate(base: Date, time: string): Date {
    const [h, m] = time.split(':').map(Number);
    const d = new Date(base);
    d.setHours(h, m, 0, 0);
    return d;
  }

  private breakDuration(br: BreakRule): number {
    const start = this.buildBreakDate(this.start, br.start);
    const end = this.buildBreakDate(this.start, br.end);

    const overlapStart = Math.max(
      this.start.getTime(),
      start.getTime()
    );

    const overlapEnd = Math.min(
      this.end.getTime(),
      end.getTime()
    );

    if (overlapEnd <= overlapStart) return 0;

    return this.minutesBetween(
      new Date(overlapStart),
      new Date(overlapEnd)
    )
  }

  lateArrival(rules: WorkdayRules): boolean {
    const weekday = this.start.getDay();
    const daySchedule = rules.schedule[weekday];

    if (!daySchedule) return false;

    const expectedStart = this.buildBreakDate(
      this.start,
      daySchedule.start,
    );
    const graceMs = rules.grace.arrivalMinutes * 60 * 1000;

    return this.start.getTime() > expectedStart.getTime() + graceMs;
  }

  earlyLeave(rules: WorkdayRules): boolean {
    const weekday = this.start.getDay();
    const daySchedule = rules.schedule[weekday];

    if (!daySchedule) return false;

    const expectedEnd = this.buildBreakDate(
      this.start,
      daySchedule.end,
    );
    const graceMs = rules.grace.leaveMinutes * 60 * 1000;

    return this.end.getTime() < expectedEnd.getTime() - graceMs;
  }

  workedMinutes(rules: WorkdayRules): number {
    const total = this.minutesBetween(this.start, this.end);

    const deducted = rules.breaks.reduce(
      (sum, br) => sum + this.breakDuration(br),
      0
    );

    return Math.max(0, total - deducted);
  }

  extraMinutes(
    rules: WorkdayRules,
    expectedMinutes: number
  ): number {
    const worked = this.workedMinutes(rules);
    return worked - expectedMinutes;
  }

  expectedMinutes(rules: WorkdayRules): number {
    const day = this.start.getDay();
    const schedule = rules.schedule[day];

    if (!schedule) return 0;

    const start = this.buildBreakDate(this.start, schedule.start);
    const end = this.buildBreakDate(this.start, schedule.end);

    const total = this.minutesBetween(start, end);

    const deducted = rules.breaks.reduce(
      (sum, br) => sum + this.breakDuration(br),
      0
    );

    return Math.max(0, total - deducted);
  }

  expectedMinutesFromSchedule(
  days: {
    weekday: number;
    startMinute: number;
    endMinute: number;
  }[],
): number {
  const weekday = this.start.getDay();

  const dayConfig = days.find(d => d.weekday === weekday);

  if (!dayConfig) return 0;

  return dayConfig.endMinute - dayConfig.startMinute;
}
}
