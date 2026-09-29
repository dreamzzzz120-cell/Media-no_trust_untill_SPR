CREATE TABLE IF NOT EXISTS ingestion_gate_events(
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 content_hash CHAR(64) NOT NULL CHECK(content_hash ~ '^[a-f0-9]{64}$'),
 state TEXT NOT NULL CHECK(state IN('BLOCKED_UNVERIFIED')),
 reason TEXT NOT NULL,
 scanner_url TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ingestion_gate_events_org_time_idx ON ingestion_gate_events(organization_id,created_at DESC);
ALTER TABLE media_processing_runs DROP CONSTRAINT IF EXISTS media_processing_runs_stage_check;
ALTER TABLE media_processing_runs ADD CONSTRAINT media_processing_runs_stage_check CHECK(stage IN('QUARANTINED','BLOCKED_UNVERIFIED','SCANNED_CLEAN','VERIFIED','PERSISTED','COMPLETED','FAILED'));
