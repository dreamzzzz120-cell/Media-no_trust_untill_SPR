-- Forward-only correction: preserve the canonical tenant_isolation policy name
-- while retaining hash-bound pre-authentication lookup for API keys.
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
