import { PeriodRepo } from "../domain/period.repo";
import { PeriodDescriptor } from "../domain/period-rules";

export class GetOrCreatePeriod {
  constructor(private readonly repo: PeriodRepo) {}

  async execute(desc: PeriodDescriptor) {
    const existing = await this.repo.findByDate(desc);
    if (existing) {
      return existing;
    }

    return this.repo.create(desc);
  }
}