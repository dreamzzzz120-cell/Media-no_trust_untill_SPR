-- Satellites: independent evidence collectors with explicit coverage and health.
CREATE TABLE universe_collectors (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 collector_key TEXT NOT NULL, name TEXT NOT NULL,
 collector_type TEXT NOT NULL CHECK(collector_type IN ('IDENTITY','MODEL','NETWORK','SECURITY','COST','PROVENANCE','POLICY','HUMAN_INTERVENTION','CODE','OTHER')),
 version TEXT NOT NULL, collection_method TEXT NOT NULL, signing_identity TEXT,
 evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id), UNIQUE(organization_id,collector_key,version)
);
CREATE TABLE universe_collector_observations (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL, collector_id UUID NOT NULL,
 health TEXT NOT NULL CHECK(health IN ('HEALTHY','DEGRADED','DOWN','UNKNOWN')),
 coverage_state TEXT NOT NULL CHECK(coverage_state IN ('OBSERVED','PARTIAL','UNOBSERVED','UNKNOWN')),
 coverage_from TIMESTAMPTZ, coverage_until TIMESTAMPTZ,
 evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(), metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(id,organization_id),
 FOREIGN KEY(collector_id,organization_id) REFERENCES universe_collectors(id,organization_id) ON DELETE RESTRICT,
 CHECK(coverage_until IS NULL OR coverage_from IS NULL OR coverage_until>=coverage_from)
);
CREATE INDEX universe_collector_obs_idx ON universe_collector_observations(organization_id,collector_id,observed_at DESC);
