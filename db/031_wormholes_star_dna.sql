-- Wormholes exchange bounded proof packages, never private universe graphs.
CREATE TABLE universe_wormhole_proofs (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 issuer_entity_id UUID NOT NULL, subject_entity_id UUID NOT NULL,
 scope JSONB NOT NULL, authority_statement JSONB NOT NULL, freshness_at TIMESTAMPTZ NOT NULL,
 evidence_digest CHAR(64) NOT NULL CHECK(evidence_digest ~ '^[0-9a-f]{64}$'),
 signature TEXT, expires_at TIMESTAMPTZ NOT NULL,
 verification_state TEXT NOT NULL CHECK(verification_state IN ('SUPPORTED','UNSUPPORTED','UNKNOWN')),
 verification_evidence_hash CHAR(64) CHECK(verification_evidence_hash IS NULL OR verification_evidence_hash ~ '^[0-9a-f]{64}$'),
 known_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(id,organization_id),
 FOREIGN KEY(issuer_entity_id,organization_id) REFERENCES constellation_entities(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(subject_entity_id,organization_id) REFERENCES constellation_entities(id,organization_id) ON DELETE RESTRICT,
 CHECK(expires_at>freshness_at),
 CHECK(verification_state='UNKNOWN' OR verification_evidence_hash IS NOT NULL),
 CHECK(signature IS NOT NULL OR verification_state='UNKNOWN')
);
CREATE TABLE universe_provenance_edges (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 parent_entity_id UUID NOT NULL, child_entity_id UUID NOT NULL,
 edge_type TEXT NOT NULL CHECK(edge_type IN ('CREATED','DELEGATED','INVOKED','USED_TOOL','ACCESSED_RESOURCE','DERIVED_FROM','OTHER')),
 evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 occurred_at TIMESTAMPTZ NOT NULL, observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(id,organization_id),
 FOREIGN KEY(parent_entity_id,organization_id) REFERENCES constellation_entities(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(child_entity_id,organization_id) REFERENCES constellation_entities(id,organization_id) ON DELETE RESTRICT,
 CHECK(parent_entity_id<>child_entity_id), CHECK(observed_at>=occurred_at)
);
CREATE INDEX universe_provenance_child_idx ON universe_provenance_edges(organization_id,child_entity_id,occurred_at DESC);

CREATE OR REPLACE FUNCTION reject_provenance_cycle() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS (
  WITH RECURSIVE ancestry(id) AS (
   SELECT NEW.child_entity_id
   UNION
   SELECT e.child_entity_id FROM universe_provenance_edges e JOIN ancestry a ON e.parent_entity_id=a.id
   WHERE e.organization_id=NEW.organization_id
  ) SELECT 1 FROM ancestry WHERE id=NEW.parent_entity_id
 ) THEN RAISE EXCEPTION 'provenance cycle rejected'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER universe_provenance_no_cycles BEFORE INSERT ON universe_provenance_edges FOR EACH ROW EXECUTE FUNCTION reject_provenance_cycle();
