import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { AdminCaseService } from "./application/admin-case.service";
import { AdminCaseController } from "./infrastructure/admin-case.controller";
import { AuditModule } from "src/audit/audit.module";

@Module({
  imports: [
    PrismaModule,
    AuditModule,
  ],
  providers: [AdminCaseService],
  controllers: [AdminCaseController]
})

export class AdminCaseModule {}