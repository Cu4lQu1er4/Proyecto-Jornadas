import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("123456", 10);
  const pinHash = await bcrypt.hash("1234", 10);
  
  const users = [
    //Admin de prueba
    {
      document: "1000",
      role: "ADMIN"
    },
    //Empleado de prueba
    {
      document: "2000",
      role: "EMPLOYEE"
    },

    //EMPLEADOS REALES

    //JUAN CARLOS PERDOMO
    {
      document: "1032424179",
      role: "EMPLOYEE"
    },

    //YEFERSON ANDRES MELO
    {
      document: "1013598884",
      role: "EMPLOYEE"
    },

    //PERDO ANTONIO GARCIA
    {
      document: "79752535",
      role: "EMPLOYEE"
    },

    // BRAYAN FERNEY QUITIAN
    {
      document: "1070986753",
      role: "EMPLOYEE"
    },

    //EDIT YULIETH GONZALES
    {
      document: "1073155333",
      role: "EMPLOYEE"
    },

    //EDIT ADMIN
    {
      document: "1111",
      role: "ADMIN"
    },

    //CRISTIAN DAVID SUA
    {
      document: "1003691364",
      role: "EMPLOYEE"
    },

    //MICHAEL GIOVANNY GALVIS
    {
      document: "1073161997",
      role: "EMPLOYEE"
    },

    //MICHAEL ADMIN
    {
      document: "2222",
      role: "ADMIN"
    },

    //JUAN BAUTISTA MARTINES
    {
      document: "5712369",
      role: "EMPLOYEE"
    },

    //MILLER ALEJANDRO BELTRAN
    {
      document: "1073176728",
      role: "EMPLOYEE"
    },

    //LIBIA PATRICIA CASAS
    {
      document: "52785006",
      role: "EMPLOYEE"
    },

    //ANGELICA MARIA PARRA
    {
      document: "52332536",
      role: "EMPLOYEE"
    },

    //OLGA LUCIA CORTES
    {
      document: "52339173",
      role: "EMPLOYEE"
    },

    //JOHAN SEBASTIAN RIVEROS
    {
      document: "1073176764",
      role: "EMPLOYEE"
    },

    //PEDRO RUIZ BLANCO
    {
      document: "88187758",
      role: "EMPLOYEE"
    },

    //ANDERSSON STEVEN GUZMAN
    {
      document: "1003765125",
      role: "EMPLOYEE"
    },

    //CARLOS EDUARDO TAPIERO
    {
      document: "80125177",
      role: "EMPLOYEE"
    },

    //BLANCA CECILIA RAMOS
    {
      document: "40034866",
      role: "EMPLOYEE"
    },

    //FABIAN DAVID MEDINA
    {
      document: "1000938552",
      role: "EMPLOYEE"
    },

    //JNEINS MATHEO GARZON
    {
      document: "1003690018",
      role: "EMPLOYEE"
    },

    //DANIEL ALEXANDER SALAMANCA
    {
      document: "1019988826",
      role: "EMPLOYEE"
    },

    //CARLOS ENRIQUE IBARRA
    {
      document: "79233679",
      role: "EMPLOYEE"
    },

    //LEIDI TATIANA GOMEZ
    {
      document: "1010006565",
      role: "EMPLOYEE"
    },

    //ANGEL FORERO CASTELLANOS
    {
      document: "3262447",
      role: "EMPLOYEE"
    },

    //LUIS EDUARDO ARIAS
    {
      document: "1070917037",
      role: "EMPLOYEE"
    },

    //JOSE GUILLERMO RIVEROS
    {
      document: "80429197",
      role: "EMPLOYEE"
    },

    //FRANCISCO JOSE ALVAREZ
    {
      document: "5178473",
      role: "EMPLOYEE"
    },

    //RUBEN DARIO SECO
    {
      document: "684345",
      role: "EMPLOYEE"
    },

    //SAREN DAYANNA BELLO
    {
      document: "1070986225",
      role: "EMPLOYEE"
    },

    //JUAN SEBASTIAN TOCORA
    {
      document: "1000327455",
      role: "EMPLOYEE"
    },

    //NEFTALI HERNANDEZ BUSTOS
    {
      document: "11435611",
      role: "EMPLOYEE"
    },

    //MANUEL ALEJANDRO FERNANDEZ
    {
      document: "5018775019",
      role: "EMPLOYEE"
    },

    //JUAN SEBASTIAN LESMES
    {
      document: "1002397066",
      role: "EMPLOYEE"
    },

    //LUIS HERNANDO GOMEZ
    {
      document: "80432157",
      role: "EMPLOYEE"
    },

    //LUIS JESUS TEQUIA
    {
      document: "79424582",
      role: "EMPLOYEE"
    },

    //DANIEL SARMIENTO BERNAL
    {
      document: "1032430875",
      role: "EMPLOYEE"
    },

    //DIDIER MURILLO PEREA
    {
      document: "1022923297",
      role: "EMPLOYEE"
    },

    //ROBINSON BEJARANO ANTONIO
    {
      document: "5906034",
      role: "EMPLOYEE"
    },

    //WILMER ALEXANDER DIAZ
    {
      document: "1122136926",
      role: "EMPLOYEE"
    },

    //PERDO LUIS MONTAÑO
    {
      document: "1004603185",
      role: "EMPLOYEE"
    },

    //GENESIS ANDREA BLANCO
    {
      document: "6005024490",
      role: "EMPLOYEE"
    },

    //EMMANUEL SANTIAGO MARTINEZ
    {
      document: "1023378493",
      role: "EMPLOYEE"
    },

    //MARIA CAMILA TORRES
    {
      document: "1020743866",
      role: "EMPLOYEE"
    },

    //BENJAMIN GARCIA GARCIA
    {
      document: "3129192",
      role: "EMPLOYEE"
    },

    //MAURICIO HERNANDO CABELLO
    {
      document: "79329401",
      role: "EMPLOYEE"
    },

    //ANGELICA MARIA GONZALES
    {
      document: "35354848",
      role: "EMPLOYEE"
    },

    //EMERITA SANCHEZ TORRES
    {
      document: "1087121961",
      role: "EMPLOYEE"
    },

    //ADRIANA ISABEL ALFARO
    {
      document: "52740184",
      role: "EMPLOYEE"
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