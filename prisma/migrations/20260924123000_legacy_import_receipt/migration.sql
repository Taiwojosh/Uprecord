CREATE TABLE IF NOT EXISTS "LegacyImportReceipt" (
    "schoolId" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "report" TEXT NOT NULL,
    PRIMARY KEY ("schoolId", "sourceHash")
);
