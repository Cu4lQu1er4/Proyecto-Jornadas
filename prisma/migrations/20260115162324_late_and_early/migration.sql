/*
  Warnings:

  - Made the column `earlyLeave` on table `workday_history` required. This step will fail if there are existing NULL values in that column.
  - Made the column `lateArrival` on table `workday_history` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "workday_history" ALTER COLUMN "earlyLeave" SET NOT NULL,
ALTER COLUMN "lateArrival" SET NOT NULL;
