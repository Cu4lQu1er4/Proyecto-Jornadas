import { 
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { AdminCaseStatus } from "@prisma/client";
import { CreateAdminCaseDto } from "./create-admin-case.dto";
import { 
  normalizeDay,
  scopesOverlap,
  validateScopeMinutes,
} from "../domain/admin-case.rules";
import { AuditService } from "src/audit/audit.service";

async function assertNoClosedPeriods(
  prisma: PrismaService,
  dates: Date[],
) {
  const periods = await prisma.workPeriod.findMany({
    where: {
      closedAt: { not: null },
      startDate: { lte: new Date(Math.max(...dates.map(d => d.getTime()))) },
      endDate: { gte: new Date(Math.min(...dates.map(d => d.getTime()))) },
    },
  });

  if (periods.length > 0) {
    throw new ConflictException({
      code: 'PERIOD_CLOSED',
      message: 'El periodo esta cerrado',
    });
  }
}

@Injectable()
export class AdminCaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createByEmployee(dto: CreateAdminCaseDto, employeeId: string) {
    const scopeDates = dto.scopes.map(s => normalizeDay(s.date));
    await assertNoClosedPeriods(this.prisma, scopeDates);

    const scopes = dto.scopes.map((s) => {
      validateScopeMinutes(s.startMinute, s.endMinute);

      return {
        date: normalizeDay(s.date),
        startMinute: s.startMinute ?? null,
        endMinute: s.endMinute ?? null,
        workdayHistoryId: s.workdayHistoryId ?? null,
      };
    });
    for (const scope of scopes) {
      const operational = await this.isOperationalDay(
        dto.employeeId,
        scope.date,
      );

      if (!operational) {
        throw new BadRequestException({
          code: 'NON_OPERATIONAL_DAY',
          message:
            'No se puede crear una solicitud en un dia no laborable',
          date: scope.date.toISOString().slice(0, 10),
        });
      }
    }

    const created = await this.prisma.adminCase.create({
      data: {
        employeeId: dto.employeeId,
        type: dto.type,
        status: AdminCaseStatus.PENDING,
        reasonCode: dto.reasonCode,
        notes: dto.notes,
        createdBy: employeeId,
        scopes: { create: scopes },
      },
      include: { scopes: true },
    });

    await this.audit.log({
      entityType: "ADMIN_CASE",
      entityId: created.id,
      action: "EMPLOYEE_SUBMITED",
      performedBy: employeeId,
    });

    return created;
  }

  async apply(caseId: string, adminId: string) {
    const adminCase = await this.prisma.adminCase.findUnique({
      where: { id: caseId },
      include: { scopes: true },
    });

    if (!adminCase) {
      throw new NotFoundException('Caso no existe');
    }

    if (adminCase.status === AdminCaseStatus.APPLIED) {
      throw new BadRequestException({
        code: 'CASE_ALREADY_APPLIED',
        message: 'El caso ya fue aplicado',
      });
    }

    if (adminCase.status !== AdminCaseStatus.PENDING) {
      throw new BadRequestException({
        code: 'INVALID_CASE_STATUS',
        message: `No se puede aplicar un caso en estado ${adminCase.status}`,
      });
    }

    if (!adminCase.scopes || adminCase.scopes.length === 0) {
      throw new BadRequestException({
        code: 'CASE_WITHOUT_SCOPES',
        message: 'El caso no tiene alcances definidos',
      });
    }

    const otherCases = await this.prisma.adminCase.findMany({
      where: {
        employeeId: adminCase.employeeId,
        status: AdminCaseStatus.APPLIED,
        NOT: { id: adminCase.id },
      },
      include: { scopes: true },
    });

    for (const scope of adminCase.scopes) {
      for(const otherCase of otherCases) {
        for (const otherScope of otherCase.scopes) {
          if (scope.date.getTime() !== otherScope.date.getTime()) continue;

          if (
            scopesOverlap(
              scope.startMinute,
              scope.endMinute,
              otherScope.startMinute,
              otherScope.endMinute,
            )
          ) {
            throw new BadRequestException({
              code: 'ADMIN_CASE_OVERLAP',
              message: 'El caso se solapa con otro caso administrativo aplicado',
              date: scope.date.toISOString().slice(0, 10),
              conflictingCaseId: otherCase.id,
            });
          }
        }
      }
    }

    const applied = await this.prisma.adminCase.update({
      where: { id: caseId },
      data: {
        status: AdminCaseStatus.APPLIED,
        appliedBy: adminId,
        appliedAt: new Date(),
      },
      include: { scopes: true },
    });

    await this.audit.log({
      entityType: "ADMIN_CASE",
      entityId: caseId,
      action: "APPLY",
      performedBy: adminId,
      metadata: {
        scopes: applied.scopes.map(s => ({
          date: s.date,
          startMinute: s.startMinute,
          endMinute: s.endMinute,
        })),
      },
    });

    return applied;
  }

  async cancel(caseId: string, reason: string, adminId: string) {
    const adminCase = await this.prisma.adminCase.findUnique({
      where: { id: caseId },
      include: { scopes: true },
    });

    if (!adminCase) {
      throw new NotFoundException('Caso no existe');
    }

    if (adminCase.status === AdminCaseStatus.CANCELLED) {
      return adminCase;
    }

    if (adminCase.status !== AdminCaseStatus.APPLIED) {
      throw new ConflictException('CASE_NOT_APPLIED');
    }

    const scopeDates = adminCase.scopes.map(s => s.date);
    await assertNoClosedPeriods(this.prisma, scopeDates);

    const cancelled = await this.prisma.adminCase.update({
      where: { id: caseId },
      data: {
        status: AdminCaseStatus.CANCELLED,
        cancelledBy: adminId,
        cancelledAt: new Date(),
        cancelReason: reason,
      },
      include: { scopes: true },
    });

    await this.audit.log({
      entityType: "ADMIN_CASE",
      entityId: caseId,
      action: "CANCEL",
      performedBy: adminId,
      metadata: {
        reason,
      },
    });

    return cancelled
  }

  async isOperationalDay(employeeId: string, date: Date): Promise<boolean> {
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);

    const assignment = await this.prisma.employeeScheduleAssignment.findFirst({
      where: {
        employeeId,
        effectiveFrom: { lte: day },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: day } },
        ],
      },
      include: {
        template: {
          include: {
            days: true,
          },
        },
      },
    });

    if (!assignment) return false;

    const weekday = day.getDay();

    const hasDay = assignment.template.days.some(
      d => d.weekday === weekday
    );

    return hasDay;
  }

  async listByEmployee(
    employeeId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.adminCase.findMany({
        where: { employeeId },
        include: { scopes: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.adminCase.count({
        where: { employeeId },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async reject(caseId: string, reason: string, adminId: string) {
    const adminCase = await this.prisma.adminCase.findUnique({
      where: { id: caseId },
    });

    if (!adminCase) {
      throw new NotFoundException('Caso no existe');
    }

    if (adminCase.status !== AdminCaseStatus.PENDING) {
      throw new BadRequestException({
        code: 'INVALID_STATUS',
        message: 'Solo se pueden rechazar solicitudes pendientes',
      });
    }

    const rejected = await this.prisma.adminCase.update({
      where: { id: caseId },
      data: {
        status: AdminCaseStatus.REJECTED,
        rejectedBy: adminId,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    });

    await this.audit.log({
      entityType: "ADMIN_CASE",
      entityId: caseId,
      action: "REJECT",
      performedBy: adminId,
      metadata: { reason },
    });

    return rejected;
  }
}