CREATE TABLE IF NOT EXISTS enforcement_attempts(
 id UUID PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 policy_evaluation_id UUID NOT NULL,
 subject_type TEXT NOT NULL,
 subject_id TEXT NOT NULL,
 action_type TEXT NOT NULL,
 target_reference TEXT,
 enforcement_point TEXT NOT NULL,
 decision TEXT NOT NULL CHECK(decision IN('ALLOW','BLOCK')),
 outcome TEXT NOT NULL CHECK(outcome IN('ALLOWED','BLOCKED','FAILED','UNAVAILABLE','UNKNOWN')),
 prevention_state TEXT NOT NULL CHECK(prevention_state IN('PREVENTED','NOT_PREVENTED','UNKNOWN','UNAVAILABLE')),
 attempted_at TIMESTAMPTZ NOT NULL,
 completed_at TIMESTAMPTZ,
 evidence_id UUID,
 evidence_hash CHAR(64),
 receipt_digest CHAR(64) NOT NULL CHECK(receipt_digest ~ '^[a-f0-9]{64}$'),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 FOREIGN KEY(evidence_id,organization_id) REFERENCES canonical_evidence(id,organization_id),
 CHECK(prevention_state <> 'PREVENTED' OR (decision='BLOCK' AND outcome='BLOCKED' AND completed_at IS NOT NULL AND evidence_id IS NOT NULL AND evidence_hash IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS enforcement_attempts_org_subject_idx ON enforcement_attempts(organization_id,subject_type,subject_id,attempted_at DESC);
CREATE INDEX IF NOT EXISTS enforcement_attempts_policy_idx ON enforcement_attempts(organization_id,policy_evaluation_id);
CREATE OR REPLACE FUNCTION reject_enforcement_mutation() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'enforcement_attempts are immutable';END$$;
DROP TRIGGER IF EXISTS enforcement_attempts_immutable ON enforcement_attempts;
CREATE TRIGGER enforcement_attempts_immutable BEFORE UPDATE OR DELETE ON enforcement_attempts FOR EACH ROW EXECUTE FUNCTION reject_enforcement_mutation();
