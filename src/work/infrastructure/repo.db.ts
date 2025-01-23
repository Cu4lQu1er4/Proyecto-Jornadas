import { WorkdayRepo } from '../domain/repo';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { WorkdayOpenError } from '../domain/errors';
import { WorkdayHistoryEntry } from '../domain/history.repo';

export class WorkdayRepoDb implements WorkdayRepo {
  constructor(
    private readonly prisma: PrismaService
  ) {}

  async hasOpen(employeeId: string): Promise<boolean> {
    const row = await this.prisma.workdayOpen.findUnique({
      where: { employeeId },
    });
    return !!row;
  }

  async open(employeeId: string, startTime: Date): Promise<void> {
    try {
      await this.prisma.workdayOpen.create({
        data: {
          employeeId,
          startTime,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2002") {
          throw new WorkdayOpenError();
        }
      }

      throw e;
    }
  }

  async getStart(employeeId: string): Promise<Date> {
    const row = await this.prisma.workdayOpen.findUnique({
      where: { employeeId },
    });

    if (!row) {
      throw new WorkdayOpenError();
    }

    return row.startTime;
  }

  async close(employeeId: string): Promise<void> {
    await this.prisma.workdayOpen.delete({
      where: { employeeId },
    });
  }

  async closeWithHistory(
    employeeId: string,
    history: WorkdayHistoryEntry,
    periodId: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.workdayOpen.delete({
        where: { employeeId },
      });

      await tx.workdayHistory.create({
        data: {
          employeeId,
          startTime: history.startTime,
          endTime: history.endTime,
          workedMinutes: history.workedMinutes,
          expectedMinutes: history.expectedMinutes,
          deltaMinutes: history.deltaMinutes,
          lateArrival: history.lateArrival,
          earlyLeave: history.earlyLeave,
          period: {
            connect: { id: periodId },
          },
        },
      });
    });
  }
}
