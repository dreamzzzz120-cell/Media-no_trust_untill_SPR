-- Durable execution idempotency. A key is unique only inside its tenant.
CREATE TABLE IF NOT EXISTS universe_execution_idempotency (
 organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 idempotency_key TEXT NOT NULL,
 action_fingerprint CHAR(64) NOT NULL CHECK(action_fingerprint ~ '^[0-9a-f]{64}$'),
 receipt_id UUID,
 state TEXT NOT NULL CHECK(state IN ('CLAIMED','COMPLETED','FAILED')),
 claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 completed_at TIMESTAMPTZ,
 PRIMARY KEY(organization_id,idempotency_key),
 CHECK(length(idempotency_key) BETWEEN 1 AND 200),
 CHECK((state='COMPLETED' AND receipt_id IS NOT NULL AND completed_at IS NOT NULL) OR state<>'COMPLETED')
);
CREATE INDEX IF NOT EXISTS universe_execution_idempotency_receipt_idx ON universe_execution_idempotency(organization_id,receipt_id) WHERE receipt_id IS NOT NULL;
CREATE OR REPLACE FUNCTION reject_execution_idempotency_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'execution idempotency history cannot be deleted'; END $$;
DROP TRIGGER IF EXISTS universe_execution_idempotency_no_delete ON universe_execution_idempotency;
CREATE TRIGGER universe_execution_idempotency_no_delete BEFORE DELETE ON universe_execution_idempotency FOR EACH ROW EXECUTE FUNCTION reject_execution_idempotency_delete();
