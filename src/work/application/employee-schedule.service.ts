import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class EmployeeScheduleService {
  constructor(
    private readonly prisma: PrismaService
  ) {}

  async getScheduleForEmployee(employeeId: string, date: Date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const assignment = await this.prisma.employeeScheduleAssignment.findFirst({
      where: {
        employeeId,
        effectiveFrom: { lte: dayEnd },
        OR : [
          { effectiveTo: null },
          { effectiveTo: { gte: dayStart } },
        ],
      },
      include: {
        template: {
          include: {
            days: true,
          },
        },
      },
      orderBy: {
        effectiveFrom: "desc",
      },
    });

    if (!assignment) return null;

    return assignment.template.days;
  }

  async assignSchedule(
    employeeId: string,
    scheduleTemplateId: string,
    effectiveFrom: string,
  ) {
    const start = effectiveFrom
      ? new Date(effectiveFrom)
      : new Date();
    start.setHours(0, 0, 0, 0);

    return this.prisma.$transaction(async (tx) => {
      await tx.employeeScheduleAssignment.updateMany({
        where: {
          employeeId,
          effectiveTo: null,
        },
        data: {
          effectiveTo: start,
        },
      });

      return tx.employeeScheduleAssignment.create({
        data: {
          employeeId,
          scheduleTemplateId,
          effectiveFrom: start,
        },
      });
    });
  }

  async getCurrentSchedule(employeeId: string) {
    const now = new Date();

    const assignment = await this.prisma.employeeScheduleAssignment.findFirst({
      where: {
        employeeId,
        effectiveFrom: { lte: now },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: now } },
        ],
      },
      include: {
        template: {
          include: {
            days: true,
          },
        },
      },
      orderBy: {
        effectiveFrom: "desc",
      },
    });

    if (!assignment) {
      return null;
    }

    return {
      assignmentId: assignment.id,
      effectiveFrom: assignment.effectiveFrom,
      effectiveTo: assignment.effectiveTo,
      template: assignment.template,
    };
  }
}