-- UASA self-observation: Corps work is measured using evidence, including cost/rework without inventing success.
CREATE TABLE astronomical_corps_work_metrics (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL, work_order_id UUID NOT NULL,
 metric_key TEXT NOT NULL,
 value_state TEXT NOT NULL CHECK(value_state IN ('OBSERVED','CALCULATED','ESTIMATED','UNKNOWN')),
 numeric_value NUMERIC, unit TEXT NOT NULL, calculation TEXT,
 evidence_hash CHAR(64) CHECK(evidence_hash IS NULL OR evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id),
 FOREIGN KEY(work_order_id,organization_id) REFERENCES astronomical_corps_work_orders(id,organization_id) ON DELETE RESTRICT,
 CHECK((value_state='UNKNOWN' AND numeric_value IS NULL) OR value_state<>'UNKNOWN'),
 CHECK(value_state NOT IN ('OBSERVED','CALCULATED') OR evidence_hash IS NOT NULL),
 CHECK(value_state<>'CALCULATED' OR (calculation IS NOT NULL AND btrim(calculation)<>'' ))
);
CREATE INDEX corps_work_metric_idx ON astronomical_corps_work_metrics(organization_id,work_order_id,metric_key);
CREATE TRIGGER corps_work_metrics_immutable BEFORE UPDATE OR DELETE ON astronomical_corps_work_metrics FOR EACH ROW EXECUTE FUNCTION reject_corps_work_history_mutation();
