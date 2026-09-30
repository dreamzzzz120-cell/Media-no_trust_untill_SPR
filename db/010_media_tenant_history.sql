-- Harden legacy media records with first-class tenant ownership and append-only verification history.
ALTER TABLE media_verifications ADD COLUMN IF NOT EXISTS organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS media_verifications_tenant_idx ON media_verifications(organization_id,created_at DESC,id);
CREATE TABLE IF NOT EXISTS media_verification_history(
 id TEXT PRIMARY KEY,organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,asset_id TEXT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
 record_json JSONB NOT NULL,record_hash CHAR(64) NOT NULL,recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(organization_id,asset_id,record_hash)
);
CREATE INDEX IF NOT EXISTS media_verification_history_tenant_idx ON media_verification_history(organization_id,asset_id,recorded_at DESC);
CREATE TRIGGER media_verification_history_immutable BEFORE UPDATE OR DELETE ON media_verification_history FOR EACH ROW EXECUTE FUNCTION reject_ai_event_mutation();