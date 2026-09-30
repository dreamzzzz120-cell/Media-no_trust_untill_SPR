-- Constellation: tenant-scoped, evidence-backed topology and point-in-time reconstruction.
CREATE TABLE constellation_entities (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 entity_type TEXT NOT NULL CHECK(entity_type IN ('AI_AGENT','MODEL','HUMAN','TOOL','API','DATABASE','OBSERVER','POLICY','SYSTEM','WORKLOAD','CREDENTIAL','ARTIFACT','UNKNOWN')),
 name TEXT NOT NULL, evidence_state TEXT NOT NULL CHECK(evidence_state IN ('OBSERVED','VERIFIED','DECLARED','UNKNOWN','STALE','CONFLICTING','UNAVAILABLE')),
 evidence_hash CHAR(64) NOT NULL, source TEXT NOT NULL, first_observed_at TIMESTAMPTZ NOT NULL, last_observed_at TIMESTAMPTZ NOT NULL,
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(id,organization_id)
);
CREATE INDEX constellation_entities_tenant_time_idx ON constellation_entities(organization_id,last_observed_at DESC,id);
CREATE TABLE constellation_relationships (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 from_entity_id UUID NOT NULL, to_entity_id UUID NOT NULL,
 relationship_type TEXT NOT NULL CHECK(relationship_type IN ('ORBIT','CLUSTER','WORMHOLE','DEPENDENCY','INTERACTION','PROVENANCE','OBSERVATION','POLICY_APPLIES','TRANSIENT')),
 evidence_state TEXT NOT NULL CHECK(evidence_state IN ('OBSERVED','VERIFIED','DECLARED','UNKNOWN','STALE','CONFLICTING','UNAVAILABLE')),
 evidence_hash CHAR(64) NOT NULL, source TEXT NOT NULL, observed_at TIMESTAMPTZ NOT NULL, ended_at TIMESTAMPTZ,
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(id,organization_id),
 FOREIGN KEY(from_entity_id,organization_id) REFERENCES constellation_entities(id,organization_id),
 FOREIGN KEY(to_entity_id,organization_id) REFERENCES constellation_entities(id,organization_id), CHECK(from_entity_id<>to_entity_id)
);
CREATE INDEX constellation_relationships_tenant_time_idx ON constellation_relationships(organization_id,observed_at DESC,id);
CREATE TABLE constellation_events (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 event_type TEXT NOT NULL CHECK(event_type IN ('SUPERNOVA','BLACK_HOLE','NEBULA','CHANGE','BOUNDARY','VISIBILITY_LOSS')),
 entity_id UUID, relationship_id UUID, evidence_state TEXT NOT NULL CHECK(evidence_state IN ('OBSERVED','VERIFIED','DECLARED','UNKNOWN','STALE','CONFLICTING','UNAVAILABLE')),
 summary TEXT NOT NULL, evidence_hash CHAR(64) NOT NULL, source TEXT NOT NULL, occurred_at TIMESTAMPTZ NOT NULL,
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(id,organization_id),
 FOREIGN KEY(entity_id,organization_id) REFERENCES constellation_entities(id,organization_id),
 FOREIGN KEY(relationship_id,organization_id) REFERENCES constellation_relationships(id,organization_id), CHECK(entity_id IS NOT NULL OR relationship_id IS NOT NULL)
);
CREATE INDEX constellation_events_tenant_time_idx ON constellation_events(organization_id,occurred_at DESC,id);
CREATE OR REPLACE FUNCTION reject_constellation_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'constellation evidence is append-only'; END $$;
CREATE TRIGGER constellation_relationships_immutable BEFORE UPDATE OR DELETE ON constellation_relationships FOR EACH ROW EXECUTE FUNCTION reject_constellation_mutation();
CREATE TRIGGER constellation_events_immutable BEFORE UPDATE OR DELETE ON constellation_events FOR EACH ROW EXECUTE FUNCTION reject_constellation_mutation();