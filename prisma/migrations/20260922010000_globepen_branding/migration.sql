-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_School" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slogan" TEXT,
    "address" TEXT,
    "logoUrl" TEXT,
    "slug" TEXT,
    "portalTitle" TEXT,
    "brandColor" TEXT,
    "secondaryColor" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "customDomain" TEXT,
    "customDomainVerified" BOOLEAN NOT NULL DEFAULT false,
    "domainVerificationToken" TEXT,
    "domainVerifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_School" ("address", "createdAt", "id", "logoUrl", "name", "slogan", "updatedAt") SELECT "address", "createdAt", "id", "logoUrl", "name", "slogan", "updatedAt" FROM "School";
DROP TABLE "School";
ALTER TABLE "new_School" RENAME TO "School";
CREATE UNIQUE INDEX "School_slug_key" ON "School"("slug");
CREATE UNIQUE INDEX "School_customDomain_key" ON "School"("customDomain");
CREATE INDEX "School_slug_idx" ON "School"("slug");
CREATE INDEX "School_customDomain_idx" ON "School"("customDomain");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
