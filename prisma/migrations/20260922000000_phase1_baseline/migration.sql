-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slogan" TEXT,
    "address" TEXT,
    "logoUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'teacher',
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "department" TEXT,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "joinDate" TEXT,
    "studentId" INTEGER,
    "setupToken" TEXT,
    "setupTokenExpires" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "schoolId" TEXT,
    CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Student" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "admissionNumber" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" TEXT,
    "gender" TEXT NOT NULL,
    "classId" INTEGER NOT NULL,
    "departmentId" INTEGER,
    "departmentName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "enrolledDate" TEXT,
    "photoBase64" TEXT,
    "address" TEXT,
    "parentPhone" TEXT,
    "parentEmail" TEXT,
    "previousSchool" TEXT,
    "medicalNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "schoolId" TEXT NOT NULL,
    CONSTRAINT "Student_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Class" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "className" TEXT NOT NULL,
    "teacherName" TEXT,
    "teacherId" INTEGER,
    "level" TEXT NOT NULL,
    "departmentId" INTEGER,
    "capacity" INTEGER,
    "schoolId" TEXT NOT NULL,
    CONSTRAINT "Class_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "subjectName" TEXT NOT NULL,
    "isCore" BOOLEAN NOT NULL DEFAULT false,
    "teacherId" INTEGER,
    "classId" INTEGER,
    "schoolId" TEXT NOT NULL,
    CONSTRAINT "Subject_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Grade" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "studentId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "term" INTEGER NOT NULL,
    "session" TEXT NOT NULL,
    "caScores" TEXT NOT NULL,
    "examScore" REAL NOT NULL,
    "total" REAL,
    "grade" TEXT,
    "remark" TEXT,
    "updatedAt" TEXT,
    "schoolId" TEXT NOT NULL,
    CONSTRAINT "Grade_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Grade_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Grade_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TraitDefinition" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "traitName" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    CONSTRAINT "TraitDefinition_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TraitGrade" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "studentId" INTEGER NOT NULL,
    "traitId" INTEGER NOT NULL,
    "term" INTEGER NOT NULL,
    "session" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "updatedAt" TEXT,
    "schoolId" TEXT NOT NULL,
    CONSTRAINT "TraitGrade_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TraitGrade_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TraitGrade_traitId_fkey" FOREIGN KEY ("traitId") REFERENCES "TraitDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "studentId" INTEGER NOT NULL,
    "term" INTEGER NOT NULL,
    "session" TEXT NOT NULL,
    "daysPresent" INTEGER NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "teacherRemark" TEXT,
    "principalRemark" TEXT,
    "updatedAt" TEXT,
    "syncStatus" TEXT,
    "schoolId" TEXT NOT NULL,
    CONSTRAINT "Attendance_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyAttendance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "studentId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "term" INTEGER NOT NULL,
    "session" TEXT NOT NULL,
    "markedByRole" TEXT,
    "markedByName" TEXT,
    "syncStatus" TEXT,
    "schoolId" TEXT NOT NULL,
    CONSTRAINT "DailyAttendance_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DailyAttendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "studentId" INTEGER NOT NULL,
    "term" INTEGER NOT NULL,
    "session" TEXT NOT NULL,
    "teacherComment" TEXT,
    "principalComment" TEXT,
    "schoolId" TEXT NOT NULL,
    CONSTRAINT "Comment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Curriculum" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "subjectId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "term" INTEGER NOT NULL,
    "session" TEXT NOT NULL,
    "topics" TEXT NOT NULL,
    "updatedAt" TEXT,
    "schoolId" TEXT NOT NULL,
    CONSTRAINT "Curriculum_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Curriculum_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LessonNote" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "subjectId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "term" INTEGER NOT NULL,
    "session" TEXT NOT NULL,
    "weeks" TEXT NOT NULL,
    "updatedAt" TEXT,
    "schoolId" TEXT NOT NULL,
    CONSTRAINT "LessonNote_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LessonNote_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "studentId" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "category" TEXT NOT NULL,
    "term" INTEGER NOT NULL,
    "session" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "date" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    CONSTRAINT "Payment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Payment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "authorName" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    CONSTRAINT "Announcement_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Task" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "label" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    CONSTRAINT "Task_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResultApproval" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "classId" INTEGER NOT NULL,
    "term" INTEGER NOT NULL,
    "session" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "approvedBy" INTEGER,
    "approvedAt" TEXT,
    "schoolId" TEXT NOT NULL,
    CONSTRAINT "ResultApproval_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    CONSTRAINT "AuditLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SchoolSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "schoolName" TEXT NOT NULL,
    "schoolSlogan" TEXT,
    "address" TEXT,
    "logoBase64" TEXT,
    "principalName" TEXT,
    "principalSignatureBase64" TEXT,
    "brandColor" TEXT,
    "nextTermDate" TEXT,
    "termClosingDate" TEXT,
    "resumptionDate" TEXT,
    "currentTerm" INTEGER NOT NULL DEFAULT 1,
    "currentSession" TEXT,
    "totalSubjectScore" REAL,
    "examMaxScore" REAL,
    "caMaxScore" REAL,
    "caComponents" TEXT,
    "daysSchoolOpen" INTEGER,
    "department1Name" TEXT,
    "department1Level" TEXT,
    "department2Name" TEXT,
    "department2Level" TEXT,
    "department3Name" TEXT,
    "department3Level" TEXT,
    "enableLevelSubjectFiltering" BOOLEAN NOT NULL DEFAULT false,
    "gradingScale" TEXT,
    "reportCardTemplate" TEXT,
    "enableGradeColors" BOOLEAN NOT NULL DEFAULT false,
    "enableCumulativeReport" BOOLEAN NOT NULL DEFAULT false,
    "autoHideCumulativeForEarlierTerms" BOOLEAN NOT NULL DEFAULT false,
    "enableDataOverride" BOOLEAN NOT NULL DEFAULT false,
    "publishedTerms" TEXT,
    "restrictTeacherActionsNoAttendance" BOOLEAN NOT NULL DEFAULT false,
    "allowTeachersViewFeeStatus" BOOLEAN NOT NULL DEFAULT false,
    "restrictUnpaidStudentsAccess" BOOLEAN NOT NULL DEFAULT false,
    "schoolId" TEXT NOT NULL,
    CONSTRAINT "SchoolSettings_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Activation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "hardwareId" TEXT NOT NULL,
    "licenseKey" TEXT NOT NULL,
    "activatedAt" TEXT NOT NULL,
    "expiresAt" TEXT,
    "plan" TEXT NOT NULL,
    "lastVerifiedAt" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    CONSTRAINT "Activation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_setupToken_key" ON "User"("setupToken");

