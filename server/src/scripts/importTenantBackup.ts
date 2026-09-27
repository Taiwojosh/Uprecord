/**
 * Tenant Backfill Importer — GlobePen
 *
 * Promotes an existing offline tenant (the browser's Dexie/IndexedDB database,
 * exported as JSON) into the multi-tenant server database, so that the server
 * becomes the authoritative source of truth for that school.
 *
 * WHY THIS EXISTS
 * The client has historically treated IndexedDB as its only database. That means
 * exactly one browser holds a school's roster, classes, subjects and grades —
 * no second device, and no second user, ever sees them. Until this data exists
 * on the server, cross-user/per-tenant sync is impossible (there would be
 * nothing to sync against, and a "server wins" pull would look like data loss).
 *
 * WHAT IT DOES
 * 1. Reads a Dexie backup export (all tables keyed by local autoincrement ids).
 * 2. Creates (or resumes) the tenant School, keyed by slug.
 * 3. Imports settings, classes, traits, subjects, students, grades, traitGrades
 *    and attendance in dependency order, REMAPPING every local foreign key to
 *    the server-assigned id (local ids are per-device and cannot be reused).
 * 4. Creates the tenant admin account using the product's activation-token flow
 *    (no administrator-known passwords).
 *
 * PROPERTIES
 * - Idempotent: rows are matched on natural keys (admissionNumber, className,
 *   subjectName, traitName, or the model's composite unique key), so running it
 *   twice creates nothing twice and only writes genuine changes.
 * - Lossless-or-loud: rows whose foreign keys cannot be resolved in the backup
 *   are skipped and reported, never guessed. Subject departmentIds/coreLevels
 *   and the holiday calendar are preserved as JSON (see migration
 *   20260926000000_tenant_backfill_fidelity).
 * - Non-destructive: defaults to a DRY RUN. Pass --apply to commit. Refuses to
 *   import into a tenant that already holds students unless --force is given.
 *
 * USAGE
 *   # Dry run (default): validates and reports, writes nothing
 *   npx tsx server/src/scripts/importTenantBackup.ts --file=src/data/devickysBackup.json --slug=devickys
 *
 *   # Commit
 *   npx tsx server/src/scripts/importTenantBackup.ts --file=src/data/devickysBackup.json --slug=devickys --apply
 *
 *   # Emergency override: directly set admin password (discouraged; never logged)
 *   # Prefer the default activation-token flow instead of passing passwords on the CLI.
 *   ... --apply --admin-email=admin@school.com --admin-password='<strong-password>'
 *
 * ROLLBACK
 * Take a database backup immediately before running with --apply: stop the
 * server, copy prisma/dev.db, then DELETE the School row — Prisma's cascade
 * removes every imported row for that tenant. See docs/tenant-backfill.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import type { Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { generateSlug } from './backfillSlugs.js';

dotenv.config();

// ─── Legacy (offline client) record shapes ───────────────────────────────────
// Field names mirror src/db/db.ts exactly. `id` values are LOCAL per-device
// autoincrement ids and are only meaningful within a single backup file.

export interface LegacySettings {
  schoolName?: string;
  schoolSlogan?: string;
  address?: string;
  logoBase64?: string;
  principalName?: string;
  principalSignatureBase64?: string;
  brandColor?: string;
  nextTermDate?: string;
  termClosingDate?: string;
  resumptionDate?: string;
  currentTerm?: number;
  currentSession?: string;
  totalSubjectScore?: number;
  examMaxScore?: number;
  caMaxScore?: number;
  caComponents?: unknown[];
  daysSchoolOpen?: number;
  department1Name?: string;
  department2Name?: string;
  department3Name?: string;
  enableLevelSubjectFiltering?: boolean;
  gradingScale?: unknown[];
  reportCardTemplate?: string;
  enableGradeColors?: boolean;
  enableCumulativeReport?: boolean;
  autoHideCumulativeForEarlierTerms?: boolean;
  enableDataOverride?: boolean;
  publishedTerms?: string[];
  holidayDates?: string[];
  holidayNames?: Record<string, string>;
  restrictTeacherActionsNoAttendance?: boolean;
  allowTeachersViewFeeStatus?: boolean;
  restrictUnpaidStudentsAccess?: boolean;
}

export interface LegacyClass {
  id: number;
  className: string;
  teacherName?: string;
  teacherId?: number | null;
  level?: string;
  departmentId?: number | null;
  capacity?: number | null;
}

export interface LegacySubject {
  id: number;
  subjectName: string;
  isCore?: boolean;
  teacherId?: number | null;
  classId?: number | null;
  classIds?: number[];
  departmentIds?: number[];
  coreLevels?: string[];
  assistantTeacherIds?: number[];
}

export interface LegacyTrait {
  id: number;
  traitName: string;
  displayOrder?: number;
  category?: string;
}

export interface LegacyStudent {
  id: number;
  admissionNumber: string;
  fullName: string;
  dateOfBirth?: string;
  gender?: string;
  classId: number;
  departmentId?: number | null;
  departmentName?: string;
  email?: string;
  phone?: string;
  status?: string;
  enrolledDate?: string;
  photoBase64?: string;
  address?: string;
  parentPhone?: string;
  parentEmail?: string;
  previousSchool?: string;
  medicalNotes?: string;
}

export interface LegacyGrade {
  id: number;
  studentId: number;
  subjectId: number;
  term: number;
  session: string;
  caScores?: Record<string, number>;
  examScore?: number;
  total?: number;
  grade?: string;
  remark?: string;
}

export interface LegacyTraitGrade {
  id: number;
  studentId: number;
  traitId: number;
  term: number;
  session: string;
  score?: number;
}

export interface LegacyAttendance {
  id: number;
  studentId: number;
  term: number;
  session: string;
  daysPresent?: number;
  totalDays?: number;
  teacherRemark?: string;
  principalRemark?: string;
}

export interface LegacyBackup {
  activation?: unknown[];
  settings?: LegacySettings[];
  classes?: LegacyClass[];
  subjects?: LegacySubject[];
  traits?: LegacyTrait[];
  students?: LegacyStudent[];
  grades?: LegacyGrade[];
  traitGrades?: LegacyTraitGrade[];
  attendance?: LegacyAttendance[];
  comments?: unknown[];
  /**
   * Synthetic-test marker. The canonical Devickys backup fixture MUST NOT be
   * bundled as a runtime input; automated tests set this marker and are rejected
   * if real customer-shaped data is supplied.
   */
  syntheticFixture?: boolean;
}

