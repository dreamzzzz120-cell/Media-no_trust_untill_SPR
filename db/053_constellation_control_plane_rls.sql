-- Expand database-owned tenant isolation to Constellation control-plane and reporting tables.
-- Every runtime tenant transaction must SET LOCAL app.organization_id before touching these tables.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY[
  'customer_reports',
  'universe_authority_roots','universe_licenses',
  'universe_missions','universe_mission_members','universe_action_receipts',
  'universe_authority_evaluations','universe_action_attempts',
  'universe_authority_status_events','universe_authority_freshness',
  'universe_delegations','universe_handoff_receipts',
  'universe_investigations','universe_investigation_items','universe_timeline_snapshots',
  'universe_mission_budgets','universe_resource_consumption','universe_budget_evaluations'
 ]
 LOOP
  IF to_regclass('public.'||t) IS NOT NULL THEN
   EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
   EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
   EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I',t);
   EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (organization_id = nullif(current_setting(''app.organization_id'',true),'''')) WITH CHECK (organization_id = nullif(current_setting(''app.organization_id'',true),''''))',t);
  END IF;
 END LOOP;
END $$;
