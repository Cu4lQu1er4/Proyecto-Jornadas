-- CreateEnum
CREATE TYPE "AdminCaseType" AS ENUM ('INCAPACITY', 'PERMISSION', 'JUSTIFICATION', 'ABSENCE');

-- CreateEnum
CREATE TYPE "AdminCaseStatus" AS ENUM ('DRAFT', 'APPLIED', 'CANCELLED');

-- CreateTable
CREATE TABLE "admin_case" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "AdminCaseType" NOT NULL,
    "status" "AdminCaseStatus" NOT NULL DEFAULT 'DRAFT',
    "reasonCode" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedBy" TEXT,
    "appliedAt" TEXT,
    "cancelledBy" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,

    CONSTRAINT "admin_case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_case_scope" (
    "id" TEXT NOT NULL,
    "adminCaseId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startMinute" INTEGER,
    "endMinute" INTEGER,
    "workdayHistoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_case_scope_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_case_employeeId_idx" ON "admin_case"("employeeId");

-- CreateIndex
CREATE INDEX "admin_case_status_idx" ON "admin_case"("status");

-- CreateIndex
CREATE INDEX "admin_case_scope_date_idx" ON "admin_case_scope"("date");

-- CreateIndex
CREATE INDEX "admin_case_scope_adminCaseId_date_idx" ON "admin_case_scope"("adminCaseId", "date");

-- AddForeignKey
ALTER TABLE "admin_case_scope" ADD CONSTRAINT "admin_case_scope_adminCaseId_fkey" FOREIGN KEY ("adminCaseId") REFERENCES "admin_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
