ALTER TABLE ai_collector_runs ADD COLUMN IF NOT EXISTS config_id UUID;
CREATE TABLE IF NOT EXISTS ai_collector_configs(
 id UUID PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 provider TEXT NOT NULL CHECK(provider IN('OPENAI','ANTHROPIC','AI_GATEWAY','SAAS_INVENTORY')),
 base_url TEXT NOT NULL,
 path TEXT NOT NULL,
 secret_ref TEXT NOT NULL,
 enabled BOOLEAN NOT NULL DEFAULT true,
 interval_minutes INTEGER NOT NULL DEFAULT 60 CHECK(interval_minutes BETWEEN 5 AND 10080),
 last_attempt_at TIMESTAMPTZ,
 last_success_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(organization_id,provider,base_url,path)
);
ALTER TABLE ai_collector_runs DROP CONSTRAINT IF EXISTS ai_collector_runs_config_id_fkey;
ALTER TABLE ai_collector_runs ADD CONSTRAINT ai_collector_runs_config_id_fkey FOREIGN KEY(config_id) REFERENCES ai_collector_configs(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS ai_collector_configs_due_idx ON ai_collector_configs(enabled,last_attempt_at);
