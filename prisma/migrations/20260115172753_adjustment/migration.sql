-- CreateTable
CREATE TABLE "workday_adjustment" (
    "id" TEXT NOT NULL,
    "historyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "approvedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workday_adjustment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "workday_adjustment" ADD CONSTRAINT "workday_adjustment_historyId_fkey" FOREIGN KEY ("historyId") REFERENCES "workday_history"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
