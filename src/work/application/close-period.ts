import type { PeriodRepo } from "../domain/period.repo";
import { 
  PeriodClosedError,
  PeriodHasOpenWorkdaysError,
} from "../domain/errors";
import { Injectable, Inject } from "@nestjs/common";
import { PERIOD_REPO } from "../infrastructure/period.repo.db";
import { PrismaService } from "src/prisma/prisma.service";
import { getNextPeriod } from "./period.utils";

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
    private readonly prisma: PrismaService,
  ) {}

  async execute(cmd: ClosePeriodCmd): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const period = await tx.workPeriod.findUnique({
        where: { id: cmd.periodId },
      });

      if (!period) {
        throw new Error("Periodo no encontrado");
      }

      if (period.closedAt) {
        throw new PeriodClosedError();
      }

      const now = new Date();

      if (now < period.endDate) {
        throw new Error("PERIOD_NOT_FINISHED");
      }

      const openWorkday = await tx.workdayOpen.findFirst({
        where: {
          startTime: {
            gte: period.startDate,
            lte: period.endDate,
          },
        },
      });

      if (openWorkday) {
        throw new PeriodHasOpenWorkdaysError([]);
      }

      await tx.workPeriod.update({
        where: { id: period.id },
        data: {
          closedAt: now,
          closedBy: cmd.closedBy,
        },
      });

      const next = getNextPeriod({
        year: period.year,
        month: period.month,
        half: period.half as 1 | 2,
      });

      const dates = getPeriodDates(
        next.year,
        next.month,
        next.half
      );

      await tx.workPeriod.upsert({
        where: {
          year_month_half: {
            year: next.year,
            month: next.month,
            half: next.half,
          },
        },
        update: {},
        create: {
          year: next.year,
          month: next.month,
          half: next.half,
          startDate: dates.startDate,
          endDate: dates.endDate,
          closedAt: null,
          closedBy: null,
        },
      });
    });
  }
}