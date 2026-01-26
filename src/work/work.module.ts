import { Module } from '@nestjs/common';
import { WorkController } from './work.controller';
import { WorkService } from './work.service';
import { WORKDAY_REPO } from './domain/repo';
import { WorkdayRepoDb } from './infrastructure/repo.db';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ClosePeriod } from './application/close-period';
import { PrismaService } from 'src/prisma/prisma.service';
import { PERIOD_REPO, PeriodRepoDb } from './infrastructure/period.repo.db';

@Module({
  imports: [
    PrismaModule,
  ],
  controllers: [WorkController],
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
  ],
  exports: [WORKDAY_REPO],
})
export class WorkModule {}