-- CreateIndex
CREATE INDEX "User_schoolId_idx" ON "User"("schoolId");

-- CreateIndex
CREATE INDEX "Student_schoolId_idx" ON "Student"("schoolId");

-- CreateIndex
CREATE INDEX "Student_classId_idx" ON "Student"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_schoolId_admissionNumber_key" ON "Student"("schoolId", "admissionNumber");

-- CreateIndex
CREATE INDEX "Class_schoolId_idx" ON "Class"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Class_schoolId_className_key" ON "Class"("schoolId", "className");

-- CreateIndex
CREATE INDEX "Subject_schoolId_idx" ON "Subject"("schoolId");

-- CreateIndex
CREATE INDEX "Grade_schoolId_idx" ON "Grade"("schoolId");

-- CreateIndex
CREATE INDEX "Grade_studentId_idx" ON "Grade"("studentId");

-- CreateIndex
CREATE INDEX "Grade_subjectId_idx" ON "Grade"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_schoolId_studentId_subjectId_term_session_key" ON "Grade"("schoolId", "studentId", "subjectId", "term", "session");

-- CreateIndex
CREATE INDEX "TraitDefinition_schoolId_idx" ON "TraitDefinition"("schoolId");

-- CreateIndex
CREATE INDEX "TraitGrade_schoolId_idx" ON "TraitGrade"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "TraitGrade_schoolId_studentId_traitId_term_session_key" ON "TraitGrade"("schoolId", "studentId", "traitId", "term", "session");

-- CreateIndex
CREATE INDEX "Attendance_schoolId_idx" ON "Attendance"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_schoolId_studentId_term_session_key" ON "Attendance"("schoolId", "studentId", "term", "session");

-- CreateIndex
CREATE INDEX "DailyAttendance_schoolId_idx" ON "DailyAttendance"("schoolId");

-- CreateIndex
CREATE INDEX "DailyAttendance_date_idx" ON "DailyAttendance"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyAttendance_schoolId_studentId_date_term_session_key" ON "DailyAttendance"("schoolId", "studentId", "date", "term", "session");

-- CreateIndex
CREATE INDEX "Comment_schoolId_idx" ON "Comment"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Comment_schoolId_studentId_term_session_key" ON "Comment"("schoolId", "studentId", "term", "session");

-- CreateIndex
CREATE INDEX "Curriculum_schoolId_idx" ON "Curriculum"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Curriculum_schoolId_subjectId_classId_term_session_key" ON "Curriculum"("schoolId", "subjectId", "classId", "term", "session");

-- CreateIndex
CREATE INDEX "LessonNote_schoolId_idx" ON "LessonNote"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonNote_schoolId_subjectId_classId_term_session_key" ON "LessonNote"("schoolId", "subjectId", "classId", "term", "session");

-- CreateIndex
CREATE INDEX "Payment_schoolId_idx" ON "Payment"("schoolId");

-- CreateIndex
CREATE INDEX "Payment_studentId_idx" ON "Payment"("studentId");

-- CreateIndex
CREATE INDEX "Announcement_schoolId_idx" ON "Announcement"("schoolId");

-- CreateIndex
CREATE INDEX "Task_schoolId_idx" ON "Task"("schoolId");

-- CreateIndex
CREATE INDEX "ResultApproval_schoolId_idx" ON "ResultApproval"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "ResultApproval_schoolId_classId_term_session_key" ON "ResultApproval"("schoolId", "classId", "term", "session");

-- CreateIndex
CREATE INDEX "AuditLog_schoolId_idx" ON "AuditLog"("schoolId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolSettings_schoolId_key" ON "SchoolSettings"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Activation_schoolId_key" ON "Activation"("schoolId");
