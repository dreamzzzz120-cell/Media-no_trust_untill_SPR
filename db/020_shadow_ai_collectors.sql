CREATE TABLE IF NOT EXISTS ai_collector_runs(
 id UUID PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 collector_key TEXT NOT NULL,
 collector_version TEXT NOT NULL,
 provider TEXT NOT NULL,
 health TEXT NOT NULL CHECK(health IN('HEALTHY','DEGRADED','DOWN','UNKNOWN')),
 coverage TEXT NOT NULL CHECK(coverage IN('OBSERVED','PARTIAL','UNOBSERVED','UNKNOWN')),
 evidence_id UUID REFERENCES canonical_evidence(id) ON DELETE SET NULL,
 evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[a-f0-9]{64}$'),
 observed_at TIMESTAMPTZ NOT NULL,
 collected_at TIMESTAMPTZ NOT NULL,
 limitations JSONB NOT NULL DEFAULT '[]'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_collector_runs_org_time_idx ON ai_collector_runs(organization_id,collected_at DESC);
CREATE INDEX IF NOT EXISTS ai_collector_runs_org_collector_idx ON ai_collector_runs(organization_id,collector_key,collected_at DESC);
