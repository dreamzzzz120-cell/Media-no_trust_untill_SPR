CREATE TABLE accountability_decisions (
 id UUID PRIMARY KEY,
 organization_id TEXT NOT NULL,
 ai_identity_id UUID NOT NULL,
 action_event_id UUID,
 decision TEXT NOT NULL CHECK (decision IN ('ALLOW','FLAG','REQUIRE_HUMAN','BLOCK')),
 decision_mode TEXT NOT NULL CHECK (decision_mode IN ('POLICY','BOUNDARY','RISK_SIGNAL','HUMAN','COMBINED')),
 reason TEXT NOT NULL,
 policy_id TEXT,
 policy_version TEXT,
 boundary_id TEXT,
 boundary_version TEXT,
 evidence_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
 risk_signals JSONB NOT NULL DEFAULT '[]'::jsonb,
 human_state TEXT NOT NULL DEFAULT 'NOT_REQUIRED' CHECK (human_state IN ('NOT_REQUIRED','PENDING','APPROVED','DENIED')),
 human_actor TEXT,
 decided_at TIMESTAMPTZ NOT NULL,
 outcome_event_id UUID,
 outcome_state TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK (outcome_state IN ('UNKNOWN','VERIFIED','FAILED','UNAVAILABLE','CONFLICTING')),
 previous_hash CHAR(64),
 decision_hash CHAR(64) NOT NULL UNIQUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id, organization_id),
 FOREIGN KEY (ai_identity_id, organization_id) REFERENCES ai_identities(id, organization_id),
 FOREIGN KEY (action_event_id, organization_id) REFERENCES flight_records(id, organization_id),
 FOREIGN KEY (outcome_event_id, organization_id) REFERENCES flight_records(id, organization_id)
);
CREATE INDEX accountability_decisions_timeline_idx ON accountability_decisions(organization_id, ai_identity_id, decided_at, id);
CREATE OR REPLACE FUNCTION reject_accountability_decision_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'accountability_decisions is append-only'; END $$;
CREATE TRIGGER accountability_decisions_immutable BEFORE UPDATE OR DELETE ON accountability_decisions FOR EACH ROW EXECUTE FUNCTION reject_accountability_decision_mutation();
