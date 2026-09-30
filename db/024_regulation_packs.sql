-- Regulation Packs map specific, versioned regulatory requirements to evidence without claiming legal certification.
CREATE TABLE regulation_packs (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 jurisdiction TEXT NOT NULL, regulation_key TEXT NOT NULL, title TEXT NOT NULL, version TEXT NOT NULL,
 source_reference TEXT NOT NULL, effective_at TIMESTAMPTZ NOT NULL, expires_at TIMESTAMPTZ,
 applicability JSONB NOT NULL DEFAULT '{}'::jsonb,
 evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), observed_at TIMESTAMPTZ NOT NULL,
 known_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id), UNIQUE(organization_id,jurisdiction,regulation_key,version),
 CHECK(expires_at IS NULL OR expires_at>effective_at)
);
CREATE TABLE regulation_requirements (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL, pack_id UUID NOT NULL,
 requirement_key TEXT NOT NULL, title TEXT NOT NULL, requirement_text TEXT NOT NULL,
 applicability_rule JSONB NOT NULL DEFAULT '{}'::jsonb, required_evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(id,organization_id), UNIQUE(pack_id,requirement_key),
 FOREIGN KEY(pack_id,organization_id) REFERENCES regulation_packs(id,organization_id) ON DELETE RESTRICT
);
CREATE TABLE regulation_control_mappings (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL, requirement_id UUID NOT NULL, law_id UUID,
 control_key TEXT NOT NULL, mapping_basis TEXT NOT NULL,
 evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id),
 FOREIGN KEY(requirement_id,organization_id) REFERENCES regulation_requirements(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(law_id,organization_id) REFERENCES universe_laws(id,organization_id) ON DELETE RESTRICT
);
CREATE TABLE regulation_evaluations (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL, requirement_id UUID NOT NULL, subject_entity_id UUID,
 result TEXT NOT NULL CHECK(result IN ('SUPPORTED','PARTIAL','UNSUPPORTED','UNKNOWN','CONFLICTING','NOT_APPLICABLE')),
 rationale TEXT NOT NULL, evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 evaluated_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(), evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(id,organization_id),
 FOREIGN KEY(requirement_id,organization_id) REFERENCES regulation_requirements(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(subject_entity_id,organization_id) REFERENCES constellation_entities(id,organization_id) ON DELETE RESTRICT
);
CREATE INDEX regulation_eval_requirement_time_idx ON regulation_evaluations(organization_id,requirement_id,evaluated_at DESC);
CREATE OR REPLACE FUNCTION reject_regulation_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'regulation evidence is append-only'; END $$;
CREATE TRIGGER regulation_packs_immutable BEFORE UPDATE OR DELETE ON regulation_packs FOR EACH ROW EXECUTE FUNCTION reject_regulation_history_mutation();
CREATE TRIGGER regulation_requirements_immutable BEFORE UPDATE OR DELETE ON regulation_requirements FOR EACH ROW EXECUTE FUNCTION reject_regulation_history_mutation();
CREATE TRIGGER regulation_control_mappings_immutable BEFORE UPDATE OR DELETE ON regulation_control_mappings FOR EACH ROW EXECUTE FUNCTION reject_regulation_history_mutation();
CREATE TRIGGER regulation_evaluations_immutable BEFORE UPDATE OR DELETE ON regulation_evaluations FOR EACH ROW EXECUTE FUNCTION reject_regulation_history_mutation();
