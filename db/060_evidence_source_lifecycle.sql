-- Evidence source lifecycle: preserve historical evidence while making current source trust state explicit and append-only.
CREATE TABLE IF NOT EXISTS evidence_source_status_events(
 id UUID PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 source_id UUID NOT NULL,
 status TEXT NOT NULL CHECK(status IN('ACTIVE','SUSPENDED','REVOKED','DECOMMISSIONED','UNKNOWN')),
 reason TEXT NOT NULL,
 evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'),
 effective_at TIMESTAMPTZ NOT NULL,
 known_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id),
 FOREIGN KEY(source_id,organization_id) REFERENCES evidence_sources(id,organization_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS evidence_source_status_latest_idx
 ON evidence_source_status_events(organization_id,source_id,effective_at DESC,known_at DESC,id DESC);
CREATE OR REPLACE FUNCTION reject_evidence_source_status_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'evidence source status history is append-only'; END $$;
DROP TRIGGER IF EXISTS evidence_source_status_events_immutable ON evidence_source_status_events;
CREATE TRIGGER evidence_source_status_events_immutable
 BEFORE UPDATE OR DELETE ON evidence_source_status_events
 FOR EACH ROW EXECUTE FUNCTION reject_evidence_source_status_mutation();
