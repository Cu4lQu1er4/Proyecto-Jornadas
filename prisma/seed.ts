import { PrismaClient, AdminCaseStatus, AdminCaseType } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("123456", 10);

  const admin = await prisma.user.create({
    data: {
      document: "1000",
      passwordHash,
      role: "ADMIN",
      active: true,
      firstName: "Admin",
      lastName: "Principal",
      mustChangePassword: false,
      profileCompleted: true,
    },
  });

  const employee1 = await prisma.user.create({
    data: {
      document: "2000",
      passwordHash,
      role: "EMPLOYEE",
      active: true,
      firstName: "Carlos",
      lastName: "Ramirez",
      mustChangePassword: false,
      profileCompleted: true,
    },
  });

  const employee2 = await prisma.user.create({
    data: {
      document: "3000",
      passwordHash,
      role: "EMPLOYEE",
      active: true,
      firstName: "Laura",
      lastName: "Martinez",
      mustChangePassword: false,
      profileCompleted: true,
    },
  });

  const period = await prisma.workPeriod.create({
    data: {
      year: 2026,
      month: 2,
      half: 2,
      startDate: new Date("2026-02-16"),
      endDate: new Date("2026-02-28"),
    },
  });

  const template = await prisma.scheduleTemplate.create({
    data: {
      name: "Horario Oficina",
      days: {
        create: [
          { weekday: 1, startMinute: 480, endMinute:1020 },
          { weekday: 2, startMinute: 480, endMinute:1020 },
          { weekday: 3, startMinute: 480, endMinute:1020 },
          { weekday: 4, startMinute: 480, endMinute:1020 },
          { weekday: 5, startMinute: 480, endMinute:1020 },
        ],
      },
    },
  });

  await prisma.employeeScheduleAssignment.createMany({
    data: [
      {
        employeeId: employee1.id,
        
        scheduleTemplateId: template.id,
        effectiveFrom: new Date("2026-01-01"),
      },
      {
        employeeId: employee2.id,
        scheduleTemplateId: template.id,
        effectiveFrom: new Date("2026-01-01"),
      },
    ],
  });

  await prisma.adminCase.create({
    data: {
      employeeId: employee1.id,
      type: AdminCaseType.PERMISSION,
      status: AdminCaseStatus.PENDING,
      createdBy: employee1.id,
      notes: "Llegue tarde por trafico",
      scopes: {
        create: [
          {
            date: new Date("2026-02-18"),
            startMinute: 540,
            endMinute: 600,
          },
        ],
      },
    },
  });

  await prisma.adminCase.create({
    data: {
      employeeId: employee1.id,
      type: AdminCaseType.INCAPACITY,
      status: AdminCaseStatus.APPLIED,
      createdBy: employee1.id,
      appliedBy: admin.id,
      appliedAt: new Date(),
      scopes: {
        create: [
          {
            date: new Date("2026-02-19"),
          },
        ],
      },
    },
  });

  await prisma.adminCase.create({
    data: {
      employeeId: employee2.id,
      type: AdminCaseType.JUSTIFICATION,
      status: AdminCaseStatus.REJECTED,
      createdBy: employee2.id,
      rejectedBy: admin.id,
      rejectedAt: new Date(),
      rejectedReason: "No se adjunto evidencia",
      scopes: {
        create: [
          {
            date: new Date("2026-02-21"),
            startMinute: 480,
            endMinute: 600,
          },
        ],
      },
    },
  });

  console.log("Seed completado correctamente");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });