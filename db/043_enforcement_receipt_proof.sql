-- Real enforcement proof hardening: PREVENTED requires an externally identifiable enforcement receipt.
ALTER TABLE enforcement_attempts ADD COLUMN IF NOT EXISTS external_receipt_id TEXT;
ALTER TABLE enforcement_attempts ADD COLUMN IF NOT EXISTS external_event_id TEXT;
ALTER TABLE enforcement_attempts DROP CONSTRAINT IF EXISTS enforcement_prevented_requires_external_receipt;
ALTER TABLE enforcement_attempts ADD CONSTRAINT enforcement_prevented_requires_external_receipt CHECK(
 prevention_state <> 'PREVENTED' OR (
   decision='BLOCK' AND outcome='BLOCKED' AND completed_at IS NOT NULL
   AND evidence_id IS NOT NULL AND evidence_hash IS NOT NULL
   AND external_receipt_id IS NOT NULL AND length(external_receipt_id)>0
   AND external_event_id IS NOT NULL AND length(external_event_id)>0
 )
);
CREATE UNIQUE INDEX IF NOT EXISTS enforcement_external_receipt_tenant_uq
 ON enforcement_attempts(organization_id,enforcement_point,external_receipt_id)
 WHERE external_receipt_id IS NOT NULL;
