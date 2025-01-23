-- CreateTable
CREATE TABLE "WorkdayOpen" (
    "employeeId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkdayOpen_pkey" PRIMARY KEY ("employeeId")
);
