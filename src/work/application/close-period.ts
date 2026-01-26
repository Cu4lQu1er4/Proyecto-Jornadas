import type { PeriodRepo } from "../domain/period.repo";
import { PeriodClosedError } from "../domain/errors";
import { Injectable } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { PERIOD_REPO } from "../infrastructure/period.repo.db";

export interface ClosePeriodCmd {
  periodId: string;
  closedBy: string;
}

@Injectable()
export class ClosePeriod {
  constructor(
    @Inject(PERIOD_REPO)
    private readonly periodRepo: PeriodRepo,
  ) {}

  async execute(cmd: ClosePeriodCmd): Promise<void> {
    const period = await this.periodRepo.findById(cmd.periodId);

    if (!period) {
      throw new Error('Periodo no encontrado');
    }

    if (period.closedAt) {
      throw new PeriodClosedError();
    }

    await this.periodRepo.close(period.id, {
      closedAt: new Date(),
      closedBy: cmd.closedBy,
    });
  }
}