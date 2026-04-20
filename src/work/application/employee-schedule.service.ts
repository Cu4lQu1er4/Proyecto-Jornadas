import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

function parseLocalDate(ymd: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);

  if (!m) {
    throw new Error(`Invalid date format: ${ymd}`);
  }

  const date = new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3])
  );

  if (isNaN(date.getTime())) {
    throw new Error(`Fecha invalida: ${ymd}`);
  }

  date.setHours(0, 0, 0, 0);

  return date;
}

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
    const hasValidate =
      typeof effectiveFrom === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom);

    const start = hasValidate
      ? parseLocalDate(effectiveFrom)
      : (() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      })();

    if (isNaN(start.getTime())) {
      throw new Error(`Fecha invalida en asignacion de horario: ${effectiveFrom}`);
    }

    const end = new Date(start);
    end.setDate(end.getDate() - 1);

    return this.prisma.$transaction(async (tx) => {
      const activeAssignment = await tx.employeeScheduleAssignment.findFirst({
        where: {
          employeeId,
          effectiveTo: null,
        },
        select: { id: true },
      });

      if (activeAssignment) {
        await tx.employeeScheduleAssignment.updateMany({
          where: {
            employeeId,
            effectiveTo: null,
          },
          data: {
            effectiveTo: end,
          },
        });
      }

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