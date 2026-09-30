-- Webhook delivery attempts are immutable evidence; subscription secrets stay out of payloads.
CREATE TABLE webhook_delivery_attempts(
 id UUID PRIMARY KEY,organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,outbox_id UUID NOT NULL REFERENCES webhook_outbox(id) ON DELETE CASCADE,
 attempt_number INTEGER NOT NULL CHECK(attempt_number>0),request_hash CHAR(64) NOT NULL,response_status INTEGER,error_class TEXT,
 started_at TIMESTAMPTZ NOT NULL,completed_at TIMESTAMPTZ NOT NULL,UNIQUE(outbox_id,attempt_number)
);
CREATE INDEX webhook_attempt_tenant_idx ON webhook_delivery_attempts(organization_id,outbox_id,attempt_number);
CREATE TRIGGER webhook_attempts_immutable BEFORE UPDATE OR DELETE ON webhook_delivery_attempts FOR EACH ROW EXECUTE FUNCTION reject_ai_event_mutation();