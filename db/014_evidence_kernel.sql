-- Canonical cross-domain evidence kernel. Append-only source/observation/evidence/finding/claim/evaluation lineage.
CREATE TABLE evidence_sources(
 id UUID PRIMARY KEY,organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,source_type TEXT NOT NULL,
 name TEXT NOT NULL,collector TEXT NOT NULL,configuration_digest CHAR(64),created_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(id,organization_id)
);
CREATE TABLE canonical_observations(
 id UUID PRIMARY KEY,organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,source_id UUID NOT NULL,
 subject_type TEXT NOT NULL,subject_id TEXT NOT NULL,observation_type TEXT NOT NULL,content JSONB NOT NULL,content_digest CHAR(64) NOT NULL,
 observed_at TIMESTAMPTZ NOT NULL,collected_at TIMESTAMPTZ NOT NULL,ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 validation_state TEXT NOT NULL CHECK(validation_state IN('VERIFIED','OBSERVED','DECLARED','UNKNOWN','STALE','CONFLICTING','UNAVAILABLE')),
 FOREIGN KEY(source_id,organization_id) REFERENCES evidence_sources(id,organization_id),UNIQUE(id,organization_id)
);
CREATE INDEX canonical_observation_tenant_subject_idx ON canonical_observations(organization_id,subject_type,subject_id,ingested_at DESC,id);
CREATE TABLE canonical_evidence(
 id UUID PRIMARY KEY,organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,observation_id UUID NOT NULL,
 evidence_type TEXT NOT NULL,content_reference TEXT,digest CHAR(64) NOT NULL,provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
 validation_state TEXT NOT NULL CHECK(validation_state IN('VERIFIED','OBSERVED','DECLARED','UNKNOWN','STALE','CONFLICTING','UNAVAILABLE')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),FOREIGN KEY(observation_id,organization_id) REFERENCES canonical_observations(id,organization_id),UNIQUE(id,organization_id)
);
CREATE TABLE canonical_findings(
 id UUID PRIMARY KEY,organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,finding_type TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN('SUPPORTED','PARTIAL','UNKNOWN','CONFLICTING','UNSUPPORTED')),summary TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(id,organization_id)
);
CREATE TABLE finding_evidence(
 organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,finding_id UUID NOT NULL,evidence_id UUID NOT NULL,
 PRIMARY KEY(organization_id,finding_id,evidence_id),FOREIGN KEY(finding_id,organization_id) REFERENCES canonical_findings(id,organization_id),
 FOREIGN KEY(evidence_id,organization_id) REFERENCES canonical_evidence(id,organization_id)
);
CREATE TABLE canonical_claims(
 id UUID PRIMARY KEY,organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,subject_type TEXT NOT NULL,subject_id TEXT NOT NULL,
 claim_type TEXT NOT NULL,claim_text TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(id,organization_id)
);
CREATE TABLE claim_evaluations(
 id UUID PRIMARY KEY,organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,claim_id UUID NOT NULL,finding_id UUID,
 state TEXT NOT NULL CHECK(state IN('SUPPORTED','PARTIAL','UNKNOWN','CONFLICTING','UNSUPPORTED')),explanation TEXT NOT NULL,
 evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now(),FOREIGN KEY(claim_id,organization_id) REFERENCES canonical_claims(id,organization_id),
 FOREIGN KEY(finding_id,organization_id) REFERENCES canonical_findings(id,organization_id)
);
CREATE INDEX claim_evaluation_tenant_idx ON claim_evaluations(organization_id,claim_id,evaluated_at DESC,id);
CREATE TRIGGER evidence_sources_immutable BEFORE UPDATE OR DELETE ON evidence_sources FOR EACH ROW EXECUTE FUNCTION reject_ai_event_mutation();
CREATE TRIGGER canonical_observations_immutable BEFORE UPDATE OR DELETE ON canonical_observations FOR EACH ROW EXECUTE FUNCTION reject_ai_event_mutation();
CREATE TRIGGER canonical_evidence_immutable BEFORE UPDATE OR DELETE ON canonical_evidence FOR EACH ROW EXECUTE FUNCTION reject_ai_event_mutation();
CREATE TRIGGER canonical_findings_immutable BEFORE UPDATE OR DELETE ON canonical_findings FOR EACH ROW EXECUTE FUNCTION reject_ai_event_mutation();
CREATE TRIGGER finding_evidence_immutable BEFORE UPDATE OR DELETE ON finding_evidence FOR EACH ROW EXECUTE FUNCTION reject_ai_event_mutation();
CREATE TRIGGER canonical_claims_immutable BEFORE UPDATE OR DELETE ON canonical_claims FOR EACH ROW EXECUTE FUNCTION reject_ai_event_mutation();
CREATE TRIGGER claim_evaluations_immutable BEFORE UPDATE OR DELETE ON claim_evaluations FOR EACH ROW EXECUTE FUNCTION reject_ai_event_mutation();