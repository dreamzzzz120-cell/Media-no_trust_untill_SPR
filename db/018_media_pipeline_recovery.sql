CREATE TABLE IF NOT EXISTS media_processing_runs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  asset_id TEXT,
  content_hash CHAR(64) NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  idempotency_key TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('QUARANTINED','SCANNED_CLEAN','VERIFIED','PERSISTED','COMPLETED','FAILED')),
  failure_code TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 1 CHECK (attempt_count > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id,idempotency_key)
);
CREATE INDEX IF NOT EXISTS media_processing_runs_hash_idx ON media_processing_runs(organization_id,content_hash,updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS trust_observations_retry_uq ON trust_observations(passport_id,dimension,content_hash,policy_version,model_name,model_version);
CREATE UNIQUE INDEX IF NOT EXISTS evidence_retry_uq ON evidence(passport_id,id);
