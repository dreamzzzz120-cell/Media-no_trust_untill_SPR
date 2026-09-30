ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS rotated_from_id TEXT REFERENCES api_keys(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS api_keys_active_lookup_idx ON api_keys(key_hash) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS api_keys_org_lifecycle_idx ON api_keys(organization_id, revoked_at, expires_at, created_at DESC);
