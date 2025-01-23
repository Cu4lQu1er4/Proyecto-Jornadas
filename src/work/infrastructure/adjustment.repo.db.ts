import { PrismaService } from "src/prisma/prisma.service";
import { WorkdayAdjustmentRepo } from "../domain/adjustment.repo";
import { WorkdayAdjustment } from "../domain/adjustment";

export class WorkdayAdjustmentRepoDb implements WorkdayAdjustmentRepo {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async add(adjustment: WorkdayAdjustment): Promise<void> {
    await this.prisma.workdayAdjustment.create({
      data: {
        historyId: adjustment.historyId,
        type: adjustment.type,
        minutes: adjustment.minutes,
        reason: adjustment.reason,
        approvedBy: adjustment.approvedBy,
      },
    });
  }

  async findByHistory(
    historyId: string,
  ): Promise<WorkdayAdjustment[]> {
    const rows = await this.prisma.workdayAdjustment.findMany({
      where: { historyId },
      orderBy: { createdAt: 'asc' },
    });

    return rows.map(row => ({
      historyId: row.historyId,
      type: row.type as any,
      minutes: row.minutes,
      reason: row.reason,
      approvedBy: row.approvedBy,
    }));
  }
}