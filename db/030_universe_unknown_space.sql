-- Unknown-space semantics: explicit observability gaps and indirect unknown-system evidence.
CREATE TABLE universe_observability_gaps (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 collector_id UUID, entity_id UUID, gap_type TEXT NOT NULL CHECK(gap_type IN ('BLACK_HOLE','VISIBILITY_LOSS')),
 started_at TIMESTAMPTZ NOT NULL, resumed_at TIMESTAMPTZ,
 state TEXT NOT NULL CHECK(state IN ('OPEN','RESUMED','UNKNOWN')),
 evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id),
 FOREIGN KEY(collector_id,organization_id) REFERENCES universe_collectors(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(entity_id,organization_id) REFERENCES constellation_entities(id,organization_id) ON DELETE RESTRICT,
 CHECK(resumed_at IS NULL OR resumed_at>=started_at)
);
CREATE TABLE universe_dark_matter (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 signal_type TEXT NOT NULL, description TEXT NOT NULL,
 identity_state TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK(identity_state='UNKNOWN'),
 owner_state TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK(owner_state='UNKNOWN'),
 authority_state TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK(authority_state='UNKNOWN'),
 evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 first_observed_at TIMESTAMPTZ NOT NULL, last_observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(id,organization_id),
 CHECK(last_observed_at>=first_observed_at)
);
