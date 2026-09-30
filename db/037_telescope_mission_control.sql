-- Telescope + Mission Control: evidence-backed investigations without rewriting history.
CREATE TABLE universe_investigations (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 title TEXT NOT NULL, purpose TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('OPEN','IN_REVIEW','RESOLVED','CLOSED','UNKNOWN')),
 opened_by_entity_id UUID, opened_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(id,organization_id),
 FOREIGN KEY(opened_by_entity_id,organization_id) REFERENCES constellation_entities(id,organization_id) ON DELETE RESTRICT
);
CREATE TABLE universe_investigation_items (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL, investigation_id UUID NOT NULL,
 item_type TEXT NOT NULL CHECK(item_type IN ('ENTITY','EVENT','RELATIONSHIP','RESOURCE','MISSION','RECEIPT','INCIDENT','EVIDENCE','LAW','OTHER')),
 item_reference TEXT NOT NULL, finding_state TEXT NOT NULL CHECK(finding_state IN ('SUPPORTED','PARTIAL','UNSUPPORTED','UNKNOWN','CONFLICTING')),
 finding TEXT NOT NULL, evidence_hash CHAR(64) CHECK(evidence_hash IS NULL OR evidence_hash ~ '^[0-9a-f]{64}$'),
 observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id),
 FOREIGN KEY(investigation_id,organization_id) REFERENCES universe_investigations(id,organization_id) ON DELETE RESTRICT,
 CHECK(finding_state='UNKNOWN' OR evidence_hash IS NOT NULL)
);
CREATE TABLE universe_timeline_snapshots (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 investigation_id UUID, subject_type TEXT NOT NULL, subject_reference TEXT NOT NULL,
 happened_as_of TIMESTAMPTZ NOT NULL, known_as_of TIMESTAMPTZ NOT NULL,
 snapshot JSONB NOT NULL, snapshot_digest CHAR(64) NOT NULL CHECK(snapshot_digest ~ '^[0-9a-f]{64}$'),
 completeness TEXT NOT NULL CHECK(completeness IN ('SUPPORTED','PARTIAL','UNKNOWN','CONFLICTING')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(id,organization_id),
 FOREIGN KEY(investigation_id,organization_id) REFERENCES universe_investigations(id,organization_id) ON DELETE RESTRICT
);
CREATE INDEX universe_investigation_items_idx ON universe_investigation_items(organization_id,investigation_id,observed_at);
CREATE INDEX universe_timeline_subject_idx ON universe_timeline_snapshots(organization_id,subject_type,subject_reference,happened_as_of,known_as_of);
CREATE OR REPLACE FUNCTION reject_investigation_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'investigation evidence is append-only'; END $$;
CREATE TRIGGER universe_investigation_items_immutable BEFORE UPDATE OR DELETE ON universe_investigation_items FOR EACH ROW EXECUTE FUNCTION reject_investigation_history_mutation();
CREATE TRIGGER universe_timeline_snapshots_immutable BEFORE UPDATE OR DELETE ON universe_timeline_snapshots FOR EACH ROW EXECUTE FUNCTION reject_investigation_history_mutation();
