-- CreateTable
CREATE TABLE "WorkdayHistory" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "workedMinutes" INTEGER NOT NULL,
    "extraMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkdayHistory_pkey" PRIMARY KEY ("id")
);
