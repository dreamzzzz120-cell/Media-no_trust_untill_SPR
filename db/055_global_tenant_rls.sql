-- Fail-closed tenant isolation for every current and future tenant-owned table.
-- Any table carrying organization_id is treated as tenant data and must be protected.
-- Runtime queries must establish app.organization_id on the same transaction/connection.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name, c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND a.attname = 'organization_id'
      AND a.attisdropped = false
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.schema_name, r.table_name);
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', r.schema_name, r.table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I.%I', r.schema_name, r.table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I.%I USING (organization_id = nullif(current_setting(''app.organization_id'', true), '''')) WITH CHECK (organization_id = nullif(current_setting(''app.organization_id'', true), ''''))',
      r.schema_name,
      r.table_name
    );
  END LOOP;
END $$;
