// ============================================================
// Database backup — copies the SQLite file to a timestamped
// backup alongside it. Safe to run while the app is running.
//
//   npx tsx scripts/backup-db.ts
//   # or schedule nightly:
//   0 2 * * * cd /app && npx tsx scripts/backup-db.ts
// ============================================================

import fs from 'fs';
import path from 'path';

function resolveSqlitePath(): string | null {
  const url = process.env.DATABASE_URL ?? 'file:./dev.db';
  const match = /^file:(.+)$/.exec(url);
  if (!match) return null;
  const raw = match[1];
  // Relative SQLite paths are resolved from the prisma/ directory.
  return path.isAbsolute(raw) ? raw : path.resolve('prisma', raw);
}

function main() {
  const dbPath = resolveSqlitePath();
  if (!dbPath || !fs.existsSync(dbPath)) {
    console.error(`❌ Database file not found: ${dbPath}`);
    process.exit(1);
  }

  const dir = path.join(path.dirname(dbPath), 'backups');
  fs.mkdirSync(dir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.join(dir, `odyssey-${stamp}.db`);
  fs.copyFileSync(dbPath, target);

  // Keep only the 14 most recent backups.
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith('odyssey-') && f.endsWith('.db'))
    .sort()
    .reverse();
  for (const old of files.slice(14)) {
    fs.unlinkSync(path.join(dir, old));
  }

  console.log(`✅ Backup written: ${target}`);
}

main();
