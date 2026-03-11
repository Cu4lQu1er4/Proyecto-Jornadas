import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("123456", 10);
  const pinHash = await bcrypt.hash("1234", 10);
  
  const users = [
    //Admin de prueba
    {
      document: "3000",
      role: "ADMIN"
    }
  ];

  for (const user of users) {
    await prisma.user.create({
      data: {
        document: user.document,
        role: user.role,
        passwordHash,
        pinHash,
        mustChangePassword: true,
        mustChangePin: true,
        profileCompleted: false,
        active: true
      }
    });
  }

  console.log("Usuarios creados correctamente");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());