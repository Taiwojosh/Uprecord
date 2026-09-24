import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

// Resolve SQLite file path from typical URL formats
let dbPath = databaseUrl.replace(/^file:/, '').replace(/^sqlite:/, '');
if (dbPath.startsWith('//')) dbPath = dbPath.slice(2);

const backupsDir = '/srv/globepen/shared/backups';
fs.mkdirSync(backupsDir, { recursive: true });
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(backupsDir, `devikys-backup-${timestamp}.db`);

const cmd = `sqlite3 "${dbPath}" ".backup '${backupPath}'`;
exec(cmd, (error, stdout, stderr) => {
  if (error) {
    console.error('Backup failed:', error.message);
    process.exit(1);
  }
  // Restrict permissions (read/write for owner only)
  fs.chmodSync(backupPath, 0o600);
  console.log(`Backup created at ${backupPath}`);
});
