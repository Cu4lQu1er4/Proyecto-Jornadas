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
import { CloudinaryService } from "src/files/cloudinary.service";
import { Prisma } from "@prisma/client";

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
    private readonly cloudinary: CloudinaryService,
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

  async approve(caseId: string, adminId: string) {
    const adminCase = await this.prisma.adminCase.findUnique({
      where: { id: caseId },
      include: { scopes: true, attachments: true },
    });

    if (!adminCase) {
      throw new NotFoundException("Caso no existe");
    }

    if (adminCase.status !== AdminCaseStatus.PENDING) {
      throw new BadRequestException({
        code: "INVALID_CASE_STATUS",
        message: "Solo se pueden aprobar solicitudes pendientes",
      });
    }

    if (!adminCase.scopes || adminCase.scopes.length === 0) {
      throw new BadRequestException({
        code: "CASE_WITHOUT_SCOPES",
        message: "El caso no tiene alcances definidos",
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
      for (const otherCase of otherCases) {
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
              code: "ADMIN_CASE_OVERLAP",
              message: "La solicitud se solapa con otro caso aplicado",
              date: scope.date.toISOString().slice(0, 10),
              conflictingCaseId: otherCase.id,
            });
          }
        }
      }
    }

    const approved = await this.prisma.adminCase.update({
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
      action: "APPROVE",
      performedBy: adminId,
    });

    return approved;
  }

  async cancel(caseId: string, reason: string, adminId: string) {
    const adminCase = await this.prisma.adminCase.findUnique({
      where: { id: caseId },
      include: { scopes: true, attachments: true },
    });

    if (!adminCase) {
      throw new NotFoundException("Caso no existe");
    }

    if (adminCase.status === AdminCaseStatus.CANCELLED) {
      return adminCase;
    }

    if (
      adminCase.status !== AdminCaseStatus.APPLIED &&
      adminCase.status !== AdminCaseStatus.PENDING
    ) {
      throw new ConflictException({
        code: "INVALID_CASE_STATUS",
        message: `No se puede cancelar un caso en estado ${adminCase.status}`,
      });
    }

    if (adminCase.status === AdminCaseStatus.APPLIED) {
      const scopeDates = adminCase.scopes.map((s) => s.date);
      await assertNoClosedPeriods(this.prisma, scopeDates);
    }

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
        previousStatus: adminCase.status,
        reason,
      },
    });

    return cancelled;
  }

  async isOperationalDay(employeeId: string, date: Date): Promise<boolean> {
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);

    console.log("Input date:", date);
    console.log("Normalized day:", day);
    console.log("Weekday getDay():", day.getDay());

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

    console.log("Assignment found:", assignment);

    if (!assignment) return false;

    const weekday = day.getDay();

    const hasDay = assignment.template.days.some(
      d => d.weekday === weekday
    );

    console.log("Template days:", assignment?.template.days);
    console.log("Has operational day:", hasDay)

    return hasDay;
  }

  async listByEmployee(
    employeeId: string,
    page: number = 1,
    limit: number = 10,
    status?: AdminCaseStatus,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      employeeId,
    };

    if (status) {
      where.status = status as AdminCaseStatus;
    }

    const [data, total] = await Promise.all([
      this.prisma.adminCase.findMany({
        where,
        include: { scopes: true, attachments: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.adminCase.count({ where }),
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

    if (!reason || !reason.trim()) {
      throw new BadRequestException("Debe indicar un motivo de rechazo");
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
        rejectedReason: reason,
      },
      include: { scopes: true },
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

  async cancelByEmployee(caseId: string, employeeId: string) {
    const adminCase = await this.prisma.adminCase.findUnique({
      where: { id: caseId },
    });

    if (!adminCase) {
      throw new NotFoundException("Caso no existe");
    }

    if (adminCase.employeeId !== employeeId) {
      throw new BadRequestException("No autorizado");
    }

    if (adminCase.status !== AdminCaseStatus.PENDING) {
      throw new BadRequestException(
        "Solo puedes cancelar solicitudes pendientes"
      );
    }

    return this.prisma.adminCase.update({
      where: { id: caseId },
      data: {
        status: AdminCaseStatus.CANCELLED,
      },
    });
  }

  async createByAdmin(dto: CreateAdminCaseDto, adminId: string) {
    const scopesDates = dto.scopes.map(s => normalizeDay(s.date));
    await assertNoClosedPeriods(this.prisma, scopesDates);

    const scopes = dto.scopes.map((s) => {
      validateScopeMinutes(s.startMinute, s.endMinute);

      return {
        date: normalizeDay(s.date),
        startMinute: s.startMinute ?? null,
        endMinute: s.endMinute ?? null,
        workdayHistoryId: s.workdayHistoryId ?? null,
      };
    });

    const otherCases = await this.prisma.adminCase.findMany({
      where: {
        employeeId: dto.employeeId,
        status: AdminCaseStatus.APPLIED,
      },
      include: { scopes: true },
    });

    for (const scope of scopes) {
      for (const otherCase of otherCases) {
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
              code: "ADMIN_CASE_OVERLAP",
              message: "El caso se solapa con otro y aplicado",
              date: scope.date.toISOString().slice(0, 10),
              conflictingCaseId: otherCase.id,
            });
          }
        }
      }
    }

    const created = await this.prisma.adminCase.create({
      data: {
        employeeId: dto.employeeId,
        type: dto.type,
        status: AdminCaseStatus.APPLIED,
        reasonCode: dto.reasonCode,
        notes: dto.notes,
        createdBy: adminId,
        appliedBy: adminId,
        appliedAt: new Date(),
        scopes: { create: scopes },
      },
      include: { scopes: true },
    });

    await this.audit.log({
      entityType: "ADMIN_CASE",
      entityId: created.id,
      action: "ADMIN_CREATE_APPLIED",
      performedBy: adminId,
    });

    return created;
  }

  async createByEmployeeWithEvidence(
    dto: CreateAdminCaseDto,
    employeeId: string,
    files: Express.Multer.File[],
  ) {
    const created = await this.createByEmployee(dto, employeeId);

    if (!files?.length) {
      return this.prisma.adminCase.findUnique({
        where: { id: created.id },
        include: { scopes: true, attachments: true },
      });
    }

    const attachmentsToCreate: Prisma.AdminCaseAttachmentCreateManyInput[] = [];
    for (const f of files) {
      const up = await this.cloudinary.uploadBuffer(
        f.buffer,
        f.mimetype,
         { folder: "admin-cases", }
        );

        console.log("UPLOAD RESULT:", up)

      attachmentsToCreate.push({
        adminCaseId: created.id,
        url: up.secure_url,
        publicId: up.public_id,
        resourceType: up.resource_type,
        format: up.format ?? null,
        bytes: up.bytes ?? null,
        originalName: f.originalname ?? null,
      });
    }

    await this.prisma.adminCaseAttachment.createMany({
      data: attachmentsToCreate,
    });

    return this.prisma.adminCase.findUnique({
      where: { id: created.id },
      include: { scopes: true, attachments: true },
    });
  }

  async findAttachmentById(id: string) {
    const attachment = await this.prisma.adminCaseAttachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      throw new NotFoundException("Adjunto no encontrado");
    }

    const signedUrl = this.cloudinary.getSignedUrl({
      publicId: attachment.publicId,
      resourceType: attachment.resourceType as "image" | "raw",
      format: attachment.format,
    });

    return {
      ...attachment,
      signedUrl,
    };
  }
}