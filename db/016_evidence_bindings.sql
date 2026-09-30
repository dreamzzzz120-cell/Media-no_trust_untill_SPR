-- Cross-domain evidence bindings prevent evidence islands while preserving original subsystem records.
CREATE TABLE evidence_bindings(
 organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,evidence_id UUID NOT NULL,
 domain TEXT NOT NULL CHECK(domain IN('AI_FLIGHT','AI_ACCOUNTABILITY','AI_INVENTORY','AI_BEHAVIOR','GOVERNANCE','MEDIA','CONSTELLATION','INCIDENT','COMPLIANCE','BILLING')),
 domain_record_id TEXT NOT NULL,binding_type TEXT NOT NULL CHECK(binding_type IN('SUPPORTS','OBSERVES','DERIVED_FROM','EVALUATES')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),PRIMARY KEY(organization_id,evidence_id,domain,domain_record_id,binding_type),
 FOREIGN KEY(evidence_id,organization_id) REFERENCES canonical_evidence(id,organization_id)
);
CREATE INDEX evidence_binding_record_idx ON evidence_bindings(organization_id,domain,domain_record_id);
CREATE TRIGGER evidence_bindings_immutable BEFORE UPDATE OR DELETE ON evidence_bindings FOR EACH ROW EXECUTE FUNCTION reject_ai_event_mutation();