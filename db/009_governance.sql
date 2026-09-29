-- Versioned boundary and policy engine: deterministic inputs, evidence, decisions and immutable history.
CREATE TABLE governance_policies(
 id UUID NOT NULL,organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,version INTEGER NOT NULL CHECK(version>0),
 name TEXT NOT NULL,kind TEXT NOT NULL CHECK(kind IN('BOUNDARY','POLICY')),status TEXT NOT NULL CHECK(status IN('DRAFT','ACTIVE','RETIRED')),
 conditions JSONB NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),PRIMARY KEY(id,version),UNIQUE(id,version,organization_id)
);
CREATE INDEX governance_policies_tenant_idx ON governance_policies(organization_id,status,kind,id,version DESC);
CREATE TABLE governance_evaluations(
 id UUID PRIMARY KEY,organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,policy_id UUID NOT NULL,policy_version INTEGER NOT NULL,
 subject_type TEXT NOT NULL,subject_id TEXT NOT NULL,result TEXT NOT NULL CHECK(result IN('ALLOW','REVIEW','BLOCK','UNKNOWN')),
 enforcement_mode TEXT NOT NULL CHECK(enforcement_mode IN('OBSERVE','ENFORCE')),enforcement_outcome TEXT NOT NULL CHECK(enforcement_outcome IN('NOT_ATTEMPTED','OBSERVED_VIOLATION','PREVENTED','ALLOWED','UNKNOWN')),
 inputs JSONB NOT NULL,evidence_hashes JSONB NOT NULL,evidence_state TEXT NOT NULL CHECK(evidence_state IN('SUPPORTED','PARTIAL','UNKNOWN','CONFLICTING','UNSUPPORTED')),
 explanation TEXT NOT NULL,evaluated_at TIMESTAMPTZ NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 FOREIGN KEY(policy_id,policy_version,organization_id) REFERENCES governance_policies(id,version,organization_id)
);
CREATE INDEX governance_eval_tenant_subject_idx ON governance_evaluations(organization_id,subject_type,subject_id,evaluated_at DESC,id);
CREATE TRIGGER governance_policies_immutable BEFORE UPDATE OR DELETE ON governance_policies FOR EACH ROW EXECUTE FUNCTION reject_ai_event_mutation();
CREATE TRIGGER governance_evaluations_immutable BEFORE UPDATE OR DELETE ON governance_evaluations FOR EACH ROW EXECUTE FUNCTION reject_ai_event_mutation();