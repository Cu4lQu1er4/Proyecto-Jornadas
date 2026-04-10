import { Injectable } from "@nestjs/common";
import { StartWorkday } from "./application/start";
import { EndWorkday } from "./application/end";
import { GetWorkHistory } from "./application/history";
import { WorkdayRepoDb } from "./infrastructure/repo.db";
import { WorkdayHistoryRepoDb } from "./infrastructure/history.repo.db";
import { PrismaService } from "src/prisma/prisma.service";
import { workdayRules } from "./workday.rules";
import { AddWorkdayAdjustment } from "./application/add-adjustment";
import { WorkdayAdjustmentRepoDb } from "./infrastructure/adjustment.repo.db";
import { PeriodRepoDb } from "./infrastructure/period.repo.db";
import { PeriodRepo } from "./domain/period.repo";
import { ListPeriods } from "./application/list-periods";
import { ClosePeriod } from "./application/close-period";
import { getExpectedCloseDate } from "./application/period.utils";
import { EmployeeScheduleService } from "./application/employee-schedule.service";
import * as bcrypt from "bcrypt";
import { CreateEmployeeDto } from "./application/create-employee.dto";
import { CompleteProfileDto } from "./application/complete-profile.dto";
import { getNextAllowedMarks } from "./domain/rules";
import { MarkType } from "./domain/rules";
import { calculatePauseMinutesDetailed } from "./domain/calc";
import { AttendanceSummaryService } from "./application/attendance-summary.service";

@Injectable()
export class WorkService {
  private repo: WorkdayRepoDb;
  private historyRepo: WorkdayHistoryRepoDb;
  private startUC: StartWorkday;
  private endUC: EndWorkday;
  private historyUC: GetWorkHistory;
  private adjustmentRepo: WorkdayAdjustmentRepoDb;
  private addAdjustmentUC: AddWorkdayAdjustment;
  private periodRepo: PeriodRepo;
  private listPeriodUC: ListPeriods;
  private closePeriodUC: ClosePeriod;

  constructor(
    private readonly prisma: PrismaService,
    private attendanceService: AttendanceSummaryService,
  ) {
    this.prisma = prisma;
    this.repo = new WorkdayRepoDb(prisma);
    this.historyRepo = new WorkdayHistoryRepoDb(prisma);
    this.startUC = new StartWorkday(this.repo);
    this.periodRepo = new PeriodRepoDb(prisma);
    const scheduleService = new EmployeeScheduleService(prisma);
    this.endUC = new EndWorkday(
      this.repo,
      workdayRules,
      this.periodRepo,
      scheduleService,
    );
    this.historyUC = new GetWorkHistory(this.historyRepo);
    this.adjustmentRepo = new WorkdayAdjustmentRepoDb(prisma);
    this.addAdjustmentUC = new AddWorkdayAdjustment(
      this.historyRepo,
      this.adjustmentRepo,
    );
    this.listPeriodUC = new ListPeriods(this.periodRepo);
    this.closePeriodUC = new ClosePeriod(
      this.periodRepo,
      this.prisma,
    );
  }

  async start(employeeId: string, now?: Date): Promise<void> {
    await this.startUC.execute({
      employeeId,
      now: new Date(),
    });
  }

  async end(employeeId: string, now: Date) {
    return this.endUC.execute({
      employeeId,
      now,
    });
  }

  async history(
    employeeId: string,
    periodId: string,
  ) {
    return this.historyUC.execute({
      employeeId,
      periodId,
    });
  }

  async addAdjustment(cmd: {
    historyId: string;
    type: 'ADD' | 'SUBTRACT';
    minutes: number;
    reason: string;
    approvedBy: string;
  }): Promise<void> {
    await this.addAdjustmentUC.execute(cmd);
  }

  async listPeriods(params: { page?: number; limit?: number }) {
    const result = await this.listPeriodUC.execute({
      page: params.page ?? 1,
      limit: params.limit ?? 10,
    });

    const now = new Date();

    const items = result.items.map(period => {
      const expectedCloseAt = getExpectedCloseDate(
        period.year,
        period.month,
        period.half,
      );

      const isOverdue = 
        !period.closedAt && now > expectedCloseAt;

        const daysOverdue = isOverdue
          ? Math.ceil(
              (now.getTime() - expectedCloseAt.getTime()) /
              (1000 * 60 * 60 * 24)
            )
          : 0;

        return {
          ...period,
          expectedCloseAt,
          isOverdue,
          daysOverdue,
        };
    });

    return {
      ...result,
      items,
    };
  }

  async closePeriod(periodId: string, closedBy: string) {
    return this.closePeriodUC.execute({ 
      periodId,
      closedBy, 
    });
  }

  async listEmployeePeriods(employeeId: string) {
    const periods = await this.prisma.workPeriod.findMany({
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
        { half: 'desc' },
      ],
    });

