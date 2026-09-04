import postgres from 'postgres';
import type { VerificationRecord } from './domain/media.js';

export interface RecordStore {
  save(record: VerificationRecord): Promise<void>;
  get(id: string): Promise<VerificationRecord | null>;
}

export function createStore(databaseUrl: string | undefined): RecordStore {
  if (!databaseUrl) return new MemoryStore();
  const sql = postgres(databaseUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    onnotice: () => undefined,
  });
  return new PostgresStore(sql);
}

class MemoryStore implements RecordStore {
  private readonly records = new Map<string, VerificationRecord>();
  async save(record: VerificationRecord) { this.records.set(record.asset.id, structuredClone(record)); }
  async get(id: string) { return structuredClone(this.records.get(id) ?? null); }
}

class PostgresStore implements RecordStore {
  constructor(private readonly sql: postgres.Sql) {}

  async save(record: VerificationRecord) {
    await this.sql`
      INSERT INTO media_verifications (id, sha256, mime, kind, size_bytes, original_filename, record_json)
      VALUES (${record.asset.id}, ${record.asset.sha256}, ${record.asset.mime}, ${record.asset.kind}, ${record.asset.sizeBytes}, ${record.asset.originalFilename}, ${this.sql.json(record)})
      ON CONFLICT (id) DO UPDATE SET record_json = EXCLUDED.record_json
    `;
  }

  async get(id: string) {
    const rows = await this.sql<{ record_json: VerificationRecord }[]>`
      SELECT record_json FROM media_verifications WHERE id = ${id} LIMIT 1
    `;
    return rows[0]?.record_json ?? null;
  }
}
