-- Astronomical Corps: accountable human/AI operational roles. AI crew remain ordinary governed Stars.
CREATE TABLE astronomical_corps_roles (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 role_key TEXT NOT NULL, name TEXT NOT NULL,
 division TEXT NOT NULL CHECK(division IN ('ASTRONOMY','SCIENCE','SATELLITE_ENGINEERING','MISSION_OPERATIONS','MAINTENANCE','DISTRIBUTION','MARKETING','ADVERTISING','EXPLORATION','UNIVERSAL_LAW','EVIDENCE','INCIDENT_COMMAND','PROVENANCE','SECURITY','ECONOMICS','ARCHITECTURE')),
 description TEXT NOT NULL, maximum_license_class SMALLINT NOT NULL CHECK(maximum_license_class BETWEEN 0 AND 7),
 allowed_endorsements JSONB NOT NULL DEFAULT '[]'::jsonb, allowed_tools JSONB NOT NULL DEFAULT '[]'::jsonb,
 allowed_resources JSONB NOT NULL DEFAULT '[]'::jsonb, requires_human_approval JSONB NOT NULL DEFAULT '[]'::jsonb,
 evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id), UNIQUE(organization_id,role_key)
);
CREATE TABLE astronomical_corps_assignments (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL, role_id UUID NOT NULL, entity_id UUID NOT NULL,
 mission_id UUID, license_id UUID, assignment_kind TEXT NOT NULL CHECK(assignment_kind IN ('AI','HUMAN','MIXED')),
 starts_at TIMESTAMPTZ NOT NULL, expires_at TIMESTAMPTZ NOT NULL,
 evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id),
 FOREIGN KEY(role_id,organization_id) REFERENCES astronomical_corps_roles(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(entity_id,organization_id) REFERENCES constellation_entities(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(mission_id,organization_id) REFERENCES universe_missions(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(license_id,organization_id) REFERENCES universe_licenses(id,organization_id) ON DELETE RESTRICT,
 CHECK(expires_at>starts_at),
 CHECK(assignment_kind='HUMAN' OR (mission_id IS NOT NULL AND license_id IS NOT NULL))
);
CREATE INDEX astronomical_corps_assignment_entity_idx ON astronomical_corps_assignments(organization_id,entity_id,expires_at DESC);
CREATE OR REPLACE FUNCTION reject_corps_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'astronomical corps evidence is append-only'; END $$;
CREATE TRIGGER astronomical_corps_roles_immutable BEFORE UPDATE OR DELETE ON astronomical_corps_roles FOR EACH ROW EXECUTE FUNCTION reject_corps_history_mutation();
CREATE TRIGGER astronomical_corps_assignments_immutable BEFORE UPDATE OR DELETE ON astronomical_corps_assignments FOR EACH ROW EXECUTE FUNCTION reject_corps_history_mutation();
