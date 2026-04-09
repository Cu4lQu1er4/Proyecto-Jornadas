import { Module } from '@nestjs/common';
import { WorkController } from './work.controller';
import { WorkService } from './work.service';
import { WORKDAY_REPO } from './domain/repo';
import { WorkdayRepoDb } from './infrastructure/repo.db';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { PERIOD_REPO, PeriodRepoDb } from './infrastructure/period.repo.db';
import { AttendanceSummaryController } from './infrastructure/attendance-summary.controller';
import { EmployeeScheduleService } from './application/employee-schedule.service';
import { ScheduleTemplateService } from './application/schedule-template.service';
import { ScheduleTemplateController } from './infrastructure/schedule-template.controller';
import { EmployeeScheduleController } from './infrastructure/employee-schedule.controller';
import { AttendanceSummaryService } from './application/attendance-summary.service';
import { EmployeeScheduleSelfController } from './infrastructure/employee-schedule.self.controller';

@Module({
  imports: [
    PrismaModule,
  ],
  controllers: [
    WorkController,
    AttendanceSummaryController,
    ScheduleTemplateController,
    EmployeeScheduleController,
    EmployeeScheduleSelfController,
  ],
  providers: [
    {
      provide: WORKDAY_REPO,
      useClass: WorkdayRepoDb,
    },
    {
      provide: PERIOD_REPO,
      useClass: PeriodRepoDb,
    },
    WorkService,
    PrismaService,
    AttendanceSummaryService,
    EmployeeScheduleService,
    ScheduleTemplateService,
  ],
  exports: [
    WORKDAY_REPO,
    WorkService,
  ],
})
export class WorkModule {}
