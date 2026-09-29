-- Delegation chains for autonomous workflows. Grants are immutable evidence; revocation is a separate lifecycle event.
CREATE TABLE universe_delegations (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 parent_entity_id UUID NOT NULL, child_entity_id UUID NOT NULL,
 parent_license_id UUID NOT NULL, child_license_id UUID NOT NULL, mission_id UUID NOT NULL,
 delegated_class SMALLINT NOT NULL CHECK(delegated_class BETWEEN 0 AND 7),
 endorsements JSONB NOT NULL DEFAULT '[]'::jsonb, scope JSONB NOT NULL DEFAULT '{}'::jsonb,
 depth SMALLINT NOT NULL CHECK(depth BETWEEN 1 AND 32),
 expires_at TIMESTAMPTZ NOT NULL,
 evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 occurred_at TIMESTAMPTZ NOT NULL, observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(id,organization_id),
 FOREIGN KEY(parent_entity_id,organization_id) REFERENCES constellation_entities(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(child_entity_id,organization_id) REFERENCES constellation_entities(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(parent_license_id,organization_id) REFERENCES universe_licenses(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(child_license_id,organization_id) REFERENCES universe_licenses(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(mission_id,organization_id) REFERENCES universe_missions(id,organization_id) ON DELETE RESTRICT,
 CHECK(parent_entity_id<>child_entity_id), CHECK(observed_at>=occurred_at), CHECK(expires_at>occurred_at)
);
CREATE TABLE universe_handoff_receipts (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL, delegation_id UUID NOT NULL,
 from_entity_id UUID NOT NULL, to_entity_id UUID NOT NULL, mission_id UUID NOT NULL,
 handoff_type TEXT NOT NULL CHECK(handoff_type IN ('TASK','TOOL','RESOURCE','DECISION','RESULT','AUTHORITY_CONTEXT')),
 payload_digest CHAR(64) NOT NULL CHECK(payload_digest ~ '^[0-9a-f]{64}$'),
 outcome TEXT NOT NULL CHECK(outcome IN ('OBSERVED_ACCEPTED','OBSERVED_REJECTED','UNKNOWN')),
 evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 occurred_at TIMESTAMPTZ NOT NULL, observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(id,organization_id),
 FOREIGN KEY(delegation_id,organization_id) REFERENCES universe_delegations(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(from_entity_id,organization_id) REFERENCES constellation_entities(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(to_entity_id,organization_id) REFERENCES constellation_entities(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(mission_id,organization_id) REFERENCES universe_missions(id,organization_id) ON DELETE RESTRICT,
 CHECK(from_entity_id<>to_entity_id), CHECK(observed_at>=occurred_at)
);
CREATE INDEX universe_delegation_child_idx ON universe_delegations(organization_id,child_entity_id,occurred_at DESC);
CREATE OR REPLACE FUNCTION reject_delegation_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'delegation evidence is append-only'; END $$;
CREATE TRIGGER universe_delegations_immutable BEFORE UPDATE OR DELETE ON universe_delegations FOR EACH ROW EXECUTE FUNCTION reject_delegation_history_mutation();
CREATE TRIGGER universe_handoff_receipts_immutable BEFORE UPDATE OR DELETE ON universe_handoff_receipts FOR EACH ROW EXECUTE FUNCTION reject_delegation_history_mutation();
