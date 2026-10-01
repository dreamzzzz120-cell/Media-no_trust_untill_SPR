CREATE TABLE IF NOT EXISTS worker_heartbeats(
 worker_name TEXT PRIMARY KEY,
 mode TEXT NOT NULL CHECK(mode IN ('EMBEDDED','STANDALONE')),
 instance_id TEXT NOT NULL,
 last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 last_error TEXT,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS worker_heartbeats_last_seen_idx ON worker_heartbeats(last_heartbeat_at);
