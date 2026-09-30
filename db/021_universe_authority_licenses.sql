-- Universe authority language: Sun = root authority; Orbit = bounded AI licence.
CREATE TABLE universe_authority_roots (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 constellation_entity_id UUID NOT NULL, authority_type TEXT NOT NULL CHECK(authority_type IN ('ORGANIZATION','HUMAN','IDENTITY_PROVIDER','POLICY_AUTHORITY','OTHER')),
 evidence_state TEXT NOT NULL CHECK(evidence_state IN ('OBSERVED','VERIFIED','DECLARED','UNKNOWN','STALE','CONFLICTING','UNAVAILABLE')),
 evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id), UNIQUE(constellation_entity_id,organization_id),
 FOREIGN KEY(constellation_entity_id,organization_id) REFERENCES constellation_entities(id,organization_id) ON DELETE RESTRICT
);
CREATE TABLE universe_licenses (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 subject_entity_id UUID NOT NULL, authority_root_id UUID NOT NULL,
 license_class SMALLINT NOT NULL CHECK(license_class BETWEEN 0 AND 7),
 endorsements JSONB NOT NULL DEFAULT '[]'::jsonb,
 scope JSONB NOT NULL DEFAULT '{}'::jsonb,
 valid_from TIMESTAMPTZ NOT NULL, valid_until TIMESTAMPTZ,
 evidence_state TEXT NOT NULL CHECK(evidence_state IN ('OBSERVED','VERIFIED','DECLARED','UNKNOWN','STALE','CONFLICTING','UNAVAILABLE')),
 evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id),
 FOREIGN KEY(subject_entity_id,organization_id) REFERENCES constellation_entities(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(authority_root_id,organization_id) REFERENCES universe_authority_roots(id,organization_id) ON DELETE RESTRICT,
 CHECK(valid_until IS NULL OR valid_until>valid_from)
);
CREATE INDEX universe_licenses_subject_time_idx ON universe_licenses(organization_id,subject_entity_id,valid_from DESC);
CREATE OR REPLACE FUNCTION reject_universe_authority_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'universe authority evidence is append-only'; END $$;
CREATE TRIGGER universe_authority_roots_immutable BEFORE UPDATE OR DELETE ON universe_authority_roots FOR EACH ROW EXECUTE FUNCTION reject_universe_authority_mutation();
CREATE TRIGGER universe_licenses_immutable BEFORE UPDATE OR DELETE ON universe_licenses FOR EACH ROW EXECUTE FUNCTION reject_universe_authority_mutation();
