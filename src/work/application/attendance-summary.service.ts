import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { AdminCaseStatus, AdminCaseType } from "@prisma/client";
import { EmployeeScheduleService } from "./employee-schedule.service";

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
    | "CONFLICT"
    | "NON_OPERATIONAL_DAY";
  isOpen: boolean;

  adminCases: {
    type: AdminCaseType;
    startMinute: number | null;
    endMinute: number | null;
    notes: string | null;
  }[];
};

function parseYmdLocal(ymd: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) {
    throw new Error(`Invalid date format. Expected YYYY-MM-DD, got: ${ymd}`);
  }

  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);

  const date = new Date(year, month - 1, day);

  date.setHours(0, 0, 0, 0);

  return date;
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

function formatLocalYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
      entityId: `${params.employeeId}:${formatLocalYmd(params.date)}`,
      action: params.status,
    },
  });

  if (exists) return;

  await prisma.auditEvent.create({
    data: {
      entityType: "ATTENDANCE_DAY",
      entityId: `${params.employeeId}:${formatLocalYmd(params.date)}`,
      action: params.status,
      performedBy: "SYSTEM",
      metadata: {
        reason: params.reason,
        date: formatLocalYmd(params.date),
      },
    },
  });
}

function getExpectedMinutesForDate(
  date: Date,
  scheduleDays: { weekday: number; startMinute: number; endMinute: number }[],
) {
  const weekday = date.getDay();

  const dayConfig = scheduleDays.find((d) => d.weekday === weekday);

  if (!dayConfig) return 0;

  return Math.max(0, dayConfig.endMinute - dayConfig.startMinute);
}

