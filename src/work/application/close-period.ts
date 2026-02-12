import type { PeriodRepo } from "../domain/period.repo";
import { PeriodClosedError, PeriodHasOpenWorkdaysError } from "../domain/errors";
import { Injectable, Inject } from "@nestjs/common";
import { PERIOD_REPO } from "../infrastructure/period.repo.db";

function getNextPeriod(period: {
  year: number;
  month: number;
  half: 1 | 2;
}) {
  if (period.half === 1) {
    return {
      year: period.year,
      month: period.month,
      half: 2 as const,
    };
  }

  if (period.month === 11) {
    return {
      year: period.year + 1,
      month: 0,
      half: 1 as const,
    };
  }

  return {
    year: period.year,
    month: period.month + 1,
    half: 1 as const,
  };
}

function getPeriodDates(
  year: number,
  month: number,
  half: 1 | 2
) {
  if (half === 1) {
    return {
      startDate: new Date(year, month, 1),
      endDate: new Date(year, month, 15, 23, 59, 59),
    };
  }

  const lastDay = new Date(year, month + 1, 0).getDate();

  return {
    startDate: new Date(year, month, 16),
    endDate: new Date(year, month, lastDay, 23, 59, 59),
  };
}

export interface ClosePeriodCmd {
  periodId: string;
  closedBy: string;
}

@Injectable()
export class ClosePeriod {
  constructor(
    @Inject(PERIOD_REPO)
    private readonly periodRepo: PeriodRepo,
  ) {}

  async execute(cmd: ClosePeriodCmd): Promise<void> {
    const period = await this.periodRepo.findById(cmd.periodId);

    if (!period) {
      throw new Error("Periodo no encontrado");
    }

    if (period.closedAt) {
      throw new PeriodClosedError();
    }

    const hasOpen = await this.periodRepo.hasOpenWorkdays(period.id);

    if (hasOpen) {
      throw new PeriodHasOpenWorkdaysError([]);
    }

    await this.periodRepo.close(period.id, {
      closedAt: new Date(),
      closedBy: cmd.closedBy,
    });

    const next = getNextPeriod({
      year: period.year,
      month: period.month,
      half: period.half,
    });

    const dates = getPeriodDates(
      next.year,
      next.month,
      next.half
    );

    await this.periodRepo.findOrCreate({
      year: next.year,
      month: next.month,
      half: next.half,
      startDate: dates.startDate,
      endDate: dates.endDate,
    });
  }
}