    return Promise.all(
      periods.map(async (p) => {
        const result = await this.attendanceService.getPeriod(
          employeeId,
          p.id
        );

        return {
          id: p.id,
          startDate: p.startDate,
          endDate: p.endDate,
          closedAt: p.closedAt,
          workedDays: result.totals.workedDays,
          absences: result.totals.absences,
          justified: result.totals.justified,
          partial: result.totals.partial,
          totalWorkedMinutes: result.totals.workedMinutes,
          totalExpectedMinutes: result.totals.expectedMinutes,
          totalDeltaMinutes: result.totals.rawDelta,
        };
      })
    );
  }

  async listEmployees() {
    const employees = await this.prisma.user.findMany({
      select: {
        id: true,
        document: true,
        active: true,
        role: true,
        createdAt: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      employees.map(async (e) => {
        const pendingCases = await this.prisma.adminCase.count({
          where: {
            employeeId: e.id,
            status: "PENDING",
          },
        });

        return {
          ...e,
          pendingCases,
        };
      })
    );
  }

  async workdayStatus(employeeId: string) {
    const open = await this.prisma.workdayOpen.findUnique({
      where: {
        employeeId,
      },
      select: {
        startTime: true,
      },
    });

    return {
      hasOpenWorkday: !!open,
      startTime: open?.startTime ?? null,
    };
  }

  async createEmployee(dto: CreateEmployeeDto, adminId: string) {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    if (dto.role === "ADMIN") {
      const admin = await this.prisma.user.findUnique({
        where: { id: adminId },
      });

      if (!admin || admin.role !== "ADMIN") {
        throw new Error ("No autorizado para crear administradores");
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          document: dto.document,
          passwordHash,
          role: dto.role ?? "EMPLOYEE",
          active: true,
          mustChangePassword: true,
          profileCompleted: false,
        },
        select: {
          id: true,
          document: true,
          role: true,
          active: true,
          createdAt: true,
        },
      });

      if ((dto.role ?? "EMPLOYEE") === "EMPLOYEE") {
        await tx.employeeScheduleAssignment.create({
          data: {
            employeeId: user.id,
            scheduleTemplateId: dto.scheduleTemplateId,
            effectiveFrom: new Date(),
          },
        });
      }

      return user;
    });
  }

  async completeProfile(userId: string, dto: CompleteProfileDto) {
    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    const pinHash = await bcrypt.hash(dto.pin, 10);

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        pinHash,  
        mustChangePassword: false,
        profileCompleted: true,
      },
      select : {
        id: true,
        document: true,
        role: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        mustChangePassword: true,
        profileCompleted: true,
      },
    }); 
  }

  async toggleActive(userId: string, active: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { active },
    });
  }

  async getLiveWorkdays() {
    const workdays = await this.prisma.workdayOpen.findMany();

    const employees = await this.prisma.user.findMany({
      where: {
        id: {
          in: workdays.map(w => w.employeeId),
        },
      },
      select: {
        id: true,
        document: true,
        firstName: true,
        lastName: true,
      },
    });

    const map = new Map(employees.map(e => [e.id, e]));

    return {
      count: workdays.length,
      employees: workdays.map(w => {
        const emp = map.get(w.employeeId);

        return {
          id: emp?.id,
          document: emp?.document,
          name: `${emp?.firstName ?? ""} ${emp?.lastName ?? ""}`.trim() || emp?.document,
          startTime: w.startTime,
        };
      }),
    };
  }

  async mark(employeeId: string, type: MarkType) {
    const now = new Date();

    const hasOpen = await this.repo.hasOpen(employeeId);
    if (!hasOpen) {
      throw new Error('No hay jornada abierta');
    }

    const startTime = await this.repo.getStart(employeeId);

    const marks = await this.repo.getMarks(employeeId, startTime, now);

    const last = marks.length > 0
      ? (marks[marks.length - 1].type as MarkType)
      : undefined;

    const allowed = getNextAllowedMarks(last);

    if (!allowed.includes(type)) {
      throw new Error(`Marcacion invalida: ${type}`);
    }

    await this.repo.addMark(employeeId, {
      type,
      time: now,
    });
  }

  async getNextActions(employeeId: string) {
    const now = new Date();

    const hasOpen = await this.repo.hasOpen(employeeId);
    if (!hasOpen) {
      return { allowed: [] };
    }

    const startTime = await this.repo.getStart(employeeId);

    const marks = await this.repo.getMarks(employeeId, startTime, now);

    const pauses = calculatePauseMinutesDetailed(marks);

    const last = marks.length > 0
      ? (marks[marks.length - 1].type as MarkType)
      : undefined;

    const MAX_BREAK = 30;

    const canStartBreak = pauses.breakMinutes < MAX_BREAK;

    const allowed: MarkType[] = [];

    if (!last) {
      if (canStartBreak) allowed.push("BREAK_START");
    }

    if (last === "BREAK_START") {
      allowed.push("BREAK_END");
    }

    return { allowed };
  }

  async deleteEmployee(userId: string) {

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new Error("Usuario no existe");

    if (user.role === "ADMIN") {
      throw new Error("No puedes eliminar un admin");
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.workdayOpen.deleteMany({
        where: { employeeId: userId },
      });

      await tx.workdayMark.deleteMany({
        where: { employeeId: userId },
      });

      const histories = await tx.workdayHistory.findMany({
        where: { employeeId: userId },
        select: { id: true },
      });

      const historyIds = histories.map(h => h.id);

      if (historyIds.length > 0) {
        await tx.workdayAdjustment.deleteMany({
          where: {
            historyId: { in: historyIds },
          },
        });
      }

      await tx.workdayHistory.deleteMany({
        where: { employeeId: userId },
      });

      await tx.employeeScheduleAssignment.deleteMany({
        where: { employeeId: userId },
      });

      await tx.adminCase.deleteMany({
        where: { employeeId: userId },
      });

      await tx.user.delete({
        where: { id: userId },
      });

      return { success: true };
    });
  }
}
