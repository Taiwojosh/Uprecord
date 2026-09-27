-- CreateTable
CREATE TABLE "CbtAssessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "questions" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CbtAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assessmentId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" INTEGER NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "answers" TEXT NOT NULL DEFAULT '{}',
    "submittedAt" DATETIME,
    "score" INTEGER,
    CONSTRAINT "CbtAttempt_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "CbtAssessment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LiveLesson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "classId" INTEGER NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "mode" TEXT NOT NULL,
    "meetingUrl" TEXT,
    "roomName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "CbtAssessment_schoolId_classId_idx" ON "CbtAssessment"("schoolId", "classId");

-- CreateIndex
CREATE INDEX "CbtAttempt_schoolId_studentId_idx" ON "CbtAttempt"("schoolId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "CbtAttempt_assessmentId_studentId_key" ON "CbtAttempt"("assessmentId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "LiveLesson_roomName_key" ON "LiveLesson"("roomName");

-- CreateIndex
CREATE INDEX "LiveLesson_schoolId_classId_idx" ON "LiveLesson"("schoolId", "classId");
