-- Audit packages freeze a point-in-time manifest of evidence and regulation evaluations.
CREATE TABLE universe_audit_packages (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 package_type TEXT NOT NULL CHECK(package_type IN ('REGULATION','INCIDENT','AUTHORITY','MISSION','CUSTOMER','GENERAL')),
 subject_key TEXT NOT NULL, as_of TIMESTAMPTZ NOT NULL,
 manifest JSONB NOT NULL, manifest_digest CHAR(64) NOT NULL CHECK(manifest_digest ~ '^[0-9a-f]{64}$'),
 evidence_state TEXT NOT NULL CHECK(evidence_state IN ('SUPPORTED','PARTIAL','UNKNOWN','CONFLICTING','UNSUPPORTED')),
 created_by_entity_id UUID, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), known_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id),
 FOREIGN KEY(created_by_entity_id,organization_id) REFERENCES constellation_entities(id,organization_id) ON DELETE RESTRICT
);
CREATE TABLE regulation_re_evaluations (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL, old_pack_id UUID NOT NULL, new_pack_id UUID NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('PENDING','RUNNING','COMPLETED','FAILED','UNKNOWN')),
 affected_requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
 evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id),
 FOREIGN KEY(old_pack_id,organization_id) REFERENCES regulation_packs(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(new_pack_id,organization_id) REFERENCES regulation_packs(id,organization_id) ON DELETE RESTRICT,
 CHECK(old_pack_id<>new_pack_id)
);
CREATE OR REPLACE FUNCTION reject_audit_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit evidence is append-only'; END $$;
CREATE TRIGGER universe_audit_packages_immutable BEFORE UPDATE OR DELETE ON universe_audit_packages FOR EACH ROW EXECUTE FUNCTION reject_audit_history_mutation();
CREATE TRIGGER regulation_re_evaluations_immutable BEFORE UPDATE OR DELETE ON regulation_re_evaluations FOR EACH ROW EXECUTE FUNCTION reject_audit_history_mutation();
