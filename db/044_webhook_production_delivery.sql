-- Production webhook delivery: leases, signing-key rotation, replay metadata, dead-letter recovery and bounded operations.
ALTER TABLE webhook_outbox ADD COLUMN IF NOT EXISTS lease_token UUID;
ALTER TABLE webhook_outbox ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ;
ALTER TABLE webhook_outbox ADD COLUMN IF NOT EXISTS dead_at TIMESTAMPTZ;
ALTER TABLE webhook_outbox ADD COLUMN IF NOT EXISTS requeue_count INTEGER NOT NULL DEFAULT 0 CHECK(requeue_count>=0);
ALTER TABLE webhook_delivery_attempts ADD COLUMN IF NOT EXISTS delivery_id UUID;
ALTER TABLE webhook_delivery_attempts ADD COLUMN IF NOT EXISTS signature_key_id TEXT;
ALTER TABLE webhook_delivery_attempts ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS webhook_attempt_delivery_id_uq ON webhook_delivery_attempts(delivery_id) WHERE delivery_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS webhook_outbox_lease_idx ON webhook_outbox(status,lease_expires_at) WHERE lease_token IS NOT NULL;
CREATE TABLE IF NOT EXISTS webhook_signing_keys(
 id TEXT NOT NULL,organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,secret TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN('ACTIVE','VERIFY_ONLY','RETIRED')),not_before TIMESTAMPTZ NOT NULL DEFAULT now(),not_after TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),PRIMARY KEY(organization_id,id),
 CHECK(length(secret)>=32),CHECK(not_after IS NULL OR not_after>not_before)
);
CREATE UNIQUE INDEX IF NOT EXISTS webhook_one_active_signing_key ON webhook_signing_keys(organization_id) WHERE status='ACTIVE';
CREATE TABLE IF NOT EXISTS webhook_dead_letter_events(
 id UUID PRIMARY KEY,organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,outbox_id UUID NOT NULL REFERENCES webhook_outbox(id) ON DELETE CASCADE,
 action TEXT NOT NULL CHECK(action IN('DEAD','REQUEUED')),reason TEXT NOT NULL,actor TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS webhook_dead_letter_tenant_idx ON webhook_dead_letter_events(organization_id,outbox_id,created_at DESC);
CREATE TRIGGER webhook_dead_letter_immutable BEFORE UPDATE OR DELETE ON webhook_dead_letter_events FOR EACH ROW EXECUTE FUNCTION reject_ai_event_mutation();
