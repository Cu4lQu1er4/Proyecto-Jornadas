import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class EmployeeScheduleService {
  constructor(
    private readonly prisma: PrismaService
  ) {}

  async getScheduleForEmployee(employeeId: string, date: Date) {
    const assignment = await this.prisma.employeeScheduleAssignment.findFirst({
      where: {
        employeeId,
        effectiveFrom: { lte: date },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: date } },
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
    return this.prisma.employeeScheduleAssignment.create({
      data: {
        employeeId,
        scheduleTemplateId,
        effectiveFrom: new Date(effectiveFrom),
      },
    });
  }

  async getCurrentSchedule(employeeId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const assignment = await this.prisma.employeeScheduleAssignment.findFirst({
      where: {
        employeeId,
        effectiveFrom: { lte: today },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: today } },
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