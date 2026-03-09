import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { AdminCaseService } from "./application/admin-case.service";
import { AdminCaseController } from "./infrastructure/admin-case.controller";
import { AuditModule } from "src/audit/audit.module";
import { EmployeeAdminCaseController } from "./infrastructure/employee-admin-case.controller";
import { FilesModule } from "src/files/files.module";

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    FilesModule,
  ],
  providers: [AdminCaseService],
  controllers: [
    AdminCaseController,
    EmployeeAdminCaseController,
  ]
})

export class AdminCaseModule {}