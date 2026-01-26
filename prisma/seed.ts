import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("buenas123", 10);

  await prisma.user.upsert({
    where: {
      document: "EMP-2",
    },
    update: {},
    create: {
      document: "EMP-2",
      passwordHash,
      role: "EMPLOYEE",
      active: true,
    },
  });

  console.log("Usuario admin creado");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });