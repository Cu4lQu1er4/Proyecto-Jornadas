/*
  Warnings:

  - The `appliedAt` column on the `admin_case` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "admin_case" DROP COLUMN "appliedAt",
ADD COLUMN     "appliedAt" TIMESTAMP(3);
