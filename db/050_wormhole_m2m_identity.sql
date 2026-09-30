-- Bind machine-to-machine proof packages to replay-safe transaction identity.
ALTER TABLE universe_wormhole_proofs ADD COLUMN IF NOT EXISTS transaction_id TEXT;
ALTER TABLE universe_wormhole_proofs ADD COLUMN IF NOT EXISTS protocol TEXT;
ALTER TABLE universe_wormhole_proofs ADD COLUMN IF NOT EXISTS direction TEXT;
UPDATE universe_wormhole_proofs SET transaction_id='legacy:'||id::text WHERE transaction_id IS NULL;
UPDATE universe_wormhole_proofs SET protocol='LEGACY_UNKNOWN' WHERE protocol IS NULL;
UPDATE universe_wormhole_proofs SET direction='BIDIRECTIONAL' WHERE direction IS NULL;
ALTER TABLE universe_wormhole_proofs ALTER COLUMN transaction_id SET NOT NULL;
ALTER TABLE universe_wormhole_proofs ALTER COLUMN protocol SET NOT NULL;
ALTER TABLE universe_wormhole_proofs ALTER COLUMN direction SET NOT NULL;
ALTER TABLE universe_wormhole_proofs ADD CONSTRAINT universe_wormhole_transaction_format CHECK(transaction_id ~ '^[A-Za-z0-9][A-Za-z0-9._:/@-]{0,199}$');
ALTER TABLE universe_wormhole_proofs ADD CONSTRAINT universe_wormhole_protocol_format CHECK(protocol ~ '^[A-Za-z0-9][A-Za-z0-9._/+:-]{0,79}$');
ALTER TABLE universe_wormhole_proofs ADD CONSTRAINT universe_wormhole_direction_check CHECK(direction IN ('OUTBOUND','INBOUND','BIDIRECTIONAL'));
CREATE UNIQUE INDEX IF NOT EXISTS universe_wormhole_transaction_replay_uq ON universe_wormhole_proofs(organization_id,issuer_entity_id,subject_entity_id,protocol,transaction_id);
