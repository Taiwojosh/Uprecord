import { defineConfig } from 'vitest/config';
import path from 'path';
import { randomBytes } from 'node:crypto';

// Prisma's SQLite migration engine expects a path relative to prisma/schema.prisma.
// Always generate our own unique file; never inherit a developer or production URL.
const testDbName = `sefernote-vitest-${Date.now()}-${randomBytes(8).toString('hex')}.db`;
const testDbUrl = `file:./${testDbName}`;
process.env.DATABASE_URL = testDbUrl;
process.env.DISPOSABLE_TEST_DB = testDbName;

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['server/tests/**/*.test.ts'],
    setupFiles: ['server/tests/setup.ts'],
    globalSetup: ['server/tests/globalSetup.ts'],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDbUrl,
      DISPOSABLE_TEST_DB: testDbName,
      JWT_SECRET: 'test-super-secret-jwt-key-for-vitest-32chars',
      CLIENT_URL: 'http://localhost:3000',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
