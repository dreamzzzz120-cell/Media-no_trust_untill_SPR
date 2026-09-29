-- AI inventory, observed discovery and behavior-change signals.
ALTER TABLE ai_identities ADD COLUMN IF NOT EXISTS version_observed TEXT;
ALTER TABLE ai_identities ADD COLUMN IF NOT EXISTS application TEXT;
ALTER TABLE ai_identities ADD COLUMN IF NOT EXISTS workflow TEXT;
ALTER TABLE ai_identities ADD COLUMN IF NOT EXISTS environment TEXT;
ALTER TABLE ai_identities ADD COLUMN IF NOT EXISTS permissions_observed JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE ai_identities ADD COLUMN IF NOT EXISTS registration_state TEXT NOT NULL DEFAULT 'REGISTERED' CHECK(registration_state IN('REGISTERED','OBSERVED_UNREGISTERED'));
CREATE TABLE ai_discovery_observations(
 id UUID PRIMARY KEY,organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,ai_identity_id UUID,
 provider_observed TEXT,model_observed TEXT,application_observed TEXT,workflow_observed TEXT,environment_observed TEXT,
 registration_state TEXT NOT NULL CHECK(registration_state IN('REGISTERED','OBSERVED_UNREGISTERED','UNKNOWN')),
 collector TEXT NOT NULL,evidence_hash CHAR(64) NOT NULL,observed_at TIMESTAMPTZ NOT NULL,
 coverage_state TEXT NOT NULL CHECK(coverage_state IN('SUPPORTED','PARTIAL','UNKNOWN','UNAVAILABLE')),
 coverage_note TEXT NOT NULL,metadata JSONB NOT NULL DEFAULT '{}'::jsonb,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 FOREIGN KEY(ai_identity_id,organization_id) REFERENCES ai_identities(id,organization_id)
);
CREATE INDEX ai_discovery_tenant_time_idx ON ai_discovery_observations(organization_id,observed_at DESC,id);
CREATE TABLE ai_behavior_signals(
 id UUID PRIMARY KEY,organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,ai_identity_id UUID NOT NULL,
 signal_type TEXT NOT NULL CHECK(signal_type IN('NEW_TOOL','NEW_DESTINATION','REPEATED_FAILURE','RETRY_PATTERN_CHANGE','COST_PATTERN_CHANGE','INTERVENTION_RATE_CHANGE','PERMISSION_CHANGE','NEW_RELATIONSHIP','MODEL_CHANGE')),
 observation TEXT NOT NULL,interpretation TEXT,risk_evaluation TEXT,
 evidence_state TEXT NOT NULL CHECK(evidence_state IN('SUPPORTED','PARTIAL','UNKNOWN','CONFLICTING','UNSUPPORTED')),
 evidence_hash CHAR(64) NOT NULL,source TEXT NOT NULL,observed_at TIMESTAMPTZ NOT NULL,baseline_from TIMESTAMPTZ,baseline_to TIMESTAMPTZ,
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 FOREIGN KEY(ai_identity_id,organization_id) REFERENCES ai_identities(id,organization_id)
);
CREATE INDEX ai_behavior_tenant_time_idx ON ai_behavior_signals(organization_id,ai_identity_id,observed_at DESC,id);
CREATE TRIGGER ai_discovery_immutable BEFORE UPDATE OR DELETE ON ai_discovery_observations FOR EACH ROW EXECUTE FUNCTION reject_ai_event_mutation();
CREATE TRIGGER ai_behavior_immutable BEFORE UPDATE OR DELETE ON ai_behavior_signals FOR EACH ROW EXECUTE FUNCTION reject_ai_event_mutation();