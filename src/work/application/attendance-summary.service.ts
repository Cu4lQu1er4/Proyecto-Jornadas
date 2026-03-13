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
        date: day.toISOString().slice(0, 10),
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

    // ✅ 1) PRIMERO: ¿Hay jornada abierta HOY?
    const open = await this.prisma.workdayOpen.findUnique({
      where: { employeeId },
      select: { startTime: true },
    });

    if (open?.startTime) {
      const openStart = new Date(open.startTime);

      if (openStart >= start && openStart < end) {
        // OJO: lo ideal es usar "new Date()" directo (tiempo del servidor).
        // Si necesitas Bogotá, asegúrate de guardar/normalizar con TZ a nivel DB/servidor.
        const now = new Date();

        const workedMinutesLive = Math.max(
          0,
          Math.floor((now.getTime() - openStart.getTime()) / 60000)
        );

        const deltaLive = workedMinutesLive - expectedMinutes;

        const expectedStart = new Date(start);

        const hours = Math.floor(dayConfig.startMinute / 60);
        const minutes = dayConfig.startMinute % 60;

        expectedStart.setHours(hours, minutes, 0, 0);

        console.log("CHECK TIMES". {
          openStartISO: openStart.toISOString(),
          openStartLocal: openStart.toString(),
          expectedStartISO: expectedStart.toISOString(),
          expectedStartLocal: expectedStart.toString(),
          startMinute: dayConfig.startMinute,
        });
        
        const lateArrivalLive = openStart.getTime() > expectedStart.getTime();


        return {
          date: day.toISOString().slice(0, 10),
          workedMinutes: workedMinutesLive,
          expectedMinutes,
          deltaMinutes: deltaLive,
          lateArrival: lateArrivalLive,
          earlyLeave: false, // no puedes saber earlyLeave mientras está abierta
          justifiedMinutes: 0,
          unjustifiedMinutes: Math.max(0, -deltaLive), // si va en negativo, lo muestra como “faltante” en vivo
          status: deltaLive < 0 ? "PARTIALLY_UNJUSTIFIED" : "NORMAL",
          adminCases: [],
          isOpen: true,
        };
      }
    }

    // ✅ 2) SI NO HAY OPEN: buscar history del día
    const histories = await this.prisma.workdayHistory.findMany({
      where: {
        employeeId,
        startTime: { gte: start, lt: end },
      },
      orderBy: {
        startTime: "asc",
      }
    });

    const workedMinutes = histories.reduce(
      (sum, h) => sum + h.workedMinutes,
      0
    );

    const mainHistory =
      histories.find(h => h.workedMinutes > 0) ??
      histories[0];

    const deltaMinutes = workedMinutes - expectedMinutes;

    // ... aquí sigue tu lógica de scopes/justificaciones tal cual ...
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
          if (status === "UNJUSTIFIED_ABSENCE") return "NO_WORK_NO_JUSTIFICATION";
          if (status === "CONFLICT") return "AUTOMATIC_CONFLICT_DETECTED";
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
      lateArrival: mainHistory?.lateArrival ?? false,
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

    const end = new Date(period.endDate);
    end.setHours(0, 0, 0, 0);

    while (current <= end) {
      const ymd = current.toISOString().slice(0, 10);
      days.push(await this.getDay(employeeId, ymd));
      current.setDate(current.getDate() + 1);
    }

    const totalWorked = days.reduce((a, d) => a + d.workedMinutes, 0);
    const totalExpected = days.reduce((a, d) => a + d.expectedMinutes, 0);
    const totalJustified = days.reduce((a, d) => a + d.justifiedMinutes, 0);
    const totalUnjustified = days.reduce((a, d) => a + d.unjustifiedMinutes, 0);

    const rawDelta = totalWorked - totalExpected;
    const netBalance = totalWorked + totalJustified - totalExpected;

    const isIrregular = totalUnjustified > 0;

    return {
      period,
      days,
      totals: {
        worked: totalWorked,
        expected: totalExpected,
        justified: totalJustified,
        unjustified: totalUnjustified,
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
    });

    type ReportRow = {
      employeeId: string;
      document: string;
      workedMinutes: number;
      absences: number;
      justified: number;
      status: string;
    };

    const rows: ReportRow[] = [];

    for (const employee of employees) {
      const result = await this.getPeriod(employee.id, periodId);

      rows.push({
        employeeId: employee.id,
        document: employee.document,
        workedMinutes: result.totals.worked,
        absences: result.totals.unjustified,
        justified: result.totals.justified,
        status: result.totals.unjustified > 0 ? "IRREGULAR" : "OK",
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