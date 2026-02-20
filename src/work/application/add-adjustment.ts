import { WorkdayAdjustmentRepo } from "../domain/adjustment.repo";
import { WorkdayHistoryReader } from "../domain/history.repo";
import { WorkdayAdjustment } from "../domain/adjustment";
// import { PeriodRepo } from "../domain/period.repo";
// import { PeriodClosedError } from "../domain/errors";

export interface AddAdjustmentCmd {
  historyId: string;
  type: 'ADD' | 'SUBTRACT';
  minutes: number;
  reason: string;
  approvedBy: string;
}

export class AddWorkdayAdjustment {
  constructor(
    private readonly historyRepo: WorkdayHistoryReader,
    private readonly adjustmentRepo: WorkdayAdjustmentRepo,
  ) {}

  async execute(cmd: AddAdjustmentCmd): Promise<void> {
    const history = await this.historyRepo.findById(cmd.historyId);

    if (!history) {
      throw new Error('Workday history not found');
    }

    // const period = await this.periodRepo.findById(history.periodId);

    // if (!period) {
    //   throw new Error('Period not found');
    // }

    // if (period.closedAt) {
    //   throw new PeriodClosedError();
    // }

    const adjustment: WorkdayAdjustment = {
      historyId: cmd.historyId,
      type: cmd.type,
      minutes: cmd.minutes,
      reason: cmd.reason,
      approvedBy: cmd.approvedBy,
    };

    await this.adjustmentRepo.add(adjustment);
  }
}
