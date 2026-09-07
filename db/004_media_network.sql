-- Media Passport Network foundation
-- Establishes persistent media identity across platforms without asserting that
-- perceptually similar media is the same asset. Matches are evidence + confidence.

CREATE TABLE IF NOT EXISTS media_identities (
  id TEXT PRIMARY KEY,
  canonical_asset_id TEXT REFERENCES media_assets(id) ON DELETE SET NULL,
  identity_type TEXT NOT NULL CHECK (identity_type IN ('EXACT_ASSET','MEDIA_FAMILY')),
  identity_confidence NUMERIC(5,4) NOT NULL DEFAULT 1.0000 CHECK (identity_confidence >= 0 AND identity_confidence <= 1),
  matching_method TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS media_identities_asset_idx ON media_identities(canonical_asset_id);

CREATE TABLE IF NOT EXISTS media_identity_members (
  identity_id TEXT NOT NULL REFERENCES media_identities(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL UNIQUE REFERENCES media_assets(id) ON DELETE CASCADE,
  match_confidence NUMERIC(5,4) NOT NULL CHECK (match_confidence >= 0 AND match_confidence <= 1),
  match_method TEXT NOT NULL,
  evidence_id TEXT REFERENCES evidence(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (identity_id, asset_id)
);

CREATE INDEX IF NOT EXISTS media_identity_members_identity_idx ON media_identity_members(identity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS media_transformations (
  id TEXT PRIMARY KEY,
  parent_asset_id TEXT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  child_asset_id TEXT NOT NULL UNIQUE REFERENCES media_assets(id) ON DELETE CASCADE,
  transformation_type TEXT NOT NULL CHECK (transformation_type IN ('COPY','CROP','TRIM','TRANSCODE','RESIZE','REENCODE','EDIT','AUDIO_REPLACEMENT','CAPTION','WATERMARK','AI_EDIT','AI_GENERATION','UNKNOWN')),
  confidence NUMERIC(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  evidence_id TEXT REFERENCES evidence(id) ON DELETE SET NULL,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CHECK (parent_asset_id <> child_asset_id)
);

CREATE INDEX IF NOT EXISTS media_transformations_parent_idx ON media_transformations(parent_asset_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS media_publications (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  external_media_id TEXT,
  canonical_url TEXT,
  publisher_id TEXT,
  published_at TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'observed' CHECK (status IN ('observed','active','removed','unknown')),
  evidence_id TEXT REFERENCES evidence(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(platform, external_media_id)
);

CREATE INDEX IF NOT EXISTS media_publications_asset_idx ON media_publications(asset_id, first_seen_at DESC);
CREATE INDEX IF NOT EXISTS media_publications_platform_idx ON media_publications(platform, published_at DESC);

CREATE TABLE IF NOT EXISTS media_network_events (
  id TEXT PRIMARY KEY,
  identity_id TEXT REFERENCES media_identities(id) ON DELETE SET NULL,
  asset_id TEXT REFERENCES media_assets(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('CREATED','PUBLISHED','REPUBLISHED','TRANSFORMED','AI_ASSISTED','AI_GENERATED','CLAIM_ATTACHED','CLAIM_CHALLENGED','CORRECTED','VERIFIED','APPEALED','UPDATED','REMOVED')),
  actor_type TEXT,
  actor_id TEXT,
  platform TEXT,
  evidence_id TEXT REFERENCES evidence(id) ON DELETE SET NULL,
  event_hash CHAR(64) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS media_network_events_identity_idx ON media_network_events(identity_id, occurred_at ASC);
CREATE INDEX IF NOT EXISTS media_network_events_asset_idx ON media_network_events(asset_id, occurred_at ASC);
CREATE INDEX IF NOT EXISTS media_network_events_platform_idx ON media_network_events(platform, occurred_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS media_network_events_hash_idx ON media_network_events(event_hash);
