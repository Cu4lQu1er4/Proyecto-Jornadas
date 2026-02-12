import { Module } from '@nestjs/common';
import { WorkController } from './work.controller';
import { WorkService } from './work.service';
import { WORKDAY_REPO } from './domain/repo';
import { WorkdayRepoDb } from './infrastructure/repo.db';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { PERIOD_REPO, PeriodRepoDb } from './infrastructure/period.repo.db';
import { AttendanceSummaryService } from './application/attendance-summary.service';
import { AttendanceSummaryController } from './infrastructure/attendance-summary.controller';

@Module({
  imports: [
    PrismaModule,
  ],
  controllers: [
    WorkController,
    AttendanceSummaryController,
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
    AttendanceSummaryService
  ],
  exports: [
    WORKDAY_REPO,
    WorkService,
  ],
})
export class WorkModule {}
