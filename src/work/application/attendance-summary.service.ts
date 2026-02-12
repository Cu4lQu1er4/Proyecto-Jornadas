import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { AdminCaseStatus, AdminCaseType } from "@prisma/client";

export type AttendanceDaySummary = {
  date: string;
  workedMinutes: number;
  expectedMinutes: number;
  deltaMinutes: number;
  lateArrival: boolean;
  earlyLeave: boolean;
  justifiedMinutes: number;
  unjustifiedMinutes: number;

  status:
    | "NORMAL"
    | "JUSTIFIED"
    | "PARTIALLY_UNJUSTIFIED"
    | "UNJUSTIFIED_ABSENCE"
    | "INCAPACITY"
    | "CONFLICT";

  adminCases: {
    type: AdminCaseType;
    startMinute: number | null;
    endMinute: number | null;
    notes: string | null;
  }[];
};

function parseYmdLocal(ymd: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) throw new Error(`Invalid date format. Expected YYYY-MM-DD, got: ${ymd}`);

  const year = Number(m[1]);
  const month = Number(m[2]);
  const dayNum = Number(m[3]);

  const d = new Date(year, month - 1, dayNum);
  d.setHours(0, 0, 0, 0);

  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date value: ${ymd}`);
  return d;
}

function scopesOverlap(
  scopes: { startMinute: number | null; endMinute: number | null }[],
) {
  const ranges = scopes
    .filter((s) => s.startMinute !== null && s.endMinute !== null)
    .map((s) => ({ start: s.startMinute!, end: s.endMinute! }))
    .sort((a, b) => a.start - b.start);

  for (let i = 1; i < ranges.length; i++) {
    if (ranges[i].start < ranges[i - 1].end) return true;
  }
  return false;
}

async function logSystemDecisionOnce(
  prisma: PrismaService,
  params: {
    employeeId: string;
    date: Date;
    status: string;
    reason: string;
  }
) {
  const exists = await prisma.auditEvent.findFirst({
    where: {
      entityType: "ATTENDANCE_DAY",
      entityId: `${params.employeeId}:${params.date.toISOString().slice(0, 10)}`,
      action: params.status,
    },
  });

  if (exists) return;

  await prisma.auditEvent.create({
    data: {
      entityType: "ATTENDANCE_DAY",
      entityId: `${params.employeeId}:${params.date.toISOString().slice(0, 10)}`,
      action: params.status,
      performedBy: "SYSTEM",
      metadata: {
        reason: params.reason,
        date: params.date.toISOString().slice(0, 10),
      },
    },
  });
}

@Injectable()
export class AttendanceSummaryService {
  constructor(
    private readonly prisma: PrismaService
  ) {}

  private async isCompanyOperationalDay(day: Date): Promise<boolean> {
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const anyWorkday = await this.prisma.workdayHistory.findFirst({
      where: {
        startTime: {
          gte: start,
          lt: end,
        },
      },
      select: { id: true },
    });

    return !!anyWorkday;
  }

  async getDay(employeeId: string, date: string): Promise<AttendanceDaySummary> {
    const day = parseYmdLocal(date);

    const rules = await this.prisma.workdayRules.findFirst({
      orderBy: { createdAt: "desc" },
    });
    const expectedMinutes = rules?.baseMinutes ?? 0;

    const companyOperational = await this.isCompanyOperationalDay(day);
    if (!companyOperational) {
      return {
        date: day.toISOString().slice(0, 10),
        workedMinutes: 0,
        expectedMinutes,
        deltaMinutes: 0,
        lateArrival: false,
        earlyLeave: false,
        justifiedMinutes: 0,
        unjustifiedMinutes: 0,
        status: "JUSTIFIED",
        adminCases: [],
      };
    }

    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const history = await this.prisma.workdayHistory.findFirst({
      where: {
        employeeId,
        startTime: { 
          gte: start,
          lt: end
         },
      },
    });

    const workedMinutes = history?.workedMinutes ?? 0;
    const deltaMinutes = history ? history.deltaMinutes : -expectedMinutes;

    const scopes = await this.prisma.adminCaseScope.findMany({
      where: {
        date: day,
        adminCase: {
          employeeId,
          status: AdminCaseStatus.APPLIED,
        },
      },
      include: { adminCase: true },
    });

    const hasIncapacity = scopes.some((s) => s.adminCase.type === AdminCaseType.INCAPACITY);
    const hasFullDayIncapacity = scopes.some(
      (s) => 
        s.adminCase.type === AdminCaseType.INCAPACITY &&
        s.startMinute === null &&
        s.endMinute === null,
    );

    let hasConflict = false;
    if (scopesOverlap(scopes)) hasConflict = true;
    if (hasIncapacity && workedMinutes > 0) hasConflict = true;
    if (hasFullDayIncapacity && scopes.length > 1) hasConflict = true;

    let justifiedMinutes = 0;
    for (const scope of scopes) {
      if (scope.startMinute === null || scope.endMinute === null) {
        justifiedMinutes += expectedMinutes;
      } else {
        justifiedMinutes += scope.endMinute - scope.startMinute;
      }
    }

    const absDelta = Math.abs(deltaMinutes);

    if (deltaMinutes < 0) {
      justifiedMinutes = Math.min(justifiedMinutes, absDelta);
    } else {
      justifiedMinutes = 0
    }

    const unjustifiedMinutes = deltaMinutes < 0 ? absDelta - justifiedMinutes : 0;

    let status: AttendanceDaySummary["status"] = "NORMAL";

    if (hasConflict) {
      status = "CONFLICT";
    } else if (hasIncapacity && justifiedMinutes >= expectedMinutes) {
      status = "INCAPACITY";
    } else if (workedMinutes === 0 && unjustifiedMinutes === expectedMinutes) {
      status = "UNJUSTIFIED_ABSENCE";
    } else if (unjustifiedMinutes === 0 && justifiedMinutes > 0) {
      status = "JUSTIFIED";
    } else if (unjustifiedMinutes > 0 && justifiedMinutes > 0) {
      status = "PARTIALLY_UNJUSTIFIED";
    }

    if (status !== "NORMAL") {
      await logSystemDecisionOnce(this.prisma, {
        employeeId,
        date: day,
        status,
        reason: (() => {
          if (!companyOperational) return "COMPANY_NON_OPERATIONAL_DAY";
          if (status === "UNJUSTIFIED_ABSENCE") return "NO_WORK_NO_JUSTIFICATION"
          if (status === "CONFLICT") return "AUTOMATIC_CONFLICT_DETECTED"
          if (status === "INCAPACITY") return "FULL_DAY_INCAPACITY";
          if (status === "JUSTIFIED") return "JUSTIFIED_BY_ADMIN_CASE";
          return "AUTO_CLASSIFICATION";
        })(),
      });
    }

    return {
      date: day.toISOString().slice(0, 10),
      workedMinutes,
      expectedMinutes,
      deltaMinutes,
      lateArrival: history?.lateArrival ?? false,
      earlyLeave: history?.earlyLeave ?? false,
      justifiedMinutes,
      unjustifiedMinutes,
      status,
      adminCases: scopes.map((s) => ({
        type: s.adminCase.type,
        startMinute: s.startMinute,
        endMinute: s.endMinute,
        notes: s.adminCase.notes,
      })),
    };
  }

  async getPeriod(employeeId: string, periodId: string) {
    const period = await this.prisma.workPeriod.findUnique({
      where: { id: periodId },
    });
    if (!period) throw new Error("Periodo no existe");

    const days: AttendanceDaySummary[] = [];
    const current = new Date(period.startDate);
    current.setHours(0, 0, 0, 0);

    const end = new Date(period.endDate);
    end.setHours(0, 0, 0, 0);

    while (current <= end) {
      const ymd = current.toISOString().slice(0, 10);
      days.push(await this.getDay(employeeId, ymd));
      current.setDate(current.getDate() + 1);
    }

    return {
      period,
      days,
      totals: {
        worked: days.reduce((a, d) => a + d.workedMinutes, 0),
        justified: days.reduce((a, d) => a + d.justifiedMinutes, 0),
        unjustified: days.reduce((a, d) => a + d.unjustifiedMinutes, 0),
      },
    };
  }

  async getReport(periodId: string, document?: string) {
    if (!periodId){
      throw new Error("periodId requerido");
    }

    if (document) {
      const employee = await this.prisma.employee.findUnique({
        where: { document },
      });

      if(!employee) {
        throw new Error("Empleado no existe");
      }

      return this.getPeriod(employee.id, periodId);
    }

    throw new Error("document requerido por ahora");
  }
}