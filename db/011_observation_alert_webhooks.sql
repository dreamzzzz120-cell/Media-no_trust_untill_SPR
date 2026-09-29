-- Continuous observation, change detection, alerting and durable webhook outbox.
CREATE TABLE observation_cursors(
 organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,collector TEXT NOT NULL,scope TEXT NOT NULL,
 cursor_value TEXT,coverage_state TEXT NOT NULL CHECK(coverage_state IN('SUPPORTED','PARTIAL','UNKNOWN','UNAVAILABLE')),
 last_success_at TIMESTAMPTZ,last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),last_error TEXT,updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(organization_id,collector,scope)
);
CREATE TABLE change_events(
 id UUID PRIMARY KEY,organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,subject_type TEXT NOT NULL,subject_id TEXT NOT NULL,
 change_type TEXT NOT NULL,before_hash CHAR(64),after_hash CHAR(64),evidence_hash CHAR(64) NOT NULL,source TEXT NOT NULL,
 evidence_state TEXT NOT NULL CHECK(evidence_state IN('SUPPORTED','PARTIAL','UNKNOWN','CONFLICTING','UNSUPPORTED')),
 observed_at TIMESTAMPTZ NOT NULL,ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),details JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX change_events_tenant_subject_idx ON change_events(organization_id,subject_type,subject_id,observed_at DESC,id);
CREATE TABLE operational_alerts(
 id UUID PRIMARY KEY,organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,change_event_id UUID REFERENCES change_events(id) ON DELETE RESTRICT,
 severity TEXT NOT NULL CHECK(severity IN('INFO','LOW','MEDIUM','HIGH','CRITICAL')),status TEXT NOT NULL CHECK(status IN('OPEN','ACKNOWLEDGED','RESOLVED')),
 title TEXT NOT NULL,explanation TEXT NOT NULL,evidence_state TEXT NOT NULL CHECK(evidence_state IN('SUPPORTED','PARTIAL','UNKNOWN','CONFLICTING','UNSUPPORTED')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),acknowledged_at TIMESTAMPTZ,resolved_at TIMESTAMPTZ
);
CREATE INDEX operational_alerts_tenant_idx ON operational_alerts(organization_id,status,severity,created_at DESC);
CREATE TABLE webhook_outbox(
 id UUID PRIMARY KEY,organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,subscription_id TEXT NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
 event_type TEXT NOT NULL,event_id TEXT NOT NULL,payload JSONB NOT NULL,payload_hash CHAR(64) NOT NULL,status TEXT NOT NULL CHECK(status IN('PENDING','DELIVERED','FAILED','DEAD')),
 attempt_count INTEGER NOT NULL DEFAULT 0 CHECK(attempt_count>=0),next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),last_attempt_at TIMESTAMPTZ,last_status_code INTEGER,last_error TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),delivered_at TIMESTAMPTZ,UNIQUE(subscription_id,event_type,event_id)
);
CREATE INDEX webhook_outbox_due_idx ON webhook_outbox(status,next_attempt_at);
CREATE TRIGGER change_events_immutable BEFORE UPDATE OR DELETE ON change_events FOR EACH ROW EXECUTE FUNCTION reject_ai_event_mutation();