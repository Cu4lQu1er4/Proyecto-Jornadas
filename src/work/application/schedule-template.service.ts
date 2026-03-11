import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class ScheduleTemplateService {
  constructor(
    private readonly prisma: PrismaService
  ) {}

  async create(data: {
    name: string;
    days: {
      weekday: number;
      startMinute: number;
      endMinute: number;
    }[];
  }) {
    return this.prisma.scheduleTemplate.create({
      data: {
        name: data.name,
        days: {
          create: data.days,
        },
      },
      include: {
        days: true,
      },
    });
  }

  async list() {
    return this.prisma.scheduleTemplate.findMany({
      include: {
        days: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async update(id: string, data:{
    name?: string;
    days?: {
      weekday: number;
      startMinute: number;
      endMinute: number;
    }[];
  }) {
    if (data.days) {
      await this.prisma.scheduleTemplateDay.deleteMany({
        where: { scheduleTemplateId: id },
      });

      await this.prisma.scheduleTemplateDay.createMany({
        data: data.days.map(d => ({
          scheduleTemplateId: id,
          weekday: d.weekday,
          startMinute: d.startMinute,
          endMinute: d.endMinute,
        })),
      });
    }

    return this.prisma.scheduleTemplate.update({
      where: { id },
      data: {
        name: data.name,
      },
      include: {
        days: true,
      },
    });
  }

  async remove(id: string) {
    const assignments = await this.prisma.employeeScheduleAssignment.count({
      where: { scheduleTemplateId: id },
    });

    if (assignments > 0) {
      throw new Error("No se puede eliminar un horario que esta en uso");
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.scheduleTemplateDay.deleteMany({
        where: { scheduleTemplateId: id },
      });

      return tx.scheduleTemplate.delete({
        where: { id },
      });
    });
  }
}