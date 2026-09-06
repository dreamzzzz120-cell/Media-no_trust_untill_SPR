import postgres from 'postgres';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required for migrations');

const sql = postgres(databaseUrl, {
  max: 1,
  connect_timeout: 10,
  prepare: false,
  onnotice: () => undefined,
});

try {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  const migrationPath = resolve(process.cwd(), 'db/001_init.sql');
  const migration = await readFile(migrationPath, 'utf8');
  const version = '001_init';
  const applied = await sql<{ version: string }[]>`
    SELECT version FROM schema_migrations WHERE version = ${version} LIMIT 1
  `;

  if (applied.length === 0) {
    await sql.begin(async (tx) => {
      await tx.unsafe(migration);
      await tx`INSERT INTO schema_migrations (version) VALUES (${version})`;
    });
    console.log(`Applied migration ${version}`);
  } else {
    console.log(`Migration ${version} already applied`);
  }
} finally {
  await sql.end({ timeout: 5 });
}
