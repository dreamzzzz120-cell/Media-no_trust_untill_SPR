-- Customer reporting and self-observability without fabricated metrics.
CREATE TABLE customer_reports(
 id UUID PRIMARY KEY,organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,report_type TEXT NOT NULL,
 as_of TIMESTAMPTZ NOT NULL,coverage_state TEXT NOT NULL CHECK(coverage_state IN('SUPPORTED','PARTIAL','UNKNOWN','UNAVAILABLE')),
 content JSONB NOT NULL,content_hash CHAR(64) NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(organization_id,report_type,as_of,content_hash)
);
CREATE TABLE service_observations(
 id UUID PRIMARY KEY,component TEXT NOT NULL,check_type TEXT NOT NULL,state TEXT NOT NULL CHECK(state IN('OK','DEGRADED','DOWN','UNKNOWN')),
 detail TEXT NOT NULL,observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX service_observations_time_idx ON service_observations(component,observed_at DESC);
CREATE TRIGGER customer_reports_immutable BEFORE UPDATE OR DELETE ON customer_reports FOR EACH ROW EXECUTE FUNCTION reject_ai_event_mutation();
CREATE TRIGGER service_observations_immutable BEFORE UPDATE OR DELETE ON service_observations FOR EACH ROW EXECUTE FUNCTION reject_ai_event_mutation();