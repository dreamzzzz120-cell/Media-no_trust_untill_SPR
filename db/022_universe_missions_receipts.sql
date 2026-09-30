-- Missions bind purpose and temporary authority. Receipts make consequential observed actions durably addressable.
CREATE TABLE universe_missions (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 name TEXT NOT NULL, purpose TEXT NOT NULL,
 authority_root_id UUID NOT NULL, maximum_license_class SMALLINT NOT NULL CHECK(maximum_license_class BETWEEN 0 AND 7),
 scope JSONB NOT NULL DEFAULT '{}'::jsonb, starts_at TIMESTAMPTZ NOT NULL, expires_at TIMESTAMPTZ NOT NULL,
 ended_at TIMESTAMPTZ, evidence_state TEXT NOT NULL CHECK(evidence_state IN ('OBSERVED','VERIFIED','DECLARED','UNKNOWN','STALE','CONFLICTING','UNAVAILABLE')),
 evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id), FOREIGN KEY(authority_root_id,organization_id) REFERENCES universe_authority_roots(id,organization_id) ON DELETE RESTRICT,
 CHECK(expires_at>starts_at), CHECK(ended_at IS NULL OR ended_at>=starts_at)
);
CREATE TABLE universe_mission_members (
 mission_id UUID NOT NULL, organization_id TEXT NOT NULL, entity_id UUID NOT NULL, role TEXT NOT NULL,
 evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL, observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(mission_id,entity_id), FOREIGN KEY(mission_id,organization_id) REFERENCES universe_missions(id,organization_id) ON DELETE CASCADE,
 FOREIGN KEY(entity_id,organization_id) REFERENCES constellation_entities(id,organization_id) ON DELETE RESTRICT
);
CREATE TABLE universe_action_receipts (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 mission_id UUID, actor_entity_id UUID NOT NULL, target_entity_id UUID,
 action_type TEXT NOT NULL, outcome TEXT NOT NULL CHECK(outcome IN ('OBSERVED_SUCCEEDED','OBSERVED_FAILED','BLOCKED','UNKNOWN')),
 authority_state TEXT NOT NULL CHECK(authority_state IN ('ESTABLISHED','NOT_ESTABLISHED','UNKNOWN')),
 evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 occurred_at TIMESTAMPTZ NOT NULL, observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(), metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(id,organization_id),
 FOREIGN KEY(mission_id,organization_id) REFERENCES universe_missions(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(actor_entity_id,organization_id) REFERENCES constellation_entities(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(target_entity_id,organization_id) REFERENCES constellation_entities(id,organization_id) ON DELETE RESTRICT,
 CHECK(observed_at>=occurred_at)
);
CREATE INDEX universe_receipts_actor_time_idx ON universe_action_receipts(organization_id,actor_entity_id,occurred_at DESC);
CREATE OR REPLACE FUNCTION reject_universe_mission_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'universe mission evidence is append-only'; END $$;
CREATE TRIGGER universe_mission_members_immutable BEFORE UPDATE OR DELETE ON universe_mission_members FOR EACH ROW EXECUTE FUNCTION reject_universe_mission_history_mutation();
CREATE TRIGGER universe_action_receipts_immutable BEFORE UPDATE OR DELETE ON universe_action_receipts FOR EACH ROW EXECUTE FUNCTION reject_universe_mission_history_mutation();
