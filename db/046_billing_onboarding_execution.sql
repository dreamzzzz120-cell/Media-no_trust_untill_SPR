-- Production billing/onboarding truth: provider state is evidence; completion is derived and audited.
ALTER TABLE onboarding_state DROP CONSTRAINT IF EXISTS onboarding_state_status_check;
ALTER TABLE onboarding_state ADD CONSTRAINT onboarding_state_status_check CHECK(status IN('NEW','CONFIGURING','PENDING_PROOF','READY','BLOCKED','FAILED'));
ALTER TABLE onboarding_state ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE onboarding_state ADD COLUMN IF NOT EXISTS completion_evidence_hash CHAR(64);
ALTER TABLE onboarding_state ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 0 CHECK(version>=0);
CREATE TABLE IF NOT EXISTS billing_accounts(
 organization_id TEXT PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,provider TEXT NOT NULL,external_customer_id TEXT,
 status TEXT NOT NULL CHECK(status IN('UNKNOWN','PENDING','ACTIVE','PAST_DUE','CANCELED','FAILED')),
 subscription_status TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK(subscription_status IN('UNKNOWN','PENDING','ACTIVE','PAST_DUE','CANCELED','FAILED')),
 last_external_event_id TEXT,last_evidence_hash CHAR(64),observed_at TIMESTAMPTZ,updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(provider,external_customer_id)
);
CREATE TABLE IF NOT EXISTS billing_webhook_receipts(
 id UUID PRIMARY KEY,provider TEXT NOT NULL,external_event_id TEXT NOT NULL,event_type TEXT NOT NULL,payload_hash CHAR(64) NOT NULL,
 signature_key_id TEXT,received_at TIMESTAMPTZ NOT NULL DEFAULT now(),processed_at TIMESTAMPTZ,processing_status TEXT NOT NULL CHECK(processing_status IN('RECEIVED','PROCESSED','IGNORED','FAILED')),
 error TEXT,UNIQUE(provider,external_event_id)
);
CREATE TABLE IF NOT EXISTS onboarding_audit(
 id UUID PRIMARY KEY,organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,action TEXT NOT NULL,actor TEXT NOT NULL,
 previous_status TEXT,new_status TEXT,detail JSONB NOT NULL DEFAULT '{}'::jsonb,created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS onboarding_audit_tenant_idx ON onboarding_audit(organization_id,created_at,id);
CREATE TRIGGER onboarding_audit_immutable BEFORE UPDATE OR DELETE ON onboarding_audit FOR EACH ROW EXECUTE FUNCTION reject_ai_event_mutation();
CREATE TRIGGER billing_webhook_receipts_immutable BEFORE UPDATE OR DELETE ON billing_webhook_receipts FOR EACH ROW EXECUTE FUNCTION reject_ai_event_mutation();
