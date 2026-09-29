-- AI accountability cost/rework ledger. Append-only evidence; estimates never masquerade as observations.
CREATE TABLE ai_accountability_entries (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 ai_id UUID NOT NULL, event_id UUID,
 metric_type TEXT NOT NULL CHECK(metric_type IN ('AI_EXECUTION_TIME','MODEL_COST','TOKEN_COST','TOOL_COST','API_COST','INFRASTRUCTURE_COST','RETRY','FAILED_ACTION','REPEATED_INSTRUCTION','CORRECTION','BACKTRACK','UNDO','REWORK','HUMAN_INTERVENTION','HUMAN_WAIT_TIME','HUMAN_CORRECTION_TIME','RECOVERY_DURATION','TIME_SAVED','COST_AVOIDED','SUCCESSFUL_ACTION','FIRST_ATTEMPT_COMPLETION','AUTONOMOUS_COMPLETION')),
 value NUMERIC NOT NULL CHECK(value>=0), unit TEXT NOT NULL CHECK(unit IN ('MILLISECONDS','COUNT','TOKENS','USD','CAD','SECONDS','MINUTES')),
 value_state TEXT NOT NULL CHECK(value_state IN ('OBSERVED','CALCULATED','CONFIGURED','ESTIMATED','UNKNOWN')),
 attribution TEXT NOT NULL CHECK(attribution IN ('AI','HUMAN','TOOL','INTEGRATION','EXTERNAL','MIXED','UNKNOWN')),
 evidence_hash CHAR(64) NOT NULL, source TEXT NOT NULL, occurred_at TIMESTAMPTZ NOT NULL,
 calculation JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 FOREIGN KEY(ai_id,organization_id) REFERENCES ai_systems(id,organization_id)
);
CREATE INDEX ai_accountability_tenant_ai_time_idx ON ai_accountability_entries(organization_id,ai_id,occurred_at DESC,id);
CREATE OR REPLACE FUNCTION reject_accountability_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'accountability ledger is append-only'; END $$;
CREATE TRIGGER ai_accountability_immutable BEFORE UPDATE OR DELETE ON ai_accountability_entries FOR EACH ROW EXECUTE FUNCTION reject_accountability_mutation();