-- Single-use approval consumption bound to an exact governed action.
ALTER TABLE universe_approvals
  ADD COLUMN IF NOT EXISTS single_use BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS universe_approval_consumptions (
 id UUID PRIMARY KEY,
 organization_id TEXT NOT NULL,
 approval_id UUID NOT NULL,
 action_fingerprint CHAR(64) NOT NULL CHECK(action_fingerprint ~ '^[0-9a-f]{64}$'),
 idempotency_key TEXT NOT NULL CHECK(length(idempotency_key) BETWEEN 1 AND 200),
 consumed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(organization_id, approval_id),
 UNIQUE(organization_id, idempotency_key),
 FOREIGN KEY(approval_id,organization_id) REFERENCES universe_approvals(id,organization_id) ON DELETE RESTRICT
);

ALTER TABLE universe_approval_consumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE universe_approval_consumptions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON universe_approval_consumptions;
CREATE POLICY tenant_isolation ON universe_approval_consumptions
 USING (organization_id = nullif(current_setting('app.organization_id',true),''))
 WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),''));

CREATE OR REPLACE FUNCTION reject_approval_consumption_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'approval consumption history is append-only'; END $$;
DROP TRIGGER IF EXISTS universe_approval_consumptions_immutable ON universe_approval_consumptions;
CREATE TRIGGER universe_approval_consumptions_immutable
 BEFORE UPDATE OR DELETE ON universe_approval_consumptions
 FOR EACH ROW EXECUTE FUNCTION reject_approval_consumption_mutation();
