-- DropForeignKey
ALTER TABLE "workday_history" DROP CONSTRAINT "workday_history_periodId_fkey";

-- AlterTable
ALTER TABLE "workday_history" ALTER COLUMN "periodId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "workday_history" ADD CONSTRAINT "workday_history_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "WorkPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
