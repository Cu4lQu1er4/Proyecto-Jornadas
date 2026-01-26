import { PrismaService } from "src/prisma/prisma.service";
import {
  WorkdayHistoryWriter,
  WorkdayHistoryReader,
  WorkdayHistoryEntry,
  WorkdayHistoryCreate,
  WorkdayHistoryEntryWithAdjustments,
} from "../domain/history.repo";


export class WorkdayHistoryRepoDb
  implements WorkdayHistoryWriter, WorkdayHistoryReader
{
  constructor(private readonly prisma: PrismaService) {}

  async save(entry: WorkdayHistoryCreate): Promise<void> {
    await this.prisma.workdayHistory.create({
      data: {
        employeeId: entry.employeeId,
        startTime: entry.startTime,
        endTime: entry.endTime,
        workedMinutes: entry.workedMinutes,
        expectedMinutes: entry.expectedMinutes,
        deltaMinutes: entry.deltaMinutes,
        lateArrival: entry.lateArrival,
        earlyLeave: entry.earlyLeave,
        periodId: entry.periodId,
      },
    });
  }

  async findByEmployee(
    employeeId: string
  ): Promise<WorkdayHistoryEntry[]> {
    const rows = await this.prisma.workdayHistory.findMany({
      where: { employeeId },
      orderBy: { startTime: "desc" },
    });

    return rows.map(row => ({
      id: row.id,
      employeeId: row.employeeId,
      startTime: row.startTime,
      endTime: row.endTime,
      workedMinutes: row.workedMinutes,
      expectedMinutes: row.expectedMinutes,
      deltaMinutes: row.deltaMinutes,
      lateArrival: row.lateArrival,
      earlyLeave: row.earlyLeave,
      periodId: row.periodId,
      createdAt: row.createdAt,
    }));
  }

  async findById(id: string): Promise<WorkdayHistoryEntry | null> {
    const row = await this.prisma.workdayHistory.findUnique({
      where: { id },
    });

    if (!row) return null;

    return {
      id: row.id,
      employeeId: row.employeeId,
      startTime: row.startTime,
      endTime: row.endTime,
      workedMinutes: row.workedMinutes,
      expectedMinutes: row.expectedMinutes,
      deltaMinutes: row.deltaMinutes,
      lateArrival: row.lateArrival,
      earlyLeave: row.earlyLeave,
      periodId: row.periodId,
      createdAt: row.createdAt,
    };
  }

  async findWithAdjustments(
    employeeId: string,
    from?: Date,
    to?: Date
  ): Promise<WorkdayHistoryEntryWithAdjustments[]> {
    const rows = await this.prisma.workdayHistory.findMany({
      where: {
        employeeId,
          ...(from && { startTime: { gte: from } }),
          ...(to && { endTime: { lte: to } }),
      },
      include: {
        adjustments: true,
      },
      orderBy: { startTime: "desc" },
    });

    return rows.map(row => ({
      id: row.id,
      employeeId: row.employeeId,
      startTime: row.startTime,
      endTime: row.endTime,
      workedMinutes: row.workedMinutes,
      expectedMinutes: row.expectedMinutes,
      deltaMinutes: row.deltaMinutes,
      lateArrival: row.lateArrival,
      earlyLeave: row.earlyLeave,
      periodId: row.periodId,
      createdAt: row.createdAt,
      adjustments: row.adjustments.map(adj => ({
        type: adj.type as "ADD" | "SUBTRACT",
        minutes: adj.minutes,
      })),
    }));
  }

  async findByEmployeeAndPeriod(
    employeeId: string,
    periodId: string
  ): Promise<WorkdayHistoryEntry[]> {
    const rows = await this.prisma.workdayHistory.findMany({
      where: {
        employeeId,
        periodId,
      },
      orderBy: { startTime: 'asc' },
    });

    return rows.map(row => ({
      id: row.id,
      employeeId: row.employeeId,
      startTime: row.startTime,
      endTime: row.endTime,
      workedMinutes: row.workedMinutes,
      expectedMinutes: row.expectedMinutes,
      deltaMinutes: row.deltaMinutes,
      lateArrival: row.lateArrival,
      earlyLeave: row.earlyLeave,
      periodId: row.periodId,
      createdAt: row.createdAt,
    }));
  }
}