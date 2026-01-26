import { Injectable } from "@nestjs/common";
import { StartWorkday } from "./application/start";
import { EndWorkday } from "./application/end";
import { GetWorkHistory } from "./application/history";
import { WorkdayRepoDb } from "./infrastructure/repo.db";
import { WorkdayHistoryRepoDb } from "./infrastructure/history.repo.db";
import { PrismaService } from "src/prisma/prisma.service";
import { workdayRules } from "./workday.rules";
import { AddWorkdayAdjustment } from "./application/add-adjustment";
import { WorkdayAdjustmentRepoDb } from "./infrastructure/adjustment.repo.db";
import { PeriodRepoDb } from "./infrastructure/period.repo.db";
import { PeriodRepo } from "./domain/period.repo";
import { ListPeriods } from "./application/list-periods";
import { ClosePeriod } from "./application/close-period";

 
@Injectable()
export class WorkService {
  private repo: WorkdayRepoDb;
  private historyRepo: WorkdayHistoryRepoDb;
  private startUC: StartWorkday;
  private endUC: EndWorkday;
  private historyUC: GetWorkHistory;
  private adjustmentRepo: WorkdayAdjustmentRepoDb;
  private addAdjustmentUC: AddWorkdayAdjustment;
  private periodRepo: PeriodRepo;
  private listPeriodUC: ListPeriods;
  private closePeriodUC: ClosePeriod;

  constructor(prisma: PrismaService) {
    this.repo = new WorkdayRepoDb(prisma);
    this.historyRepo = new WorkdayHistoryRepoDb(prisma);
    this.startUC = new StartWorkday(this.repo);
    this.periodRepo = new PeriodRepoDb(prisma);
    this.endUC = new EndWorkday(
      this.repo,
      this.historyRepo,
      workdayRules,
      this.periodRepo,
    );
    this.historyUC = new GetWorkHistory(this.historyRepo);
    this.adjustmentRepo = new WorkdayAdjustmentRepoDb(prisma);
    this.addAdjustmentUC = new AddWorkdayAdjustment(
      this.historyRepo,
      this.adjustmentRepo,
    );
    this.listPeriodUC = new ListPeriods(this.periodRepo);
    this.closePeriodUC = new ClosePeriod(this.periodRepo);
  }

  async start(employeeId: string): Promise<void> {
    await this.startUC.execute({
      employeeId,
      now: new Date(),
    });
  }

  async end(employeeId: string, now: Date) {
    return this.endUC.execute({
      employeeId,
      now,
    });
  }

  async history(
    employeeId: string,
    from?: Date,
    to?: Date,
  ) {
    return this.historyUC.execute({
      employeeId
    });
  }

  async addAdjustment(cmd: {
    historyId: string;
    type: 'ADD' | 'SUBTRACT';
    minutes: number;
    reason: string;
    approvedBy: string;
  }): Promise<void> {
    await this.addAdjustmentUC.execute(cmd);
  }

  async listPeriods(params: { page?: number; limit?: number }) {
    return this.listPeriodUC.execute(params);
  }

  async closePeriod(periodId: string, closedBy: string) {
    return this.closePeriodUC.execute({ periodId, closedBy });
  }
}
