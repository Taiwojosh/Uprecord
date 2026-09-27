import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import path from 'node:path';

function assertDisposableDatabase() {
  const dbName = process.env.DISPOSABLE_TEST_DB;
  if (!dbName || !/^sefernote-vitest-\d+-[0-9a-f]{16}\.db$/.test(dbName)) {
    throw new Error('Refusing test database operation without a run-specific filename.');
  }
  const expected = `file:./${dbName}`;
  if (process.env.DATABASE_URL !== expected) throw new Error('Refusing to use an unexpected test database.');
  return path.resolve(import.meta.dirname, '../../prisma', dbName);
}

export function setup() {
  assertDisposableDatabase();
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
    cwd: path.resolve(import.meta.dirname, '../..'),
    env: { ...process.env, NODE_ENV: 'test' },
    stdio: 'pipe',
  });
}

export function teardown() {
  const filename = assertDisposableDatabase();
  for (const suffix of ['', '-journal', '-wal', '-shm']) rmSync(filename + suffix, { force: true });
}
