-- Universal Law: versioned rules and evidence evaluations for the observable AI universe.
CREATE TABLE universe_laws (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 law_key TEXT NOT NULL, version TEXT NOT NULL, title TEXT NOT NULL, issuer TEXT NOT NULL,
 law_kind TEXT NOT NULL CHECK(law_kind IN ('ORGANIZATION_POLICY','CUSTOMER_CONTRACT','SECURITY_POLICY','REGULATORY_MAPPING','OTHER')),
 effective_at TIMESTAMPTZ NOT NULL, expires_at TIMESTAMPTZ,
 rule JSONB NOT NULL, evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id), UNIQUE(organization_id,law_key,version), CHECK(expires_at IS NULL OR expires_at>effective_at)
);
CREATE TABLE universe_law_evaluations (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 law_id UUID NOT NULL, subject_entity_id UUID,
 result TEXT NOT NULL CHECK(result IN ('SUPPORTED','PARTIAL','UNSUPPORTED','UNKNOWN','CONFLICTING')),
 explanation TEXT NOT NULL, evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 evaluated_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(), metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(id,organization_id),
 FOREIGN KEY(law_id,organization_id) REFERENCES universe_laws(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(subject_entity_id,organization_id) REFERENCES constellation_entities(id,organization_id) ON DELETE RESTRICT
);
CREATE INDEX universe_law_eval_subject_idx ON universe_law_evaluations(organization_id,subject_entity_id,evaluated_at DESC);
CREATE OR REPLACE FUNCTION reject_universe_law_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'universe law evidence is append-only'; END $$;
CREATE TRIGGER universe_laws_immutable BEFORE UPDATE OR DELETE ON universe_laws FOR EACH ROW EXECUTE FUNCTION reject_universe_law_mutation();
CREATE TRIGGER universe_law_evaluations_immutable BEFORE UPDATE OR DELETE ON universe_law_evaluations FOR EACH ROW EXECUTE FUNCTION reject_universe_law_mutation();
