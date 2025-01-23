import { PrismaService } from "src/prisma/prisma.service";
import { PeriodRepo, Period } from "../domain/period.repo";
import { PeriodDescriptor } from "../domain/period-rules";

export class PeriodRepoDb implements PeriodRepo {
  constructor(private readonly prisma: PrismaService) {}

  private map(row: any): Period {
    return {
      id: row.id,
      year: row.year,
      month: row.month,
      half: (row.half === 1 ? 1 : 2),
      startDate: row.startDate,
      endDate: row.endDate,
      closedAt: row.closedAt,
      closedBy: row.closedBy,
    };
  }

  async findByDate(desc: PeriodDescriptor): Promise<Period | null> {
    const existing = await this.prisma.workPeriod.findUnique({
      where: {
        year_month_half: {
          year: desc.year,
          month: desc.month,
          half: desc.half,
        },
      },
    });

    return existing ? this.map(existing) : null;
  }

  async findById(id: string): Promise<Period | null> {
    const row = await this.prisma.workPeriod.findUnique({ where: { id } });
    return row ? this.map(row) : null;
  }

  async create(desc: PeriodDescriptor): Promise<Period> {
    const row = await this.prisma.workPeriod.create({
      data: {
        year: desc.year,
        month: desc.month,
        half: desc.half,
        startDate: desc.startDate,
        endDate: desc.endDate,
        closedAt: null,
        closedBy: null,
      },
    });

    return this.map(row);
  }

  async findOrCreate(desc: PeriodDescriptor): Promise<Period> {
    const existing = await this.findByDate(desc);
    if (existing) return existing;
    return this.create(desc);
  }

  async close(id: string, data: { closedAt: Date; closedBy: string }): Promise<void> {
    await this.prisma.workPeriod.update({
      where: { id },
      data: {
        closedAt: data.closedAt,
        closedBy: data.closedBy,
      },
    });
  }
}
