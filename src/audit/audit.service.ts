import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { SYSTEM_ACTOR } from "./audit.constants";

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async log(params: {
    entityType: string;
    entityId: string;
    action: string;
    performedBy?: string;
    metadata?: Record<string, any>;
  }) {
    return this.prisma.auditEvent.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        performedBy: params.performedBy ?? SYSTEM_ACTOR,
        metadata: params.metadata,
      },
    });
  }

  async logOnce(params: {
    entityType: string;
    entityId: string;
    action: string;
    performedBy?: string;
    metadata?: Record<string, any>;
  }) {
    const exists = await this.prisma.auditEvent.findFirst({
      where: {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
      },
    });

    if (exists) return;
    return this.log(params);
  }
}