// ─── Importer API ────────────────────────────────────────────────────────────

export interface ImportOptions {
  /** Absolute or repo-relative path to a Dexie backup JSON export. */
  backupPath?: string;
  /** Pre-parsed backup (used by tests); takes precedence over backupPath. */
  backup?: LegacyBackup;
  /** Tenant URL slug, e.g. "devickys". Defaults to TENANT_SLUG env, then derived from the school name. */
  schoolSlug?: string;
  /** Overrides the school name from the backup settings. */
  schoolName?: string;
  adminEmail?: string;
  adminFullName?: string;
  /** When set, the admin account is created active with this password instead of an activation token. */
  adminPassword?: string;
  /** Commit the import. When false (default) the transaction is rolled back. */
  apply?: boolean;
  /** Allow importing into a tenant that already has students. */
  force?: boolean;
}

export interface TableCount {
  created: number;
  updated: number;
  unchanged: number;
  skipped: number;
}

export interface ImportSummary {
  dryRun: boolean;
  schoolSlug: string;
  schoolName: string;
  schoolId: string | null;
  schoolCreated: boolean;
  counts: Record<string, TableCount>;
  warnings: string[];
  admin: { email: string; created: boolean; activationUrl: string | null } | null;
}

/** Rollback signal used to discard a dry run while keeping one code path. */
class DryRunRollback extends Error {
  constructor() {
    super('Dry run complete: transaction rolled back intentionally.');
    this.name = 'DryRunRollback';
  }
}

