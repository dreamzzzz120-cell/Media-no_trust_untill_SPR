-- Apply fail-closed tenant RLS to evidence source lifecycle events introduced after the global sweep.
ALTER TABLE evidence_source_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_source_status_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON evidence_source_status_events;
CREATE POLICY tenant_isolation ON evidence_source_status_events
USING (organization_id = nullif(current_setting('app.organization_id', true), ''))
WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), ''));
