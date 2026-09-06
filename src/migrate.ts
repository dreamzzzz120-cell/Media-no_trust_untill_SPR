import postgres from 'postgres';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required for migrations');
const sql = postgres(databaseUrl, { max: 1, connect_timeout: 10, prepare: false, onnotice: () => undefined });

try {
  await sql`CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
  const files = (await readdir(resolve(process.cwd(), 'db'))).filter(name => /^\d+_.+\.sql$/.test(name)).sort();
  for (const file of files) {
    const version = file.replace(/\.sql$/, '');
    const applied = await sql<{ version: string }[]>`SELECT version FROM schema_migrations WHERE version = ${version} LIMIT 1`;
    if (applied.length) { console.log(`Migration ${version} already applied`); continue; }
    const migration = await readFile(resolve(process.cwd(), 'db', file), 'utf8');
    await sql.begin(async (tx) => {
      await tx.unsafe(migration);
      await tx`INSERT INTO schema_migrations (version) VALUES (${version})`;
    });
    console.log(`Applied migration ${version}`);
  }
} finally {
  await sql.end({ timeout: 5 });
}
