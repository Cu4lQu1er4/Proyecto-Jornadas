import { PeriodRepo } from "../domain/period.repo";
import { PeriodClosedError } from "../domain/errors";

export interface ClosePeriodCmd {
  periodId: string;
  closedBy: string;
}

export class ClosePeriod {
  constructor(
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