/*
  Warnings:

  - You are about to drop the `WorkdayHistory` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "WorkdayHistory";

-- CreateTable
CREATE TABLE "workday_history" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "workedMinutes" INTEGER NOT NULL,
    "expectedMinutes" INTEGER NOT NULL,
    "deltaMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workday_history_pkey" PRIMARY KEY ("id")
);
