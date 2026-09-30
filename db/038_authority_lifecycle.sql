-- Authority lifecycle: expiry/revocation are evidence events, never silent mutation of historical grants.
CREATE TABLE universe_authority_status_events (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 subject_type TEXT NOT NULL CHECK(subject_type IN ('LICENSE','MISSION','APPROVAL','AUTHORITY_ROOT')),
 subject_id UUID NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('ACTIVE','EXPIRED','REVOKED','SUSPENDED','UNKNOWN')),
 reason TEXT NOT NULL,
 evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 effective_at TIMESTAMPTZ NOT NULL, observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(id,organization_id),
 CHECK(observed_at>=effective_at)
);
CREATE TABLE universe_authority_freshness (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 subject_type TEXT NOT NULL CHECK(subject_type IN ('LICENSE','MISSION','APPROVAL','AUTHORITY_ROOT')),
 subject_id UUID NOT NULL,
 freshness_state TEXT NOT NULL CHECK(freshness_state IN ('CURRENT','STALE','UNKNOWN')),
 valid_as_of TIMESTAMPTZ NOT NULL, checked_at TIMESTAMPTZ NOT NULL,
 evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 known_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id), CHECK(checked_at>=valid_as_of)
);
CREATE INDEX universe_authority_status_subject_idx ON universe_authority_status_events(organization_id,subject_type,subject_id,effective_at DESC);
CREATE INDEX universe_authority_freshness_subject_idx ON universe_authority_freshness(organization_id,subject_type,subject_id,checked_at DESC);
CREATE OR REPLACE FUNCTION reject_authority_lifecycle_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'authority lifecycle evidence is append-only'; END $$;
CREATE TRIGGER universe_authority_status_events_immutable BEFORE UPDATE OR DELETE ON universe_authority_status_events FOR EACH ROW EXECUTE FUNCTION reject_authority_lifecycle_mutation();
CREATE TRIGGER universe_authority_freshness_immutable BEFORE UPDATE OR DELETE ON universe_authority_freshness FOR EACH ROW EXECUTE FUNCTION reject_authority_lifecycle_mutation();
