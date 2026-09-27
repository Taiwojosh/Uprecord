import { defineConfig } from 'vitest/config';
import path from 'path';
import crypto from 'crypto';

// Generate a run-specific disposable SQLite database for this test run
const testDbName = process.env.TEST_DB_FILE || `disposable-test-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.db`;
const testDbUrl = process.env.DATABASE_URL || `file:./${testDbName}`;

// Ensure process.env in root runner process has these variables for globalSetup
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
