/*
  Warnings:

  - You are about to drop the column `resourseType` on the `admin_case_attachment` table. All the data in the column will be lost.
  - Added the required column `resourceType` to the `admin_case_attachment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "admin_case_attachment" DROP COLUMN "resourseType",
ADD COLUMN     "resourceType" TEXT NOT NULL;
