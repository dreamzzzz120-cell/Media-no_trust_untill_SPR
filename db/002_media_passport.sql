CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS creators (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  identity_status TEXT NOT NULL DEFAULT 'unverified' CHECK (identity_status IN ('unverified','pending','verified')),
  trust_score NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  creator_id TEXT REFERENCES creators(id) ON DELETE SET NULL,
  sha256 CHAR(64) NOT NULL,
  perceptual_hash TEXT,
  audio_fingerprint TEXT,
  normalized_fingerprint TEXT,
  mime TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('image','video','audio','article','text','podcast','livestream','document','social_post','news_report','advertisement')),
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
  original_filename TEXT NOT NULL,
  declared_ai_use TEXT NOT NULL DEFAULT 'unknown' CHECK (declared_ai_use IN ('NONE','AI_ASSISTED','AI_EDITED','AI_GENERATED','AI_SYNTHETIC_PERSON','AI_SYNTHETIC_VOICE','AI_DEEPFAKE','UNKNOWN')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS media_assets_sha256_idx ON media_assets(sha256);
CREATE TABLE IF NOT EXISTS media_passports (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL UNIQUE REFERENCES media_assets(id) ON DELETE CASCADE,
  trust_score NUMERIC(5,2),
  confidence NUMERIC(5,4),
  decision TEXT NOT NULL CHECK (decision IN ('TRUST','PROMOTE','REVIEW','SUPPRESS')),
  ai_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS trust_observations (
  id TEXT PRIMARY KEY,
  passport_id TEXT NOT NULL REFERENCES media_passports(id) ON DELETE CASCADE,
  dimension TEXT NOT NULL,
  score NUMERIC(5,2),
  confidence NUMERIC(5,4),
  evidence_id TEXT,
  model_name TEXT,
  model_version TEXT,
  content_hash CHAR(64) NOT NULL,
  policy_version TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS trust_observations_passport_idx ON trust_observations(passport_id, observed_at DESC);
CREATE TABLE IF NOT EXISTS evidence (
  id TEXT PRIMARY KEY,
  passport_id TEXT NOT NULL REFERENCES media_passports(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  evidence_type TEXT NOT NULL,
  result TEXT NOT NULL,
  confidence NUMERIC(5,4),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  content_hash CHAR(64) NOT NULL,
  model_name TEXT,
  model_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS evidence_passport_idx ON evidence(passport_id, created_at DESC);
CREATE TABLE IF NOT EXISTS provenance_manifests (
  id TEXT PRIMARY KEY,
  passport_id TEXT NOT NULL REFERENCES media_passports(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('verified','present_untrusted','absent','error')),
  issuer TEXT,
  manifest_hash TEXT,
  assertions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS claims (
  id TEXT PRIMARY KEY,
  passport_id TEXT NOT NULL REFERENCES media_passports(id) ON DELETE CASCADE,
  claim_text TEXT NOT NULL,
  classification TEXT NOT NULL CHECK (classification IN ('SUPPORTED','PARTIALLY_SUPPORTED','UNSUPPORTED','CONTRADICTED','OPINION','SATIRE','UNKNOWN')),
  confidence NUMERIC(5,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  passport_id TEXT NOT NULL REFERENCES media_passports(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 50,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','assigned','completed','escalated')),
  reviewer_id TEXT,
  outcome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS appeals (
  id TEXT PRIMARY KEY,
  passport_id TEXT NOT NULL REFERENCES media_passports(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  submitted_evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reassessing','human_review','resolved','rejected')),
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  passport_id TEXT NOT NULL REFERENCES media_passports(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  organization_id TEXT,
  actor_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_resource_idx ON audit_logs(resource_type, resource_id, created_at DESC);
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key_hash CHAR(64) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('viewer','creator','reviewer','moderator','analyst','organization_admin','platform_admin','super_admin')),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  secret_hash CHAR(64) NOT NULL,
  events JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS policy_versions (
  id TEXT PRIMARY KEY,
  jurisdiction TEXT NOT NULL,
  version TEXT NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL,
  policy_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(jurisdiction, version)
);
