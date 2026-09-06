import postgres from 'postgres';
import { nanoid } from 'nanoid';
import type { VerificationRecord } from './domain/media.js';

export interface RecordStore {
  save(record: VerificationRecord): Promise<void>;
  get(id: string): Promise<VerificationRecord | null>;
  ready(): Promise<boolean>;
  close(): Promise<void>;
}

export function createStore(databaseUrl: string | undefined): RecordStore {
  if (!databaseUrl) return new MemoryStore();
  const sql = postgres(databaseUrl, { max: 10, idle_timeout: 20, connect_timeout: 10, prepare: false, onnotice: () => undefined });
  return new PostgresStore(sql);
}

class MemoryStore implements RecordStore {
  private readonly records = new Map<string, VerificationRecord>();
  async save(record: VerificationRecord) { this.records.set(record.asset.id, structuredClone(record)); }
  async get(id: string) { return structuredClone(this.records.get(id) ?? null); }
  async ready() { return true; }
  async close() { this.records.clear(); }
}

class PostgresStore implements RecordStore {
  constructor(private readonly sql: postgres.Sql) {}

  async save(record: VerificationRecord) {
    await this.sql.begin(async (tx) => {
      await tx`
        INSERT INTO media_verifications (id, sha256, mime, kind, size_bytes, original_filename, record_json)
        VALUES (${record.asset.id}, ${record.asset.sha256}, ${record.asset.mime}, ${record.asset.kind}, ${record.asset.sizeBytes}, ${record.asset.originalFilename}, ${tx.json(record)})
        ON CONFLICT (id) DO UPDATE SET record_json = EXCLUDED.record_json
      `;
      await tx`
        INSERT INTO media_assets (id, sha256, mime, kind, size_bytes, original_filename, declared_ai_use, organization_id, creator_id)
        VALUES (${record.asset.id}, ${record.asset.sha256}, ${record.asset.mime}, ${record.asset.kind}, ${record.asset.sizeBytes}, ${record.asset.originalFilename}, ${record.asset.declaredAiUse ?? 'UNKNOWN'}, ${record.asset.organizationId ?? null}, ${record.asset.creatorId ?? null})
        ON CONFLICT (id) DO UPDATE SET declared_ai_use=EXCLUDED.declared_ai_use
      `;
      await tx`
        INSERT INTO media_passports (id, asset_id, trust_score, confidence, decision, ai_status, created_at, updated_at)
        VALUES (${record.asset.id}, ${record.asset.id}, ${record.trustScore}, ${record.confidence}, ${record.decision}, ${record.aiStatus}, ${record.createdAt ? new Date(record.createdAt) : new Date()}, now())
        ON CONFLICT (id) DO UPDATE SET trust_score=EXCLUDED.trust_score, confidence=EXCLUDED.confidence, decision=EXCLUDED.decision, ai_status=EXCLUDED.ai_status, updated_at=now()
      `;
      for (const [dimension, score] of Object.entries(record.trustVector)) {
        await tx`
          INSERT INTO trust_observations (id, passport_id, dimension, score, confidence, evidence_id, model_name, model_version, content_hash, policy_version, observed_at)
          VALUES (${nanoid(21)}, ${record.asset.id}, ${dimension}, ${score}, ${record.confidence}, null, 'media-passport-engine', '1.0.0', ${record.asset.sha256}, ${record.policyVersion}, now())
        `;
      }
      for (const observation of record.observations) {
        const evidenceId = observation.id ?? nanoid(21);
        await tx`
          INSERT INTO evidence (id, passport_id, source, evidence_type, result, confidence, details, content_hash, model_name, model_version, created_at)
          VALUES (${evidenceId}, ${record.asset.id}, ${observation.source}, ${observation.signal}, ${observation.result}, ${observation.confidence ?? null}, ${tx.json({ details: observation.details ?? null })}, ${observation.contentHash ?? record.asset.sha256}, ${observation.model?.name ?? 'media-passport-engine'}, ${observation.model?.version ?? '1.0.0'}, ${observation.createdAt ? new Date(observation.createdAt) : new Date()})
        `;
      }
      await tx`
        INSERT INTO provenance_manifests (id, passport_id, status, issuer, manifest_hash, assertions, created_at)
        VALUES (${nanoid(21)}, ${record.asset.id}, ${record.provenance.status}, ${record.provenance.issuer ?? null}, ${record.provenance.manifestHash ?? null}, ${tx.json(record.provenance.activeManifest ?? [])}, now())
      `;
    });
  }

  async get(id: string) {
    const rows = await this.sql<{ record_json: VerificationRecord }[]>`SELECT record_json FROM media_verifications WHERE id = ${id} LIMIT 1`;
    return rows[0]?.record_json ?? null;
  }

  async ready() {
    try { await this.sql`SELECT 1`; return true; } catch { return false; }
  }

  async close() { await this.sql.end({ timeout: 5 }); }
}
