-- First-class Universe resources ("Planets"). A resource is visible only when backed by evidence.
CREATE TABLE universe_resources (
 id UUID PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 constellation_entity_id UUID NOT NULL,
 resource_type TEXT NOT NULL CHECK(resource_type IN ('DATABASE','FILE_STORE','SOURCE_REPOSITORY','CLOUD_INFRASTRUCTURE','FINANCIAL_ACCOUNT','CUSTOMER_DATA','EMAIL','CALENDAR','PRODUCTION_SYSTEM','API','SECRET_STORE','MEDIA_LIBRARY','DEVICE','EXTERNAL_SERVICE','OTHER')),
 name TEXT NOT NULL,
 evidence_state TEXT NOT NULL CHECK(evidence_state IN ('OBSERVED','VERIFIED','DECLARED','UNKNOWN','STALE','CONFLICTING','UNAVAILABLE')),
 evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'),
 source TEXT NOT NULL,
 first_observed_at TIMESTAMPTZ NOT NULL,
 last_observed_at TIMESTAMPTZ NOT NULL,
 known_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id),
 UNIQUE(constellation_entity_id,organization_id),
 FOREIGN KEY(constellation_entity_id,organization_id) REFERENCES constellation_entities(id,organization_id) ON DELETE RESTRICT,
 CHECK(last_observed_at>=first_observed_at)
);
CREATE INDEX universe_resources_org_time_idx ON universe_resources(organization_id,last_observed_at DESC,id);
CREATE OR REPLACE FUNCTION reject_universe_resource_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'universe resource evidence is append-only'; END $$;
CREATE TRIGGER universe_resources_immutable BEFORE UPDATE OR DELETE ON universe_resources FOR EACH ROW EXECUTE FUNCTION reject_universe_resource_mutation();
