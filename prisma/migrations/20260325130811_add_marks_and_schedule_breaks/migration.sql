-- CreateTable
CREATE TABLE "WorkdayMark" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "time" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkdayMark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleTemplateBreak" (
    "id" TEXT NOT NULL,
    "scheduleTemplateId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,

    CONSTRAINT "ScheduleTemplateBreak_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkdayMark_employeeId_time_idx" ON "WorkdayMark"("employeeId", "time");

-- CreateIndex
CREATE INDEX "ScheduleTemplateBreak_scheduleTemplateId_idx" ON "ScheduleTemplateBreak"("scheduleTemplateId");

-- AddForeignKey
ALTER TABLE "ScheduleTemplateBreak" ADD CONSTRAINT "ScheduleTemplateBreak_scheduleTemplateId_fkey" FOREIGN KEY ("scheduleTemplateId") REFERENCES "ScheduleTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
