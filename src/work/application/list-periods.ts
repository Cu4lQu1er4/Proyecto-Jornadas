import { PeriodRepo } from "../domain/period.repo";
import { getExpectedCloseDate } from "./period.utils";

export interface ListPeriodCmd {
  page?: number;
  limit?: number;
}

export class ListPeriods {
  constructor(
    private readonly periodRepo: PeriodRepo,
  ) {}

  async execute(cmd: ListPeriodCmd) {
    const page = cmd.page ?? 1;
    const limit = cmd.limit ?? 12;
    const { total, items } = await this.periodRepo.list({ page, limit });
    const now = new Date();

    return {
      page,
      limit,
      total,
      items: items.map(p => {
        const expectedCloseDate = getExpectedCloseDate(
          p.year,
          p.month,
          p.half
        );

        return {
          id: p.id,
          year: p.year,
          month: p.month,
          half: p.half,
          startDate: p.startDate,
          endDate: p.endDate,
          closedAt: p.closedAt,
          isClosed: !!p.closedAt,
          expectedCloseDate,
          isOverdue: !p.closedAt && now > expectedCloseDate,
        };
      }),
    };
  }
}