@Injectable()
export class AttendanceSummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduleService: EmployeeScheduleService,
  ) {}

  async getDay(employeeId: string, date: string): Promise<AttendanceDaySummary> {
    const day = parseYmdLocal(date);

    const scheduleDays = await this.scheduleService.getScheduleForEmployee(employeeId, day);

    const weekday = day.getDay();
    const dayConfig = scheduleDays?.find(d => d.weekday === weekday);

    const start = new Date(day);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    if (!dayConfig) {
      return {
        date: formatLocalYmd(day),
        workedMinutes: 0,
        expectedMinutes: 0,
        deltaMinutes: 0,
        lateArrival: false,
        earlyLeave: false,
        justifiedMinutes: 0,
        unjustifiedMinutes: 0,
        status: "NON_OPERATIONAL_DAY",
        adminCases: [],
        isOpen: false,
      };
    }

    const expectedMinutes = Math.max(0, dayConfig.endMinute - dayConfig.startMinute);

    const open = await this.prisma.workdayOpen.findUnique({
      where: { employeeId },
      select: { startTime: true },
    });

    if (open?.startTime) {
      const openStart = new Date(open.startTime);

      if (openStart >= start && openStart < end) {
        const now = new Date();

        const workedMinutesLive = Math.max(
          0,
          Math.floor((now.getTime() - openStart.getTime()) / 60000)
        );

        const pauseMinutesLive = 0;
        const realWorkedLive = workedMinutesLive + pauseMinutesLive;
        const deltaLive = realWorkedLive - expectedMinutes;
        
        const expectedStart = new Date(start);
        
        const hours = Math.floor(dayConfig.startMinute / 60);
        const minutes = dayConfig.startMinute % 60;
        
        expectedStart.setHours(hours, minutes, 0, 0);
        
        const lateArrivalLive = openStart.getTime() > expectedStart.getTime();
        
        return {
          date: formatLocalYmd(day),
          workedMinutes: workedMinutesLive,
          expectedMinutes,
          deltaMinutes: deltaLive,
          lateArrival: lateArrivalLive,
          earlyLeave: false,
          justifiedMinutes: 0,
          unjustifiedMinutes: Math.max(0, -deltaLive),
          status: "NORMAL",
          adminCases: [],
          isOpen: true,
        };
      }
    }
    
    const histories = await this.prisma.workdayHistory.findMany({
      where: {
        employeeId,
        startTime: { gte: start, lt: end },
      },
      orderBy: {
        startTime: "asc",
      }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isToday = day.getTime() === today.getTime();

    if (histories.length === 0) {
      return {
        date: formatLocalYmd(day),
        workedMinutes: 0,
        expectedMinutes,
        deltaMinutes: isToday ? 0 : -expectedMinutes,
        lateArrival: false,
        earlyLeave: false,
        justifiedMinutes: 0,
        unjustifiedMinutes: isToday ? 0 : expectedMinutes,
        status: isToday ? "NORMAL" : "UNJUSTIFIED_ABSENCE",
        adminCases: [],
        isOpen: false,
      };
    }

    const workedMinutes = histories.reduce(
      (sum, h) => sum + h.workedMinutes,
      0
    );

    const pauseMinutes = histories.reduce(
      (sum, h) => sum + (h.pauseMinutes ?? 0),
      0
    );

    const realWorked = workedMinutes + pauseMinutes;

    const deltaMinutes = realWorked - expectedMinutes;

    const firstMark = histories[0]?.startTime;

    let lateArrival = false;

    if (firstMark) {
      const expectedStart = new Date(start);
      const hours = Math.floor(dayConfig.startMinute / 60);
      const minutes = dayConfig.startMinute % 60;
      expectedStart.setHours(hours, minutes, 0, 0);
      lateArrival = firstMark.getTime() > expectedStart.getTime();
    }

    const mainHistory =
      histories.find(h => h.workedMinutes > 0) ??
      histories[0];

    const scopes = await this.prisma.adminCaseScope.findMany({
      where: {
        date: {
          gte: start,
          lt: end,
        },
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
      justifiedMinutes = 0;
    }

    const unjustifiedMinutes = deltaMinutes < 0 ? absDelta - justifiedMinutes : 0;

    let status: AttendanceDaySummary["status"] = "NORMAL";

    if (hasConflict) {
      status = "CONFLICT";
    } else if (hasIncapacity && justifiedMinutes >= expectedMinutes) {
      status = "INCAPACITY";
    } else if (realWorked === 0 && unjustifiedMinutes === expectedMinutes) {
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
          if (status === "UNJUSTIFIED_ABSENCE") return "NO_WORK_NO_JUSTIFICATION";
          if (status === "CONFLICT") return "AUTOMATIC_CONFLICT_DETECTED";
          if (status === "INCAPACITY") return "FULL_DAY_INCAPACITY";
          if (status === "JUSTIFIED") return "JUSTIFIED_BY_ADMIN_CASE";
          return "AUTO_CLASSIFICATION";
        })(),
      });
    }

    return {
      date: formatLocalYmd(day),
      workedMinutes,
      expectedMinutes,
      deltaMinutes,
      lateArrival,
      earlyLeave: mainHistory?.earlyLeave ?? false,
      justifiedMinutes,
      unjustifiedMinutes,
      status,
      adminCases: scopes.map((s) => ({
        type: s.adminCase.type,
        startMinute: s.startMinute,
        endMinute: s.endMinute,
        notes: s.adminCase.notes,
      })),
      isOpen: false,
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const periodEnd = new Date(period.endDate);
    periodEnd.setHours(0, 0, 0, 0);

    const end = period.closedAt
      ? periodEnd
      : today < periodEnd
        ? today
        : periodEnd;

    while (current <= end) {
      const ymd = formatLocalYmd(current);

      const day = await this.getDay(employeeId, ymd);

      days.push({
        ...day,
        deltaMinutes: day.isOpen ? 0 : day.deltaMinutes
      });

      current.setDate(current.getDate() + 1);
    }

    const totalWorkedMinutes = days.reduce(
      (a, d) => a + d.workedMinutes,
      0
    );

    const totalExpectedMinutes = days.reduce(
      (a, d) => a + d.expectedMinutes,
      0
    );

    const totalJustifiedMinutes = days.reduce(
      (a, d) => a + d.justifiedMinutes,
      0
    );

    const totalUnjustifiedMinutes = days.reduce(
      (a, d) => a + d.unjustifiedMinutes,
      0
    );

    const totalWorkedDays = days.filter(d =>
      d.workedMinutes > 0 || d.isOpen
    ).length;

    const totalAbsenceDays = days.filter(d =>
      d.expectedMinutes > 0 &&
      d.workedMinutes === 0 &&
      d.unjustifiedMinutes > 0
    ).length;

    const totalJustifiedDays = days.filter(d =>
      d.justifiedMinutes >= d.expectedMinutes &&
      d.expectedMinutes > 0
    ).length;

    const totalPartialDays = days.filter(d =>
      d.workedMinutes > 0 &&
      d.unjustifiedMinutes > 0
    ).length;

    const rawDelta = totalWorkedMinutes - totalExpectedMinutes;

    const netBalance =
      totalWorkedMinutes +
      totalJustifiedMinutes -
      totalExpectedMinutes;

    const isIrregular =
      totalAbsenceDays > 0 || totalPartialDays > 0;

    return {
      period,
      days,
      totals: {
        workedDays: totalWorkedDays,
        absences: totalAbsenceDays,
        justified: totalJustifiedDays,
        partial: totalPartialDays,
        workedMinutes: totalWorkedMinutes,
        expectedMinutes: totalExpectedMinutes,
        justifiedMinutes: totalJustifiedMinutes,
        unjustifiedMinutes: totalUnjustifiedMinutes,
        rawDelta,
        netBalance,
        isIrregular,
      },
    };
  }

  async getReport(periodId: string, document: string) {
    const employee = await this.prisma.user.findUnique({
      where: { document },
    });

    if (!employee) {
      throw new Error("Empleado no existe");
    }

    return this.getPeriod(employee.id, periodId);
  }

  async getSummary(periodId: string, document?: string) {
    const period = await this.prisma.workPeriod.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      throw new Error("Periodo no existe");
    }

    const employees = await this.prisma.user.findMany({
      where: {
        role: "EMPLOYEE",
        ...(document ? { document } : {}),
      },
      select: {
        id: true,
        document: true,
        firstName: true,
        lastName: true,
      },
    });

    type ReportRow = {
      employeeId: string;
      document: string;
      name: string;
      workedDays: number;
      absences: number;
      justified: number;
      partial: number;
      workedMinutes: number;
      status: string;
    };

    const rows: ReportRow[] = [];

    for (const employee of employees) {
      const result = await this.getPeriod(employee.id, periodId);

      rows.push({
        employeeId: employee.id,
        document: employee.document,
        name: `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim(),
        workedDays: result.totals.workedDays,
        absences: result.totals.absences,
        justified: result.totals.justified,
        partial: result.totals.partial,
        workedMinutes: result.totals.workedMinutes,
        status:
          result.totals.absences > 0 || result.totals.partial > 0
            ? "IRREGULAR"
            : "OK",
      });
    }

    return {
      totalEmployees: rows.length,
      totalAbsences: rows.reduce((a, r) => a + r.absences, 0),
      totalJustified: rows.reduce((a, r) => a + r.justified, 0),
      rows,
    };
  }
}