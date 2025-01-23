/*
  Warnings:

  - Made the column `periodId` on table `workday_history` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "workday_history" DROP CONSTRAINT "workday_history_periodId_fkey";

-- AlterTable
ALTER TABLE "workday_history" ALTER COLUMN "periodId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "workday_history" ADD CONSTRAINT "workday_history_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "WorkPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
