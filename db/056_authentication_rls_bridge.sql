-- Narrow authentication bridge for global RLS.
-- API authentication occurs before the application knows which tenant context to set.
-- Keep api_keys protected by FORCE RLS; expose only an exact-hash credential lookup through this function.
CREATE OR REPLACE FUNCTION authenticate_api_key_rls(p_key_hash text)
RETURNS TABLE(id text, organization_id text, role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF p_key_hash IS NULL OR p_key_hash !~ '^[0-9a-f]{64}$' THEN
    RETURN;
  END IF;
  RETURN QUERY
  UPDATE public.api_keys k
     SET last_used_at = now()
   WHERE k.key_hash = p_key_hash
     AND k.revoked_at IS NULL
     AND (k.expires_at IS NULL OR k.expires_at > now())
  RETURNING k.id, k.organization_id, k.role;
END $$;

REVOKE ALL ON FUNCTION authenticate_api_key_rls(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION authenticate_api_key_rls(text) TO PUBLIC;

COMMENT ON FUNCTION authenticate_api_key_rls(text) IS
'Exact SHA-256 API credential lookup used before tenant context is known. Returns no secrets and preserves FORCE RLS on api_keys.';
