CREATE TABLE ai_identities (
 id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 name TEXT NOT NULL, purpose TEXT NOT NULL, owner TEXT, provider TEXT, model TEXT,
 tools_authorized JSONB NOT NULL DEFAULT '[]'::jsonb, connected_databases JSONB NOT NULL DEFAULT '[]'::jsonb,
 evidence_coverage_state TEXT NOT NULL DEFAULT 'UNKNOWN', compliance_state TEXT NOT NULL DEFAULT 'HOLD',
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(id, organization_id)
);
CREATE INDEX ai_identities_tenant_idx ON ai_identities(organization_id, created_at DESC);
CREATE TABLE flight_records (
 id TEXT PRIMARY KEY, sequence BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE, organization_id TEXT NOT NULL, ai_identity_id TEXT NOT NULL,
 event_type TEXT NOT NULL CHECK (event_type IN ('OUTPUT','TOOL_REQUEST','TOOL_RESULT','ACTION_REQUESTED','ACTION_CONFIRMED','ACTION_FAILED','APPROVAL_REQUESTED','APPROVAL_GRANTED','APPROVAL_DENIED','CONFIG_CHANGED')),
 source_type TEXT NOT NULL CHECK (source_type IN ('DECLARATION','DIRECT_OBSERVATION','AUTHORITATIVE_SYSTEM','SIGNED_ATTESTATION')),
 source TEXT NOT NULL, summary TEXT NOT NULL, occurred_at TIMESTAMPTZ NOT NULL,
 session_id TEXT, trigger_source TEXT, inputs_hash CHAR(64), data_accessed_logs JSONB NOT NULL DEFAULT '[]'::jsonb,
 tools_invoked JSONB NOT NULL DEFAULT '[]'::jsonb, claimed_action TEXT, confirmed_action TEXT,
 human_override_observed BOOLEAN,
 state_evaluation TEXT NOT NULL DEFAULT 'DECLARED' CHECK (state_evaluation IN ('OBSERVED','VERIFIED','DECLARED','UNKNOWN','STALE','CONFLICTING','UNAVAILABLE')),
 recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(), evidence_hash CHAR(64) NOT NULL,
 previous_hash CHAR(64), event_hash CHAR(64) NOT NULL UNIQUE, UNIQUE(id, organization_id),
 FOREIGN KEY (ai_identity_id, organization_id) REFERENCES ai_identities(id, organization_id)
);
CREATE INDEX flight_records_timeline_idx ON flight_records(organization_id, ai_identity_id, occurred_at, id);
CREATE OR REPLACE FUNCTION reject_ai_event_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'flight_records is append-only'; END $$;
CREATE TRIGGER flight_records_immutable BEFORE UPDATE OR DELETE ON flight_records FOR EACH ROW EXECUTE FUNCTION reject_ai_event_mutation();

CREATE TABLE evidence_ledger (
 id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, flight_record_id TEXT NOT NULL,
 source_type TEXT NOT NULL, cryptographic_hash CHAR(64) NOT NULL,
 raw_payload_snapshot JSONB, merkle_root_reference CHAR(64), captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 FOREIGN KEY (flight_record_id, organization_id) REFERENCES flight_records(id, organization_id)
);
CREATE INDEX evidence_ledger_record_idx ON evidence_ledger(organization_id, flight_record_id, captured_at);
CREATE TRIGGER evidence_ledger_immutable BEFORE UPDATE OR DELETE ON evidence_ledger FOR EACH ROW EXECUTE FUNCTION reject_ai_event_mutation();
