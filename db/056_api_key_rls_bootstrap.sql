-- Allow authentication before the tenant is known without weakening tenant RLS.
-- The application sets app.api_key_hash only inside a transaction for the presented key.
-- Tenant administrators continue to access API-key lifecycle rows through app.organization_id.
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON api_keys;
DROP POLICY IF EXISTS api_key_auth_or_tenant ON api_keys;
CREATE POLICY tenant_isolation ON api_keys
USING (
  organization_id = nullif(current_setting('app.organization_id', true), '')
  OR key_hash = nullif(current_setting('app.api_key_hash', true), '')
)
WITH CHECK (
  organization_id = nullif(current_setting('app.organization_id', true), '')
);
