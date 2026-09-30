-- Incident reconstruction and evidence-backed compliance/audit package foundation.
CREATE TABLE incidents(
 id UUID PRIMARY KEY,organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,title TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN('OPEN','INVESTIGATING','CONTAINED','RESOLVED')),opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),closed_at TIMESTAMPTZ,
 summary TEXT NOT NULL DEFAULT '',evidence_state TEXT NOT NULL CHECK(evidence_state IN('SUPPORTED','PARTIAL','UNKNOWN','CONFLICTING','UNSUPPORTED'))
);
CREATE TABLE incident_items(
 incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 item_type TEXT NOT NULL CHECK(item_type IN('FLIGHT_RECORD','CHANGE_EVENT','ALERT','CONSTELLATION_EVENT','MEDIA_VERIFICATION','EVIDENCE','GOVERNANCE_EVALUATION')),
 item_id TEXT NOT NULL,occurred_at TIMESTAMPTZ NOT NULL,evidence_hash CHAR(64) NOT NULL,note TEXT,PRIMARY KEY(incident_id,item_type,item_id)
);
CREATE INDEX incident_items_timeline_idx ON incident_items(organization_id,incident_id,occurred_at,item_type,item_id);
CREATE TABLE compliance_controls(
 id UUID NOT NULL,version INTEGER NOT NULL,framework TEXT NOT NULL,control_key TEXT NOT NULL,title TEXT NOT NULL,requirement TEXT NOT NULL,
 effective_at TIMESTAMPTZ NOT NULL,retired_at TIMESTAMPTZ,PRIMARY KEY(id,version),UNIQUE(framework,control_key,version)
);
CREATE TABLE compliance_evaluations(
 id UUID PRIMARY KEY,organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,control_id UUID NOT NULL,control_version INTEGER NOT NULL,
 state TEXT NOT NULL CHECK(state IN('SUPPORTED','PARTIAL','UNKNOWN','CONFLICTING','UNSUPPORTED')),explanation TEXT NOT NULL,evidence_hashes JSONB NOT NULL,
 evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now(),FOREIGN KEY(control_id,control_version) REFERENCES compliance_controls(id,version)
);
CREATE INDEX compliance_eval_tenant_idx ON compliance_evaluations(organization_id,evaluated_at DESC,control_id);
CREATE TABLE audit_packages(
 id UUID PRIMARY KEY,organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,framework TEXT NOT NULL,as_of TIMESTAMPTZ NOT NULL,
 manifest JSONB NOT NULL,manifest_hash CHAR(64) NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(organization_id,framework,as_of,manifest_hash)
);
CREATE TRIGGER incident_items_immutable BEFORE UPDATE OR DELETE ON incident_items FOR EACH ROW EXECUTE FUNCTION reject_ai_event_mutation();
CREATE TRIGGER compliance_evaluations_immutable BEFORE UPDATE OR DELETE ON compliance_evaluations FOR EACH ROW EXECUTE FUNCTION reject_ai_event_mutation();
CREATE TRIGGER audit_packages_immutable BEFORE UPDATE OR DELETE ON audit_packages FOR EACH ROW EXECUTE FUNCTION reject_ai_event_mutation();