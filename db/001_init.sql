CREATE TABLE IF NOT EXISTS media_verifications (
  id TEXT PRIMARY KEY,
  sha256 CHAR(64) NOT NULL,
  mime TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('image','video')),
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
  original_filename TEXT NOT NULL,
  record_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS media_verifications_sha256_idx ON media_verifications (sha256);
