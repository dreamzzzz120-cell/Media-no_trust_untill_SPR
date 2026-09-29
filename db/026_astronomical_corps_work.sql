-- Corps work orders make operational AI work bounded, attributable and receipt-linked.
CREATE TABLE astronomical_corps_work_orders (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 assignment_id UUID NOT NULL, mission_id UUID NOT NULL, license_id UUID NOT NULL,
 work_type TEXT NOT NULL CHECK(work_type IN ('RESEARCH','MARKETING','ADVERTISING','DISTRIBUTION','MAINTENANCE','SCIENCE','COMPLIANCE','SECURITY','INCIDENT_RESPONSE','DOCUMENTATION','CUSTOMER_OPERATIONS','OTHER')),
 objective TEXT NOT NULL, scope JSONB NOT NULL DEFAULT '{}'::jsonb,
 approval_state TEXT NOT NULL CHECK(approval_state IN ('NOT_REQUIRED','REQUIRED','APPROVED','DENIED','UNKNOWN')),
 approval_evidence_hash CHAR(64) CHECK(approval_evidence_hash IS NULL OR approval_evidence_hash ~ '^[0-9a-f]{64}$'),
 status TEXT NOT NULL CHECK(status IN ('AUTHORIZED','IN_PROGRESS','COMPLETED','FAILED','CANCELLED','UNKNOWN')),
 starts_at TIMESTAMPTZ NOT NULL, expires_at TIMESTAMPTZ NOT NULL,
 evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id),
 FOREIGN KEY(assignment_id,organization_id) REFERENCES astronomical_corps_assignments(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(mission_id,organization_id) REFERENCES universe_missions(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(license_id,organization_id) REFERENCES universe_licenses(id,organization_id) ON DELETE RESTRICT,
 CHECK(expires_at>starts_at),
 CHECK(approval_state<>'APPROVED' OR approval_evidence_hash IS NOT NULL)
);
CREATE TABLE astronomical_corps_work_results (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL, work_order_id UUID NOT NULL,
 result_state TEXT NOT NULL CHECK(result_state IN ('OBSERVED_SUCCEEDED','OBSERVED_FAILED','PARTIAL','UNKNOWN')),
 summary TEXT NOT NULL, receipt_id UUID,
 evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id),
 FOREIGN KEY(work_order_id,organization_id) REFERENCES astronomical_corps_work_orders(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(receipt_id,organization_id) REFERENCES universe_action_receipts(id,organization_id) ON DELETE RESTRICT
);
CREATE INDEX corps_work_orders_status_idx ON astronomical_corps_work_orders(organization_id,status,expires_at);
CREATE OR REPLACE FUNCTION reject_corps_work_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'corps work evidence is append-only'; END $$;
CREATE TRIGGER corps_work_orders_immutable BEFORE UPDATE OR DELETE ON astronomical_corps_work_orders FOR EACH ROW EXECUTE FUNCTION reject_corps_work_history_mutation();
CREATE TRIGGER corps_work_results_immutable BEFORE UPDATE OR DELETE ON astronomical_corps_work_results FOR EACH ROW EXECUTE FUNCTION reject_corps_work_history_mutation();
