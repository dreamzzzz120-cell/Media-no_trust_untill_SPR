import postgres from 'postgres';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const databaseUrl=process.env.DATABASE_URL;if(!databaseUrl)throw new Error('DATABASE_URL is required for migrations');
const sql=postgres(databaseUrl,{max:1,connect_timeout:10,prepare:false,onnotice:()=>undefined});
const checksum=(s:string)=>createHash('sha256').update(s).digest('hex');
const LOCK_ID=764208451;
try{
 await sql`SELECT pg_advisory_lock(${LOCK_ID})`;
 await sql`CREATE TABLE IF NOT EXISTS schema_migrations(version TEXT PRIMARY KEY,checksum CHAR(64),applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
 await sql`ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS checksum CHAR(64)`;
 const files=(await readdir(resolve(process.cwd(),'db'))).filter(name=>/^\d+_.+\.sql$/.test(name)).sort();
 if(new Set(files).size!==files.length)throw new Error('DUPLICATE_MIGRATION_FILENAME');
 for(const file of files){const version=file.replace(/\.sql$/,'');const migration=await readFile(resolve(process.cwd(),'db',file),'utf8');const sum=checksum(migration);const applied=await sql<{version:string;checksum:string|null}[]>`SELECT version,checksum FROM schema_migrations WHERE version=${version} LIMIT 1`;if(applied.length){if(applied[0].checksum&&applied[0].checksum!==sum)throw new Error(`MIGRATION_DRIFT:${version}`);if(!applied[0].checksum)await sql`UPDATE schema_migrations SET checksum=${sum} WHERE version=${version} AND checksum IS NULL`;console.log(`Migration ${version} already applied`);continue}await sql.begin(async tx=>{await tx.unsafe(migration);await tx`INSERT INTO schema_migrations(version,checksum) VALUES(${version},${sum})`});console.log(`Applied migration ${version}`)}
}finally{try{await sql`SELECT pg_advisory_unlock(${LOCK_ID})`}catch{}await sql.end({timeout:5})}
