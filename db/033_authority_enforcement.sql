-- Authority decisions bind actor, licence, mission, resource and law evidence before authorization can be established.
CREATE TABLE universe_authority_evaluations (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 actor_entity_id UUID NOT NULL, license_id UUID, mission_id UUID, target_resource_id UUID,
 action_type TEXT NOT NULL,
 decision TEXT NOT NULL CHECK(decision IN ('AUTHORIZED','NOT_AUTHORIZED','UNKNOWN')),
 decision_basis JSONB NOT NULL DEFAULT '[]'::jsonb,
 license_evidence_hash CHAR(64), mission_evidence_hash CHAR(64), resource_evidence_hash CHAR(64), law_evidence_hash CHAR(64),
 evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 evaluated_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id),
 FOREIGN KEY(actor_entity_id,organization_id) REFERENCES constellation_entities(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(license_id,organization_id) REFERENCES universe_licenses(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(mission_id,organization_id) REFERENCES universe_missions(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(target_resource_id,organization_id) REFERENCES universe_resources(id,organization_id) ON DELETE RESTRICT,
 CHECK(license_evidence_hash IS NULL OR license_evidence_hash ~ '^[0-9a-f]{64}$'),
 CHECK(mission_evidence_hash IS NULL OR mission_evidence_hash ~ '^[0-9a-f]{64}$'),
 CHECK(resource_evidence_hash IS NULL OR resource_evidence_hash ~ '^[0-9a-f]{64}$'),
 CHECK(law_evidence_hash IS NULL OR law_evidence_hash ~ '^[0-9a-f]{64}$'),
 CHECK(decision<>'AUTHORIZED' OR (license_id IS NOT NULL AND mission_id IS NOT NULL AND license_evidence_hash IS NOT NULL AND mission_evidence_hash IS NOT NULL)),
 CHECK(decision<>'NOT_AUTHORIZED' OR jsonb_array_length(decision_basis)>0)
);
CREATE TABLE universe_action_attempts (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 authority_evaluation_id UUID NOT NULL, actor_entity_id UUID NOT NULL, target_entity_id UUID,
 action_type TEXT NOT NULL, enforcement_outcome TEXT NOT NULL CHECK(enforcement_outcome IN ('ALLOWED','BLOCKED','NOT_ATTEMPTED','UNKNOWN')),
 receipt_id UUID, evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 occurred_at TIMESTAMPTZ NOT NULL, observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(id,organization_id),
 FOREIGN KEY(authority_evaluation_id,organization_id) REFERENCES universe_authority_evaluations(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(actor_entity_id,organization_id) REFERENCES constellation_entities(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(target_entity_id,organization_id) REFERENCES constellation_entities(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(receipt_id,organization_id) REFERENCES universe_action_receipts(id,organization_id) ON DELETE RESTRICT,
 CHECK(observed_at>=occurred_at),
 CHECK(enforcement_outcome NOT IN ('ALLOWED','BLOCKED') OR receipt_id IS NOT NULL)
);
CREATE INDEX universe_authority_eval_actor_idx ON universe_authority_evaluations(organization_id,actor_entity_id,evaluated_at DESC);
CREATE OR REPLACE FUNCTION reject_authority_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'authority decision evidence is append-only'; END $$;
CREATE TRIGGER universe_authority_evaluations_immutable BEFORE UPDATE OR DELETE ON universe_authority_evaluations FOR EACH ROW EXECUTE FUNCTION reject_authority_history_mutation();
CREATE TRIGGER universe_action_attempts_immutable BEFORE UPDATE OR DELETE ON universe_action_attempts FOR EACH ROW EXECUTE FUNCTION reject_authority_history_mutation();
