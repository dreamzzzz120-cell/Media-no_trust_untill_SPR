-- Mission economics: spending/consumption authority is distinct from operational authority.
CREATE TABLE universe_mission_budgets (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL, mission_id UUID NOT NULL,
 budget_type TEXT NOT NULL CHECK(budget_type IN ('MONEY','TOKENS','COMPUTE','TIME','API_CALLS','MESSAGES','STORAGE','OTHER')),
 limit_value NUMERIC NOT NULL CHECK(limit_value>=0), unit TEXT NOT NULL, currency TEXT,
 period_start TIMESTAMPTZ NOT NULL, period_end TIMESTAMPTZ NOT NULL,
 approval_id UUID, evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id),
 FOREIGN KEY(mission_id,organization_id) REFERENCES universe_missions(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(approval_id,organization_id) REFERENCES universe_approvals(id,organization_id) ON DELETE RESTRICT,
 CHECK(period_end>period_start)
);
CREATE TABLE universe_resource_consumption (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL, mission_id UUID NOT NULL, actor_entity_id UUID NOT NULL,
 budget_id UUID, receipt_id UUID, consumption_type TEXT NOT NULL,
 value_state TEXT NOT NULL CHECK(value_state IN ('OBSERVED','CALCULATED','ESTIMATED','UNKNOWN')),
 amount NUMERIC, unit TEXT NOT NULL, calculation TEXT,
 evidence_hash CHAR(64) CHECK(evidence_hash IS NULL OR evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 occurred_at TIMESTAMPTZ NOT NULL, observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(id,organization_id),
 FOREIGN KEY(mission_id,organization_id) REFERENCES universe_missions(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(actor_entity_id,organization_id) REFERENCES constellation_entities(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(budget_id,organization_id) REFERENCES universe_mission_budgets(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(receipt_id,organization_id) REFERENCES universe_action_receipts(id,organization_id) ON DELETE RESTRICT,
 CHECK((value_state='UNKNOWN' AND amount IS NULL) OR value_state<>'UNKNOWN'),
 CHECK(value_state NOT IN ('OBSERVED','CALCULATED') OR evidence_hash IS NOT NULL),
 CHECK(value_state<>'CALCULATED' OR (calculation IS NOT NULL AND btrim(calculation)<>'')),
 CHECK(observed_at>=occurred_at)
);
CREATE TABLE universe_budget_evaluations (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL, mission_id UUID NOT NULL, budget_id UUID NOT NULL,
 decision TEXT NOT NULL CHECK(decision IN ('WITHIN_BUDGET','OVER_BUDGET','UNKNOWN')),
 consumed_value NUMERIC, remaining_value NUMERIC,
 calculation TEXT, evidence_hash CHAR(64) CHECK(evidence_hash IS NULL OR evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 evaluated_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id),
 FOREIGN KEY(mission_id,organization_id) REFERENCES universe_missions(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(budget_id,organization_id) REFERENCES universe_mission_budgets(id,organization_id) ON DELETE RESTRICT,
 CHECK(decision='UNKNOWN' OR (consumed_value IS NOT NULL AND remaining_value IS NOT NULL AND calculation IS NOT NULL AND evidence_hash IS NOT NULL))
);
CREATE INDEX universe_consumption_mission_idx ON universe_resource_consumption(organization_id,mission_id,occurred_at DESC);
CREATE OR REPLACE FUNCTION reject_economic_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'economic evidence is append-only'; END $$;
CREATE TRIGGER universe_resource_consumption_immutable BEFORE UPDATE OR DELETE ON universe_resource_consumption FOR EACH ROW EXECUTE FUNCTION reject_economic_history_mutation();
CREATE TRIGGER universe_budget_evaluations_immutable BEFORE UPDATE OR DELETE ON universe_budget_evaluations FOR EACH ROW EXECUTE FUNCTION reject_economic_history_mutation();
