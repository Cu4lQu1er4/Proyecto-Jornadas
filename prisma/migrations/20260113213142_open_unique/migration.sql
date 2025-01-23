/*
  Warnings:

  - You are about to drop the `WorkdayOpen` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "WorkdayOpen";

-- CreateTable
CREATE TABLE "workday_open" (
    "employeeId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workday_open_pkey" PRIMARY KEY ("employeeId")
);
