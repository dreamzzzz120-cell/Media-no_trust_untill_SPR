-- Database-owned tenant isolation for core evidence/constellation/privacy tables.
-- Runtime connections must set SET LOCAL app.organization_id inside each tenant transaction.
-- Platform migrations/admin connections are intentionally separate from restricted runtime roles.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['canonical_observations','canonical_evidence','canonical_findings','canonical_claims','claim_evaluations','evidence_bindings','constellation_entities','constellation_relationships','constellation_events','deletion_requests','export_jobs','export_artifacts','privacy_job_audit','media_verifications','media_verification_history','media_processing_runs']
 LOOP
  IF to_regclass('public.'||t) IS NOT NULL THEN
   EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
   EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
   EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I',t);
   EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (organization_id = nullif(current_setting(''app.organization_id'',true),'''') ) WITH CHECK (organization_id = nullif(current_setting(''app.organization_id'',true),'''') )',t);
  END IF;
 END LOOP;
END $$;
