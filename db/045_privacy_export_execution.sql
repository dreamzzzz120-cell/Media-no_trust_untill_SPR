-- Durable privacy/export execution with authorization, recovery and immutable audit history.
ALTER TABLE deletion_requests DROP CONSTRAINT IF EXISTS deletion_requests_status_check;
ALTER TABLE deletion_requests ADD CONSTRAINT deletion_requests_status_check CHECK(status IN('REQUESTED','LEGAL_HOLD','PROCESSING','COMPLETED','REJECTED','FAILED','DEAD'));
ALTER TABLE deletion_requests ADD COLUMN IF NOT EXISTS requested_by TEXT;
ALTER TABLE deletion_requests ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0 CHECK(attempt_count>=0);
ALTER TABLE deletion_requests ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE deletion_requests ADD COLUMN IF NOT EXISTS lease_token UUID;
ALTER TABLE deletion_requests ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ;
ALTER TABLE deletion_requests ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE deletion_requests ADD COLUMN IF NOT EXISTS result_manifest_hash CHAR(64);
ALTER TABLE deletion_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE export_jobs DROP CONSTRAINT IF EXISTS export_jobs_status_check;
ALTER TABLE export_jobs ADD CONSTRAINT export_jobs_status_check CHECK(status IN('QUEUED','RUNNING','COMPLETE','FAILED','DEAD'));
ALTER TABLE export_jobs ADD COLUMN IF NOT EXISTS requested_by TEXT;
ALTER TABLE export_jobs ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0 CHECK(attempt_count>=0);
ALTER TABLE export_jobs ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE export_jobs ADD COLUMN IF NOT EXISTS lease_token UUID;
ALTER TABLE export_jobs ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ;
ALTER TABLE export_jobs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS deletion_requests_due_idx ON deletion_requests(status,next_attempt_at,lease_expires_at);
CREATE INDEX IF NOT EXISTS export_jobs_due_idx ON export_jobs(status,next_attempt_at,lease_expires_at);
CREATE TABLE IF NOT EXISTS privacy_job_audit(
 id UUID PRIMARY KEY,organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,job_type TEXT NOT NULL CHECK(job_type IN('DELETION','EXPORT','RETENTION')),
 job_id UUID NOT NULL,action TEXT NOT NULL,actor TEXT NOT NULL,detail JSONB NOT NULL DEFAULT '{}'::jsonb,created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS privacy_job_audit_tenant_idx ON privacy_job_audit(organization_id,job_type,job_id,created_at,id);
CREATE TRIGGER privacy_job_audit_immutable BEFORE UPDATE OR DELETE ON privacy_job_audit FOR EACH ROW EXECUTE FUNCTION reject_ai_event_mutation();
CREATE TABLE IF NOT EXISTS export_artifacts(
 id UUID PRIMARY KEY,organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,job_id UUID NOT NULL REFERENCES export_jobs(id) ON DELETE CASCADE,
 manifest JSONB NOT NULL,manifest_hash CHAR(64) NOT NULL,record_count INTEGER NOT NULL CHECK(record_count>=0),created_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(organization_id,job_id)
);
CREATE TRIGGER export_artifacts_immutable BEFORE UPDATE OR DELETE ON export_artifacts FOR EACH ROW EXECUTE FUNCTION reject_ai_event_mutation();
