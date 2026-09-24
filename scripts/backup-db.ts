import { execFileSync } from 'node:child_process';
import { mkdirSync, chmodSync, existsSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
const url = process.env.DATABASE_URL;
if (!url?.startsWith('file:')) throw new Error('Expected an absolute SQLite file: DATABASE_URL');
const source = url.slice(5);
if (!isAbsolute(source) || !existsSync(source)) throw new Error('Database path must be absolute and already exist');
const dir = process.env.BACKUP_DIR || '/srv/globepen/shared/backups';
mkdirSync(dir, { recursive: true, mode: 0o700 });
chmodSync(dir, 0o700);
const output = join(dir, `globepen-${Date.now()}.db`);
execFileSync('python3', ['-c', `import sqlite3,sys,os
os.umask(0o077)
source=sqlite3.connect('file:'+sys.argv[1]+'?mode=ro',uri=True)
target=sqlite3.connect(sys.argv[2])
source.backup(target)
assert target.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
target.close()
source.close()`, source, output], { stdio: 'pipe' });
chmodSync(output, 0o600);
console.log(`Verified backup: ${output}`);
