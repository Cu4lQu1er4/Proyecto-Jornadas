-- CreateTable
CREATE TABLE "admin_case_attachment" (
    "id" TEXT NOT NULL,
    "adminCaseId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "resourseType" TEXT NOT NULL,
    "format" TEXT,
    "bytes" INTEGER,
    "originalName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_case_attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_case_attachment_adminCaseId_idx" ON "admin_case_attachment"("adminCaseId");

-- AddForeignKey
ALTER TABLE "admin_case_attachment" ADD CONSTRAINT "admin_case_attachment_adminCaseId_fkey" FOREIGN KEY ("adminCaseId") REFERENCES "admin_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
