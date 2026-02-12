import { PrismaService } from "src/prisma/prisma.service";
import { PeriodRepo, Period } from "../domain/period.repo";
import { PeriodDescriptor } from "../domain/period-rules";

export const PERIOD_REPO = Symbol('PERIOD_REPO');

export class PeriodRepoDb implements PeriodRepo {
  constructor(private readonly prisma: PrismaService) {}

  private map(row: any): Period {
    return {
      id: row.id,
      year: row.year,
      month: row.month,
      half: row.half === 1 ? 1 : 2,
      startDate: row.startDate,
      endDate: row.endDate,
      closedAt: row.closedAt,
      closedBy: row.closedBy,
    };
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

  async close(
    id: string,
    data: { closedAt: Date; closedBy: string }
  ): Promise<void> {
    await this.prisma.workPeriod.update({
      where: { id },
      data,
    });
  }

  async list(params: {
    page: number;
    limit: number;
  }): Promise<{ total: number; items: Period[] }> {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.workPeriod.count(),
      this.prisma.workPeriod.findMany({
        skip,
        take: limit,
        orderBy: [
          { year: "desc" },
          { month: "desc" },
          { half: "desc" },
        ],
      }),
    ]);

    return {
      total,
      items: rows.map(r => this.map(r)),
    };
  }

  async findByEmployee(employeeId: string): Promise<Period[]> {
    const rows = await this.prisma.workdayHistory.findMany({
      where: { employeeId },
      select: {
        period: true,
      },
      distinct: ['periodId'],
      orderBy: {
        period: { startDate: 'desc' },
      },
    });

    return rows.map(r => this.map(r.period));
  }

  async hasOpenWorkdays(periodId: string): Promise<boolean> {
    const count = await this.prisma.workdayHistory.count({
      where: {
        periodId,
        endTime: { equals: undefined }
      },
    });

    return count > 0;
  }

  async findByDate(desc: { 
    year: number;
    month: number;
    half: 1 | 2; 
  }): Promise<Period | null> {
    const row = await this.prisma.workPeriod.findUnique({
      where: {
        year_month_half: {
          year: desc.year,
          month: desc.month,
          half: desc.half,
        },
      },
    });

    return row ? this.map(row) : null;
  }
  
  async findOpen(): Promise<Period | null> {
    const row = await this.prisma.workPeriod.findFirst({
      where: { closedAt: null },
    });

    return row ? this.map(row) : null;
  }
}