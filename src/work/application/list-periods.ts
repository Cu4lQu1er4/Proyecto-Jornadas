import { PeriodRepo } from "../domain/period.repo";

export interface ListPeriodCmd {
  page?: number;
  limit?: number;
}

export class ListPeriods {
  constructor(
    private readonly periodRepo: PeriodRepo,
  ) {}

  async execute(cmd: ListPeriodCmd) {
    const page = cmd.page ?? 1
    const limit = cmd.limit ?? 12

    const { total, items } = await this.periodRepo.list({ page, limit })

    return {
      page,
      limit,
      total,
      items: items.map(p => ({
        id: p.id,
        year: p.year,
        month: p.month,
        half: p.half,
        startDate: p.startDate,
        endDate: p.endDate,
        closedAt: p.closedAt,
        isClosed: !!p.closedAt,
      })),
    }
  }
}