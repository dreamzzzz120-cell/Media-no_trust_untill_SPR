-- Privacy/retention, exports, onboarding and billing truth foundations.
CREATE TABLE retention_policies(
 organization_id TEXT PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,verification_days INTEGER CHECK(verification_days>0),evidence_days INTEGER CHECK(evidence_days>0),
 audit_days INTEGER CHECK(audit_days>0),updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE deletion_requests(
 id UUID PRIMARY KEY,organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,subject_type TEXT NOT NULL,subject_id TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN('REQUESTED','LEGAL_HOLD','PROCESSING','COMPLETED','REJECTED')),reason TEXT,requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),completed_at TIMESTAMPTZ
);
CREATE TABLE export_jobs(
 id UUID PRIMARY KEY,organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,export_type TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN('QUEUED','RUNNING','COMPLETE','FAILED')),as_of TIMESTAMPTZ NOT NULL,manifest_hash CHAR(64),object_reference TEXT,error TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),completed_at TIMESTAMPTZ
);
CREATE INDEX export_jobs_tenant_idx ON export_jobs(organization_id,created_at DESC);
CREATE TABLE onboarding_state(
 organization_id TEXT PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,status TEXT NOT NULL CHECK(status IN('NEW','CONFIGURING','READY','BLOCKED')),
 steps JSONB NOT NULL DEFAULT '{}'::jsonb,blockers JSONB NOT NULL DEFAULT '[]'::jsonb,updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE billing_events(
 id UUID PRIMARY KEY,organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,event_type TEXT NOT NULL,
 source TEXT NOT NULL,amount_minor BIGINT,currency CHAR(3),quantity NUMERIC,external_event_id TEXT,evidence_hash CHAR(64) NOT NULL,
 observed_at TIMESTAMPTZ NOT NULL,recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(organization_id,source,external_event_id)
);
CREATE INDEX billing_events_tenant_idx ON billing_events(organization_id,observed_at DESC);
CREATE TRIGGER billing_events_immutable BEFORE UPDATE OR DELETE ON billing_events FOR EACH ROW EXECUTE FUNCTION reject_ai_event_mutation();