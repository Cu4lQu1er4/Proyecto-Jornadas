import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: {
      document: "ADMIN-001",
    },
    update: {},
    create: {
      document: "ADMIN-001",
      passwordHash,
      role: "ADMIN",
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