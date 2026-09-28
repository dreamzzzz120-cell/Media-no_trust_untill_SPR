CREATE TABLE ai_systems (
 id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 name TEXT NOT NULL, purpose TEXT NOT NULL, owner TEXT, provider TEXT, model TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(id, organization_id)
);
CREATE INDEX ai_systems_tenant_idx ON ai_systems(organization_id, created_at DESC);
CREATE TABLE ai_events (
 id TEXT PRIMARY KEY, sequence BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE, organization_id TEXT NOT NULL, ai_id TEXT NOT NULL,
 event_type TEXT NOT NULL CHECK (event_type IN ('OUTPUT','TOOL_REQUEST','TOOL_RESULT','ACTION_REQUESTED','ACTION_CONFIRMED','ACTION_FAILED','APPROVAL_REQUESTED','APPROVAL_GRANTED','APPROVAL_DENIED','CONFIG_CHANGED')),
 source_type TEXT NOT NULL CHECK (source_type IN ('DECLARATION','DIRECT_OBSERVATION','AUTHORITATIVE_SYSTEM','SIGNED_ATTESTATION')),
 source TEXT NOT NULL, summary TEXT NOT NULL, occurred_at TIMESTAMPTZ NOT NULL,
 recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(), evidence_hash CHAR(64) NOT NULL,
 previous_hash CHAR(64), event_hash CHAR(64) NOT NULL UNIQUE,
 FOREIGN KEY (ai_id, organization_id) REFERENCES ai_systems(id, organization_id)
);
CREATE INDEX ai_events_timeline_idx ON ai_events(organization_id, ai_id, occurred_at, id);
CREATE OR REPLACE FUNCTION reject_ai_event_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'ai_events is append-only'; END $$;
CREATE TRIGGER ai_events_immutable BEFORE UPDATE OR DELETE ON ai_events FOR EACH ROW EXECUTE FUNCTION reject_ai_event_mutation();
