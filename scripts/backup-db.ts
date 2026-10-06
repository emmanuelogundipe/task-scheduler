// ============================================================
// Database backup — dumps the PostgreSQL database to a
// timestamped .sql file. Requires `pg_dump` on the PATH.
//
//   npm run db:backup
//   # or schedule nightly:
//   0 2 * * * cd /app && npm run db:backup
//
// Tip: managed providers (e.g. Neon) also offer automated backups.
// ============================================================

import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function main() {
  const url = process.env.DATABASE_URL;
  if (!url || !url.startsWith('postgres')) {
    console.error('❌ DATABASE_URL must be a PostgreSQL connection string.');
    process.exit(1);
  }

  const dir = path.resolve('backups');
  fs.mkdirSync(dir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.join(dir, `odyssey-${stamp}.sql`);

  try {
    console.log('⏳ Running pg_dump…');
    const output = execFileSync('pg_dump', ['--no-owner', '--no-privileges', url], {
      encoding: 'buffer',
      maxBuffer: 512 * 1024 * 1024,
    });
    fs.writeFileSync(target, output);
  } catch (e: any) {
    console.error('❌ pg_dump failed:', e?.message ?? e);
    console.error('   Ensure PostgreSQL client tools (pg_dump) are installed.');
    process.exit(1);
  }

  // Keep only the 14 most recent backups.
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith('odyssey-') && f.endsWith('.sql'))
    .sort()
    .reverse();
  for (const old of files.slice(14)) fs.unlinkSync(path.join(dir, old));

  console.log(`✅ Backup written: ${target}`);
}

main();
