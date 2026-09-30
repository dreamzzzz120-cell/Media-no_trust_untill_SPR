-- Approval gates: consequential actions can require evidenced human/authority approval.
CREATE TABLE universe_approval_requirements (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 action_type TEXT NOT NULL, minimum_license_class SMALLINT CHECK(minimum_license_class BETWEEN 0 AND 7),
 endorsement TEXT, resource_type TEXT, threshold JSONB NOT NULL DEFAULT '{}'::jsonb,
 approver_kind TEXT NOT NULL CHECK(approver_kind IN ('HUMAN','AUTHORITY_ROOT','POLICY','MULTI_PARTY')),
 evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id)
);
CREATE TABLE universe_approvals (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL, requirement_id UUID NOT NULL,
 mission_id UUID NOT NULL, actor_entity_id UUID NOT NULL, approver_entity_id UUID,
 decision TEXT NOT NULL CHECK(decision IN ('APPROVED','DENIED','UNKNOWN')),
 scope JSONB NOT NULL DEFAULT '{}'::jsonb, valid_until TIMESTAMPTZ,
 evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 decided_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id),
 FOREIGN KEY(requirement_id,organization_id) REFERENCES universe_approval_requirements(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(mission_id,organization_id) REFERENCES universe_missions(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(actor_entity_id,organization_id) REFERENCES constellation_entities(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(approver_entity_id,organization_id) REFERENCES constellation_entities(id,organization_id) ON DELETE RESTRICT,
 CHECK(decision<>'APPROVED' OR approver_entity_id IS NOT NULL)
);
CREATE OR REPLACE FUNCTION reject_approval_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'approval evidence is append-only'; END $$;
CREATE TRIGGER universe_approvals_immutable BEFORE UPDATE OR DELETE ON universe_approvals FOR EACH ROW EXECUTE FUNCTION reject_approval_history_mutation();
