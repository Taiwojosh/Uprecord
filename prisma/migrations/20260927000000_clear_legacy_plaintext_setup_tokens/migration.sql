-- Clears legacy plaintext activation tokens. Setup token authentication is now
-- hash-only (using setupTokenHash SHA-256), so any remaining plaintext tokens
-- in the database are no longer read and must be cleared for data minimization.
UPDATE "User" SET "setupToken" = NULL WHERE "setupToken" IS NOT NULL;
