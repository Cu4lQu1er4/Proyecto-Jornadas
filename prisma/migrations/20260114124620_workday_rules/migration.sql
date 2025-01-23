-- CreateTable
CREATE TABLE "WorkdayRules" (
    "id" TEXT NOT NULL,
    "baseMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkdayRules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkdayBreak" (
    "id" TEXT NOT NULL,
    "rulesId" TEXT NOT NULL,
    "start" TEXT NOT NULL,
    "end" TEXT NOT NULL,

    CONSTRAINT "WorkdayBreak_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WorkdayBreak" ADD CONSTRAINT "WorkdayBreak_rulesId_fkey" FOREIGN KEY ("rulesId") REFERENCES "WorkdayRules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
