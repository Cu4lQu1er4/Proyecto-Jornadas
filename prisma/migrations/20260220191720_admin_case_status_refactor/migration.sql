/*
  Warnings:

  - The values [DRAFT] on the enum `AdminCaseStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AdminCaseStatus_new" AS ENUM ('PENDING', 'APPLIED', 'REJECTED', 'CANCELLED');
ALTER TABLE "admin_case" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "admin_case" ALTER COLUMN "status" TYPE "AdminCaseStatus_new" USING ("status"::text::"AdminCaseStatus_new");
ALTER TYPE "AdminCaseStatus" RENAME TO "AdminCaseStatus_old";
ALTER TYPE "AdminCaseStatus_new" RENAME TO "AdminCaseStatus";
DROP TYPE "AdminCaseStatus_old";
ALTER TABLE "admin_case" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "admin_case" ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedBy" TEXT,
ADD COLUMN     "rejectedReason" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING';
