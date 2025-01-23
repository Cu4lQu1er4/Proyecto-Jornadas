/*
  Warnings:

  - You are about to drop the `Period` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `periodId` on table `workday_history` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "workday_history" DROP CONSTRAINT "workday_history_periodId_fkey";

-- AlterTable
ALTER TABLE "workday_history" ALTER COLUMN "periodId" SET NOT NULL;

-- DropTable
DROP TABLE "Period";

-- CreateTable
CREATE TABLE "WorkPeriod" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "half" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,

    CONSTRAINT "WorkPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkPeriod_year_month_half_key" ON "WorkPeriod"("year", "month", "half");

-- AddForeignKey
ALTER TABLE "workday_history" ADD CONSTRAINT "workday_history_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "WorkPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
