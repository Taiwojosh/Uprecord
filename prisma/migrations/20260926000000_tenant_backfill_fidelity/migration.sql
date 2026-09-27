-- Tenant Backfill Fidelity
--
-- Prerequisite for importing an existing offline (Dexie/IndexedDB) tenant into
-- the multi-tenant server database without losing data.
--
-- 1. Subject gains the array fields the offline client stores but the server
--    schema never modelled. Without these, a tenant import silently drops
--    department/level subject filtering, which changes report card contents.
-- 2. SchoolSettings gains the holiday calendar fields.
-- 3. Subject and TraitDefinition gain natural-key uniqueness so an import can be
--    re-run safely (idempotent upsert) instead of duplicating rows.

-- Additive nullable columns (all values are JSON strings, matching the existing
-- caScores / caComponents / gradingScale convention)
ALTER TABLE "Subject" ADD COLUMN "departmentIds" TEXT;
ALTER TABLE "Subject" ADD COLUMN "coreLevels" TEXT;
ALTER TABLE "Subject" ADD COLUMN "classIds" TEXT;
ALTER TABLE "Subject" ADD COLUMN "assistantTeacherIds" TEXT;

ALTER TABLE "SchoolSettings" ADD COLUMN "holidayDates" TEXT;
ALTER TABLE "SchoolSettings" ADD COLUMN "holidayNames" TEXT;

-- Natural keys: required for idempotent tenant imports and future sync upserts
CREATE UNIQUE INDEX "Subject_schoolId_subjectName_key" ON "Subject"("schoolId", "subjectName");
CREATE UNIQUE INDEX "TraitDefinition_schoolId_traitName_key" ON "TraitDefinition"("schoolId", "traitName");