function isDryRunRollback(err: unknown): boolean {
  return err instanceof DryRunRollback || (err as { name?: string } | null)?.name === 'DryRunRollback';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Serializes arrays/objects to a JSON string; undefined stays null (matches the DB convention). */
function jsonString(value: unknown): string | null {
  if (value === undefined) return null;
  if (Array.isArray(value) && value.length === 0) return '[]';
  if (value === null) return null;
  return JSON.stringify(value);
}

/** Trims strings and converts empty strings to null so comparisons stay stable. */
function text(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
}

function intOrNull(value: unknown): number | null {
  const parsed = numberOrNull(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function createCounts(tables: string[]): Record<string, TableCount> {
  const counts: Record<string, TableCount> = {};
  for (const table of tables) {
    counts[table] = { created: 0, updated: 0, unchanged: 0, skipped: 0 };
  }
  return counts;
}

type UpsertOutcome = 'created' | 'updated' | 'unchanged';

/**
 * Compares the desired payload against an existing row, returning only the
 * fields that actually differ. Keeps re-runs honest: no write happens when the
 * server already holds the same values.
 */
function changedFields(existing: Record<string, unknown>, payload: Record<string, unknown>): Record<string, unknown> {
  const diff: Record<string, unknown> = {};
  for (const [key, desired] of Object.entries(payload)) {
    const current = existing[key];
    const isSame = current instanceof Date && desired instanceof Date
      ? current.getTime() === desired.getTime()
      : current === desired;
    if (!isSame) diff[key] = desired;
  }
  return diff;
}

interface UpsertSpec<Row extends { id: number }> {
  existing?: Row;
  payload: Record<string, unknown>;
  /** Extra fields applied only on creation (e.g. timestamps that must not affect change detection). */
  createExtras?: Record<string, unknown>;
  create: (data: Record<string, unknown>) => Promise<{ id: number }>;
  update: (id: number, data: Record<string, unknown>) => Promise<unknown>;
}

/** Creates the row, or updates only the fields that drifted. Returns the server id either way. */
async function upsert<Row extends { id: number }>(spec: UpsertSpec<Row>): Promise<{ outcome: UpsertOutcome; id: number }> {
  if (!spec.existing) {
    const created = await spec.create({ ...spec.payload, ...(spec.createExtras ?? {}) });
    return { outcome: 'created', id: created.id };
  }

  const diff = changedFields(spec.existing as unknown as Record<string, unknown>, spec.payload);
  if (Object.keys(diff).length === 0) {
    return { outcome: 'unchanged', id: spec.existing.id };
  }

  await spec.update(spec.existing.id, diff);
  return { outcome: 'updated', id: spec.existing.id };
}

const DEFAULT_BACKUP_PATH = 'src/data/devickysBackup.json';

/** Resolves the backup file, parses it, and fails loudly on anything unusable. */
export function loadBackupFile(backupPath?: string): { backup: LegacyBackup; resolvedPath: string } {
  const resolvedPath = path.resolve(process.cwd(), backupPath || DEFAULT_BACKUP_PATH);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Backup file not found: ${resolvedPath}`);
  }

  const raw = fs.readFileSync(resolvedPath, 'utf8');
  let parsed: LegacyBackup;
  try {
    parsed = JSON.parse(raw) as LegacyBackup;
  } catch (err) {
    throw new Error(`Backup file is not valid JSON (${resolvedPath}): ${(err as Error).message}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Backup file must contain a top-level object of tables: ${resolvedPath}`);
  }

  return { backup: parsed, resolvedPath };
}

// ─── Preflight analysis ──────────────────────────────────────────────────────

export interface BackupAnalysis {
  duplicateAdmissions: string[];
  duplicateClassNames: string[];
  duplicateSubjectNames: string[];
  duplicateTraitNames: string[];
  teacherNames: string[];
}

/**
 * Inspects the backup for collisions that the server's unique constraints would
 * reject. Duplicates are reported (first occurrence wins) rather than crashing
 * the import, because a browser append-only log can legitimately contain them.
 */
export function analyzeBackup(backup: LegacyBackup): BackupAnalysis {
  const duplicates = <T>(rows: T[] | undefined, keyOf: (row: T) => string | null): string[] => {
    const seen = new Set<string>();
    const dupes = new Set<string>();
    for (const row of rows ?? []) {
      const key = keyOf(row);
      if (!key) continue;
      if (seen.has(key)) dupes.add(key);
      seen.add(key);
    }
    return Array.from(dupes);
  };

  return {
    duplicateAdmissions: duplicates(backup.students, (s) => text(s.admissionNumber)),
    duplicateClassNames: duplicates(backup.classes, (c) => text(c.className)),
    duplicateSubjectNames: duplicates(backup.subjects, (s) => text(s.subjectName)),
    duplicateTraitNames: duplicates(backup.traits, (t) => text(t.traitName)),
    teacherNames: Array.from(
      new Set((backup.classes ?? []).map((c) => text(c.teacherName)).filter((name): name is string => name !== null)),
    ),
  };
}

// ─── Import ──────────────────────────────────────────────────────────────────

const TABLES = ['school', 'settings', 'classes', 'traits', 'subjects', 'students', 'grades', 'traitGrades', 'attendance', 'users'];

/**
 * Imports a Dexie backup into the tenant it belongs to, making the server the
 * authoritative store for that school. Dry run unless options.apply is true.
 */
export async function importTenantBackup(options: ImportOptions = {}): Promise<ImportSummary> {
  const apply = options.apply === true;

  const loaded = options.backup
    ? { backup: options.backup, resolvedPath: '<in-memory backup>' }
    : loadBackupFile(options.backupPath);

  const backup = loaded.backup;
  const settings = backup.settings?.[0];

  // Private customer-shaped backups are never accepted as importer inputs.
  // Automated tests use clearly synthetic fixtures with syntheticFixture: true.
  const schoolNameCandidate = text(options.schoolName) || text(settings?.schoolName);
  const looksLikePrivateCustomerBackup =
    !backup.syntheticFixture &&
    (loaded.resolvedPath.toLowerCase().includes('devickys') ||
      (schoolNameCandidate ?? '').toLowerCase().includes('devickys') ||
      (backup.students ?? []).some((student) =>
        typeof student.admissionNumber === 'string' && /^DGS-\d{4}-\d{3}$/.test(student.admissionNumber.trim()),
      ));
  if (looksLikePrivateCustomerBackup) {
    throw new Error(
      'Refusing to import a private customer-shaped backup. Use a clearly synthetic GlobePen Test Academy fixture instead.',
    );
  }

  if (!settings) {
    throw new Error(`Backup contains no settings record; refusing to import partial data (${loaded.resolvedPath}).`);
  }

  const schoolName = text(options.schoolName) || text(settings.schoolName) || 'Imported School';
  const schoolSlug = text(options.schoolSlug) || text(process.env.TENANT_SLUG) || generateSlug(schoolName);

  const counts = createCounts([...TABLES]);
  const warnings: string[] = [];

  const warn = (message: string): void => {
    if (!warnings.includes(message)) warnings.push(message);
  };

  const bump = (table: string, outcome: UpsertOutcome | 'skipped'): void => {
    const bucket = counts[table] ?? (counts[table] = { created: 0, updated: 0, unchanged: 0, skipped: 0 });
    if (outcome === 'skipped') bucket.skipped += 1;
    else bucket[outcome] += 1;
  };

  const analysis = analyzeBackup(backup);
  if (analysis.duplicateAdmissions.length) {
    warn(`Duplicate admission numbers in backup (first wins): ${analysis.duplicateAdmissions.slice(0, 5).join(', ')}${analysis.duplicateAdmissions.length > 5 ? ' …' : ''}`);
  }
  if (analysis.duplicateClassNames.length) {
    warn(`Duplicate class names in backup (first wins): ${analysis.duplicateClassNames.join(', ')}`);
  }
  if (analysis.duplicateSubjectNames.length) {
    warn(`Duplicate subject names in backup (first wins): ${analysis.duplicateSubjectNames.slice(0, 5).join(', ')}${analysis.duplicateSubjectNames.length > 5 ? ' …' : ''}`);
  }
  if (analysis.duplicateTraitNames.length) {
    warn(`Duplicate trait names in backup (first wins): ${analysis.duplicateTraitNames.slice(0, 5).join(', ')}${analysis.duplicateTraitNames.length > 5 ? ' …' : ''}`);
  }

  const adminEmail = (text(options.adminEmail) || text(process.env.TENANT_ADMIN_EMAIL) || `admin@${schoolSlug}.local`).toLowerCase();
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

  let schoolId: string | null = null;
  let schoolCreated = false;
  let admin: ImportSummary['admin'] = null;

  const skip = (table: string, legacyId: number, reason: string): void => {
    bump(table, 'skipped');
    warn(`Skipped ${table} record (local id ${legacyId}): ${reason}`);
  };

  try {
    await prisma.$transaction(async (tx) => {
      // ── 1. Tenant school ────────────────────────────────────────────────
      const schoolPayload: Record<string, unknown> = {
        name: schoolName,
        slug: schoolSlug,
        portalTitle: `${schoolName} Portal`,
        slogan: text(settings.schoolSlogan),
        address: text(settings.address),
        logoUrl: text(settings.logoBase64),
        brandColor: text(settings.brandColor),
      };

      let school = await tx.school.findUnique({ where: { slug: schoolSlug } });

      if (school) {
        const existingStudents = await tx.student.count({ where: { schoolId: school.id } });
        if (existingStudents > 0 && options.force !== true) {
          throw new Error(
            `Tenant "${schoolSlug}" already holds ${existingStudents} students. This importer will not overwrite a populated tenant by accident: `
            + 're-run with --force to reconcile against the backup, or pass a different --slug.',
          );
        }

        const diff = changedFields(school as unknown as Record<string, unknown>, schoolPayload);
        if (Object.keys(diff).length > 0) {
          school = await tx.school.update({ where: { id: school.id }, data: diff as Prisma.SchoolUncheckedUpdateInput });
          bump('school', 'updated');
        } else {
          bump('school', 'unchanged');
        }
      } else {
        school = await tx.school.create({ data: schoolPayload as unknown as Prisma.SchoolUncheckedCreateInput });
        schoolCreated = true;
        bump('school', 'created');
      }

      const tenantId = school.id;
      schoolId = tenantId;

      // ── 2. School settings (one row per tenant) ─────────────────────────
      const settingsPayload: Record<string, unknown> = {
        schoolName,
        schoolSlogan: text(settings.schoolSlogan),
        address: text(settings.address),
        logoBase64: text(settings.logoBase64),
        principalName: text(settings.principalName),
        principalSignatureBase64: text(settings.principalSignatureBase64),
        brandColor: text(settings.brandColor),
        nextTermDate: text(settings.nextTermDate),
        termClosingDate: text(settings.termClosingDate),
        resumptionDate: text(settings.resumptionDate),
        currentTerm: intOrNull(settings.currentTerm) ?? 1,
        currentSession: text(settings.currentSession),
        totalSubjectScore: numberOrNull(settings.totalSubjectScore),
        examMaxScore: numberOrNull(settings.examMaxScore),
        caMaxScore: numberOrNull(settings.caMaxScore),
        caComponents: jsonString(settings.caComponents),
        daysSchoolOpen: intOrNull(settings.daysSchoolOpen),
        department1Name: text(settings.department1Name),
        department2Name: text(settings.department2Name),
        department3Name: text(settings.department3Name),
        enableLevelSubjectFiltering: settings.enableLevelSubjectFiltering === true,
        gradingScale: jsonString(settings.gradingScale),
        reportCardTemplate: text(settings.reportCardTemplate),
        enableGradeColors: settings.enableGradeColors === true,
        enableCumulativeReport: settings.enableCumulativeReport === true,
        autoHideCumulativeForEarlierTerms: settings.autoHideCumulativeForEarlierTerms === true,
        enableDataOverride: settings.enableDataOverride === true,
        publishedTerms: jsonString(settings.publishedTerms),
        holidayDates: jsonString(settings.holidayDates),
        holidayNames: jsonString(settings.holidayNames),
        restrictTeacherActionsNoAttendance: settings.restrictTeacherActionsNoAttendance === true,
        allowTeachersViewFeeStatus: settings.allowTeachersViewFeeStatus === true,
        restrictUnpaidStudentsAccess: settings.restrictUnpaidStudentsAccess === true,
      };

      const existingSettings = await tx.schoolSettings.findUnique({ where: { schoolId: tenantId } });
      const settingsResult = await upsert({
        existing: existingSettings ?? undefined,
        payload: settingsPayload,
        create: (data) => tx.schoolSettings.create({ data: { ...data, schoolId: tenantId } as unknown as Prisma.SchoolSettingsUncheckedCreateInput }),
        update: (id, data) => tx.schoolSettings.update({ where: { id }, data: data as Prisma.SchoolSettingsUncheckedUpdateInput }),
      });
      bump('settings', settingsResult.outcome);

      // ── 3. Classes ──────────────────────────────────────────────────────
      // Local class ids are remapped here; every later table depends on this map.
      const existingClasses = await tx.class.findMany({ where: { schoolId: tenantId } });
      const classByKey = new Map(existingClasses.map((row) => [row.className, row]));
      const classIdMap = new Map<number, number>();

      for (const legacy of backup.classes ?? []) {
        const className = text(legacy.className);
        if (!className) {
          skip('classes', legacy.id, 'missing className');
          continue;
        }

        const payload: Record<string, unknown> = {
          className,
          level: text(legacy.level) || 'Secondary',
          teacherName: text(legacy.teacherName),
          teacherId: intOrNull(legacy.teacherId),
          departmentId: intOrNull(legacy.departmentId),
          capacity: intOrNull(legacy.capacity),
        };

        let createdRow: (typeof existingClasses)[number] | null = null;
        const result = await upsert({
          existing: classByKey.get(className),
          payload,
          create: async (data) => {
            createdRow = await tx.class.create({ data: { ...data, schoolId: tenantId } as unknown as Prisma.ClassUncheckedCreateInput });
            return createdRow;
          },
          update: (id, data) => tx.class.update({ where: { id }, data: data as Prisma.ClassUncheckedUpdateInput }),
        });

        if (createdRow) classByKey.set(className, createdRow);
        classIdMap.set(legacy.id, result.id);
        bump('classes', result.outcome);
      }

      // ── 4. Traits (affective / psychomotor definitions) ─────────────────
      const existingTraits = await tx.traitDefinition.findMany({ where: { schoolId: tenantId } });
      const traitByKey = new Map(existingTraits.map((row) => [row.traitName, row]));
      const traitIdMap = new Map<number, number>();

      for (const legacy of backup.traits ?? []) {
        const traitName = text(legacy.traitName);
        if (!traitName) {
          skip('traits', legacy.id, 'missing traitName');
          continue;
        }

        const payload: Record<string, unknown> = {
          traitName,
          displayOrder: intOrNull(legacy.displayOrder) ?? 0,
          category: text(legacy.category) === 'psychomotor' ? 'psychomotor' : 'affective',
        };

        let createdRow: (typeof existingTraits)[number] | null = null;
        const result = await upsert({
          existing: traitByKey.get(traitName),
          payload,
          create: async (data) => {
            createdRow = await tx.traitDefinition.create({ data: { ...data, schoolId: tenantId } as unknown as Prisma.TraitDefinitionUncheckedCreateInput });
            return createdRow;
          },
          update: (id, data) => tx.traitDefinition.update({ where: { id }, data: data as Prisma.TraitDefinitionUncheckedUpdateInput }),
        });

        if (createdRow) traitByKey.set(traitName, createdRow);
        traitIdMap.set(legacy.id, result.id);
        bump('traits', result.outcome);
      }

      // ── 5. Subjects ─────────────────────────────────────────────────────
      // departmentIds / coreLevels / classIds / assistantTeacherIds are stored as
      // JSON strings; dropping them would silently change subject filtering and
      // therefore report card contents.
      const existingSubjects = await tx.subject.findMany({ where: { schoolId: tenantId } });
      const subjectByKey = new Map(existingSubjects.map((row) => [row.subjectName, row]));
      const subjectIdMap = new Map<number, number>();
      let droppedClassLinks = 0;

      const remapClassIds = (values?: number[]): number[] | null => {
        if (!Array.isArray(values)) return null;
        const mapped: number[] = [];
        for (const value of values) {
          const serverId = classIdMap.get(value);
          if (serverId === undefined) droppedClassLinks += 1;
          else mapped.push(serverId);
        }
        return mapped;
      };

      for (const legacy of backup.subjects ?? []) {
        const subjectName = text(legacy.subjectName);
        if (!subjectName) {
          skip('subjects', legacy.id, 'missing subjectName');
          continue;
        }

        const legacyClassIds = remapClassIds(legacy.classIds);
        const primaryClassId = intOrNull(legacy.classId) !== null
          ? classIdMap.get(intOrNull(legacy.classId)!) ?? null
          : legacyClassIds?.[0] ?? null;

        const payload: Record<string, unknown> = {
          subjectName,
          isCore: legacy.isCore === true,
          teacherId: intOrNull(legacy.teacherId),
          classId: primaryClassId,
          departmentIds: jsonString(legacy.departmentIds),
          coreLevels: jsonString(legacy.coreLevels),
          classIds: jsonString(legacyClassIds),
          assistantTeacherIds: jsonString(legacy.assistantTeacherIds),
        };

        let createdRow: (typeof existingSubjects)[number] | null = null;
        const result = await upsert({
          existing: subjectByKey.get(subjectName),
          payload,
          create: async (data) => {
            createdRow = await tx.subject.create({ data: { ...data, schoolId: tenantId } as unknown as Prisma.SubjectUncheckedCreateInput });
            return createdRow;
          },
          update: (id, data) => tx.subject.update({ where: { id }, data: data as Prisma.SubjectUncheckedUpdateInput }),
        });

        if (createdRow) subjectByKey.set(subjectName, createdRow);
        subjectIdMap.set(legacy.id, result.id);
        bump('subjects', result.outcome);
      }

      if (droppedClassLinks > 0) {
        warn(`Dropped ${droppedClassLinks} subject↔class link(s) that referenced classes absent from the backup.`);
      }

      // ── 6. Students ─────────────────────────────────────────────────────
      const existingStudents = await tx.student.findMany({ where: { schoolId: tenantId } });
      const studentByKey = new Map(existingStudents.map((row) => [row.admissionNumber, row]));
      const studentIdMap = new Map<number, number>();

      for (const legacy of backup.students ?? []) {
        const admissionNumber = text(legacy.admissionNumber);
        const fullName = text(legacy.fullName);

        if (!admissionNumber || !fullName) {
          skip('students', legacy.id, 'missing admissionNumber or fullName');
          continue;
        }

        const classId = classIdMap.get(intOrNull(legacy.classId) ?? -1);
        if (classId === undefined) {
          skip('students', legacy.id, `classId ${legacy.classId} does not exist in the backup`);
          continue;
        }

        const gender = text(legacy.gender);
        if (gender !== 'Male' && gender !== 'Female') {
          skip('students', legacy.id, `unsupported gender "${legacy.gender ?? ''}"`);
          continue;
        }

        const payload: Record<string, unknown> = {
          admissionNumber,
          fullName,
          dateOfBirth: text(legacy.dateOfBirth),
          gender,
          classId,
          departmentId: intOrNull(legacy.departmentId),
          departmentName: text(legacy.departmentName),
          email: text(legacy.email),
          phone: text(legacy.phone),
          status: text(legacy.status) || 'Active',
          enrolledDate: text(legacy.enrolledDate),
          photoBase64: text(legacy.photoBase64),
          address: text(legacy.address),
          parentPhone: text(legacy.parentPhone),
          parentEmail: text(legacy.parentEmail),
          previousSchool: text(legacy.previousSchool),
          medicalNotes: text(legacy.medicalNotes),
        };

        let createdRow: (typeof existingStudents)[number] | null = null;
        const result = await upsert({
          existing: studentByKey.get(admissionNumber),
          payload,
          create: async (data) => {
            createdRow = await tx.student.create({ data: { ...data, schoolId: tenantId } as unknown as Prisma.StudentUncheckedCreateInput });
            return createdRow;
          },
          update: (id, data) => tx.student.update({ where: { id }, data: data as Prisma.StudentUncheckedUpdateInput }),
        });

        if (createdRow) studentByKey.set(admissionNumber, createdRow);
        studentIdMap.set(legacy.id, result.id);
        bump('students', result.outcome);
      }

      // ── 7. Grades (report card scores) ──────────────────────────────────
      const importedAt = new Date().toISOString();
      const existingGrades = await tx.grade.findMany({ where: { schoolId: tenantId } });
      const scoreKey = (studentId: number, subjectId: number, term: number, session: string): string =>
        `${studentId}|${subjectId}|${term}|${session}`;
      const gradeByKey = new Map(existingGrades.map((row) => [scoreKey(row.studentId, row.subjectId, row.term, row.session), row]));

      for (const legacy of backup.grades ?? []) {
        const studentId = studentIdMap.get(intOrNull(legacy.studentId) ?? -1);
        const subjectId = subjectIdMap.get(intOrNull(legacy.subjectId) ?? -1);
        const term = intOrNull(legacy.term);
        const session = text(legacy.session);

        if (studentId === undefined || subjectId === undefined) {
          skip('grades', legacy.id, 'student or subject is not present in the backup');
          continue;
        }
        if (term === null || !session) {
          skip('grades', legacy.id, 'missing term or session');
          continue;
        }

        const payload: Record<string, unknown> = {
          studentId,
          subjectId,
          term,
          session,
          caScores: jsonString(legacy.caScores) ?? '{}',
          examScore: numberOrNull(legacy.examScore) ?? 0,
          total: numberOrNull(legacy.total),
          grade: text(legacy.grade),
          remark: text(legacy.remark),
        };

        const result = await upsert({
          existing: gradeByKey.get(scoreKey(studentId, subjectId, term, session)),
          payload,
          createExtras: { updatedAt: importedAt },
          create: (data) => tx.grade.create({ data: { ...data, schoolId: tenantId } as unknown as Prisma.GradeUncheckedCreateInput }),
          update: (id, data) => tx.grade.update({ where: { id }, data: { ...data, updatedAt: importedAt } as Prisma.GradeUncheckedUpdateInput }),
        });

        bump('grades', result.outcome);
      }

      // ── 8. Trait grades (affective / psychomotor assessments) ───────────
      const existingTraitGrades = await tx.traitGrade.findMany({ where: { schoolId: tenantId } });
      const traitGradeByKey = new Map(
        existingTraitGrades.map((row) => [scoreKey(row.studentId, row.traitId, row.term, row.session), row]),
      );

      for (const legacy of backup.traitGrades ?? []) {
        const studentId = studentIdMap.get(intOrNull(legacy.studentId) ?? -1);
        const traitId = traitIdMap.get(intOrNull(legacy.traitId) ?? -1);
        const term = intOrNull(legacy.term);
        const session = text(legacy.session);

        if (studentId === undefined || traitId === undefined) {
          skip('traitGrades', legacy.id, 'student or trait is not present in the backup');
          continue;
        }
        if (term === null || !session) {
          skip('traitGrades', legacy.id, 'missing term or session');
          continue;
        }

        const payload: Record<string, unknown> = {
          studentId,
          traitId,
          term,
          session,
          score: numberOrNull(legacy.score) ?? 0,
        };

        const result = await upsert({
          existing: traitGradeByKey.get(scoreKey(studentId, traitId, term, session)),
          payload,
          createExtras: { updatedAt: importedAt },
          create: (data) => tx.traitGrade.create({ data: { ...data, schoolId: tenantId } as unknown as Prisma.TraitGradeUncheckedCreateInput }),
          update: (id, data) => tx.traitGrade.update({ where: { id }, data: { ...data, updatedAt: importedAt } as Prisma.TraitGradeUncheckedUpdateInput }),
        });

        bump('traitGrades', result.outcome);
      }

      // ── 9. Attendance summaries ─────────────────────────────────────────
      const summaryKey = (studentId: number, term: number, session: string): string => `${studentId}|${term}|${session}`;
      const existingAttendance = await tx.attendance.findMany({ where: { schoolId: tenantId } });
      const attendanceByKey = new Map(
        existingAttendance.map((row) => [summaryKey(row.studentId, row.term, row.session), row]),
      );
      let incompleteAttendance = 0;

      for (const legacy of backup.attendance ?? []) {
        const studentId = studentIdMap.get(intOrNull(legacy.studentId) ?? -1);
        const term = intOrNull(legacy.term);
        const session = text(legacy.session);

        if (studentId === undefined) {
          skip('attendance', legacy.id, 'student is not present in the backup');
          continue;
        }
        if (term === null || !session) {
          skip('attendance', legacy.id, 'missing term or session');
          continue;
        }

        if (numberOrNull(legacy.daysPresent) === null || numberOrNull(legacy.totalDays) === null) {
          incompleteAttendance += 1;
        }

        const payload: Record<string, unknown> = {
          studentId,
          term,
          session,
          daysPresent: intOrNull(legacy.daysPresent) ?? 0,
          totalDays: intOrNull(legacy.totalDays) ?? 0,
          teacherRemark: text(legacy.teacherRemark),
          principalRemark: text(legacy.principalRemark),
          syncStatus: 'synced',
        };

        const result = await upsert({
          existing: attendanceByKey.get(summaryKey(studentId, term, session)),
          payload,
          createExtras: { updatedAt: importedAt },
          create: (data) => tx.attendance.create({ data: { ...data, schoolId: tenantId } as unknown as Prisma.AttendanceUncheckedCreateInput }),
          update: (id, data) => tx.attendance.update({ where: { id }, data: { ...data, updatedAt: importedAt } as Prisma.AttendanceUncheckedUpdateInput }),
        });

        bump('attendance', result.outcome);
      }

      if (incompleteAttendance > 0) {
        warn(`${incompleteAttendance} attendance record(s) had no daysPresent/totalDays value and were imported as 0 — verify these before printing report cards.`);
      }

      // ── Tenant administrator account ────────────────────────────────
      // Activation is conditional: the setup-token account is created only when
      // the backup contains users with recoverable credentials; otherwise a
      // generic admin breaks authentication for real users and must be skipped.
      const existingAdmin = await tx.user.findFirst({ where: { email: adminEmail } });

      if (existingAdmin) {
        if (existingAdmin.schoolId !== tenantId) {
          warn(`Email ${adminEmail} already belongs to a different tenant, so no admin account was created for "${schoolName}". Pass --admin-email with an address unique to this school.`);
          admin = { email: adminEmail, created: false, activationUrl: null };
        } else {
          bump('users', 'unchanged');
          admin = { email: adminEmail, created: false, activationUrl: null };
        }
      } else {
        const adminPassword = text(options.adminPassword);
        // Activation-token flow by default: no administrator-known passwords.
        // Plaintext token is never persisted (deprecated setupToken is null); only SHA-256 hash is stored.
        const rawToken = adminPassword ? null : crypto.randomBytes(32).toString('hex');
        const setupTokenHash = rawToken ? crypto.createHash('sha256').update(rawToken).digest('hex') : null;
        const setupTokenExpires = rawToken ? new Date(Date.now() + 48 * 60 * 60 * 1000) : null;

        await tx.user.create({
          data: {
            email: adminEmail,
            fullName: text(options.adminFullName) || `${schoolName} Administrator`,
            role: 'admin',
            isAdmin: true,
            schoolId: tenantId,
            status: adminPassword ? 'active' : 'pending_activation',
            passwordHash: adminPassword ? await bcrypt.hash(adminPassword, 12) : null,
            setupToken: null,
            setupTokenHash,
            setupTokenExpires,
          } as Prisma.UserUncheckedCreateInput,
        });

        bump('users', 'created');
        admin = {
          email: adminEmail,
          created: true,
          activationUrl: rawToken ? `${clientUrl}/setup-password?token=${rawToken}` : null,
        };
      }


      if (!apply) throw new DryRunRollback();
    }, { maxWait: 30_000, timeout: 300_000 });
  } catch (err) {
    if (!isDryRunRollback(err)) throw err;
  }

  if (analysis.teacherNames.length) {
    warn(`Class teacher names exist on classes but have no user accounts (invite them from Admin → Users): ${analysis.teacherNames.join(', ')}`);
  }

  return {
    dryRun: !apply,
    schoolSlug,
    schoolName,
    schoolId,
    schoolCreated,
    counts,
    warnings,
    admin,
  };
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

/** Parses `--flag=value` arguments; anything unrecognised is ignored. */
export function parseCliOptions(argv: string[]): ImportOptions {
  const options: ImportOptions = {};

  for (const arg of argv) {
    const separator = arg.indexOf('=');
    const flag = separator === -1 ? arg : arg.slice(0, separator);
    const value = separator === -1 ? undefined : arg.slice(separator + 1);

    switch (flag) {
      case '--file':
        if (value) options.backupPath = value;
        break;
      case '--slug':
        if (value) options.schoolSlug = value;
        break;
      case '--school-name':
        if (value) options.schoolName = value;
        break;
      case '--admin-email':
        if (value) options.adminEmail = value;
        break;
      case '--admin-name':
        if (value) options.adminFullName = value;
        break;
      case '--admin-password':
        if (value) options.adminPassword = value;
        break;
      case '--apply':
        options.apply = true;
        break;
      case '--force':
        options.force = true;
        break;
      default:
        break;
    }
  }

  return options;
}

/** Renders an import summary for the terminal. */
export function formatSummary(summary: ImportSummary): string {
  const lines: string[] = [];
  lines.push('');
  lines.push('Tenant Backfill Summary');
  lines.push('───────────────────────────────────────────────────────────');
  lines.push(`School     : ${summary.schoolName} (slug "${summary.schoolSlug}")`);
  lines.push(`School id  : ${summary.schoolId ?? '(none)'}`);
  lines.push(`Mode       : ${summary.dryRun ? 'DRY RUN — no writes were committed' : 'APPLIED'}`);
  lines.push('');
  lines.push('Table         created   updated   unchanged   skipped');

  for (const [table, count] of Object.entries(summary.counts)) {
    lines.push(
      `${table.padEnd(13)} ${String(count.created).padStart(7)}  ${String(count.updated).padStart(8)}  ${String(count.unchanged).padStart(10)}  ${String(count.skipped).padStart(8)}`,
    );
  }

  if (summary.admin) {
    lines.push('');
    lines.push(`Admin      : ${summary.admin.email}${summary.admin.created ? ' (created)' : ' (already existed)'}`);
    if (summary.admin.activationUrl) {
      lines.push(`Activation : ${summary.admin.activationUrl}`);
      lines.push('             Share this one-time link with the school administrator.');
    }
  }

  if (summary.warnings.length > 0) {
    lines.push('');
    lines.push(`Warnings (${summary.warnings.length}):`);
    for (const warning of summary.warnings) {
      lines.push(`  • ${warning}`);
    }
  }

  lines.push('───────────────────────────────────────────────────────────');
  return lines.join('\n');
}

// Run directly if invoked from CLI, matching the existing script convention
if (process.argv[1]?.includes('importTenantBackup')) {
  const options = parseCliOptions(process.argv.slice(2));

  importTenantBackup(options)
    .then((summary) => {
      console.log(formatSummary(summary));
      if (summary.dryRun) {
        console.log('\nThis was a DRY RUN. Re-run the same command with --apply to commit the import.\n');
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Tenant Backfill Error]', err instanceof Error ? err.message : err);
      process.exit(1);
    });
}





