import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

export async function setup() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL must be defined for test setup.');
  }

  // Deploy migrations to the disposable test database before running any tests.
  // Fail loudly on migration failure — do NOT swallow errors.
  try {
    execSync('node node_modules/prisma/build/index.js migrate deploy', {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: dbUrl },
      stdio: 'pipe',
    });
  } catch (err: any) {
    const errorDetails = err.stderr ? err.stderr.toString() : err.message;
    throw new Error(`[Test Isolation Blocker] Migration deploy failed on disposable test DB: ${errorDetails}`);
  }
}

export async function teardown() {
  const dbName = process.env.DISPOSABLE_TEST_DB;
  if (dbName && dbName.startsWith('disposable-test-')) {
    const dbPath = path.resolve(ROOT, 'prisma', dbName);
    const journalPath = `${dbPath}-journal`;
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
      if (fs.existsSync(journalPath)) fs.unlinkSync(journalPath);
    } catch {
      // Best-effort cleanup on process teardown
    }
  }
}
