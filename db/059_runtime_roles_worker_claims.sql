-- Least-privilege runtime roles and narrow cross-tenant worker claim functions.
-- The Railway owner credential remains migration-only; runtime sessions SET ROLE at connection startup.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='constellation_api_runtime') THEN
    CREATE ROLE constellation_api_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='constellation_worker_runtime') THEN
    CREATE ROLE constellation_worker_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
  END IF;
  EXECUTE format('GRANT constellation_api_runtime TO %I', current_user);
  EXECUTE format('GRANT constellation_worker_runtime TO %I', current_user);
END $$;

GRANT USAGE ON SCHEMA public TO constellation_api_runtime,constellation_worker_runtime;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO constellation_api_runtime,constellation_worker_runtime;
GRANT USAGE,SELECT,UPDATE ON ALL SEQUENCES IN SCHEMA public TO constellation_api_runtime,constellation_worker_runtime;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO constellation_api_runtime,constellation_worker_runtime;
GRANT pg_read_all_stats TO constellation_api_runtime;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO constellation_api_runtime,constellation_worker_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE,SELECT,UPDATE ON SEQUENCES TO constellation_api_runtime,constellation_worker_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO constellation_api_runtime,constellation_worker_runtime;

CREATE OR REPLACE FUNCTION claim_webhook_jobs(p_token UUID,p_limit INTEGER,p_lease_ms INTEGER)
RETURNS SETOF webhook_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog,public
AS $$
BEGIN
  IF p_limit<1 OR p_limit>100 OR p_lease_ms<1000 OR p_lease_ms>300000 THEN RAISE EXCEPTION 'INVALID_WORKER_CLAIM_ARGUMENT'; END IF;
  RETURN QUERY
  WITH due AS (
    SELECT id FROM public.webhook_outbox
    WHERE status IN('PENDING','FAILED') AND next_attempt_at<=now()
      AND (lease_expires_at IS NULL OR lease_expires_at<now())
    ORDER BY next_attempt_at,id FOR UPDATE SKIP LOCKED LIMIT p_limit
  )
  UPDATE public.webhook_outbox o
  SET lease_token=p_token,lease_expires_at=now()+p_lease_ms*interval '1 millisecond'
  FROM due WHERE o.id=due.id RETURNING o.*;
END $$;

CREATE OR REPLACE FUNCTION claim_privacy_export_jobs(p_token UUID,p_limit INTEGER,p_lease_ms INTEGER)
RETURNS SETOF export_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog,public
AS $$
BEGIN
  IF p_limit<1 OR p_limit>100 OR p_lease_ms<1000 OR p_lease_ms>300000 THEN RAISE EXCEPTION 'INVALID_WORKER_CLAIM_ARGUMENT'; END IF;
  RETURN QUERY
  WITH due AS (
    SELECT id FROM public.export_jobs
    WHERE status IN('QUEUED','FAILED') AND next_attempt_at<=now()
      AND (lease_expires_at IS NULL OR lease_expires_at<now())
    ORDER BY next_attempt_at,id FOR UPDATE SKIP LOCKED LIMIT p_limit
  )
  UPDATE public.export_jobs j
  SET status='RUNNING',lease_token=p_token,lease_expires_at=now()+p_lease_ms*interval '1 millisecond',updated_at=now()
  FROM due WHERE j.id=due.id RETURNING j.*;
END $$;

CREATE OR REPLACE FUNCTION claim_privacy_deletion_jobs(p_token UUID,p_limit INTEGER,p_lease_ms INTEGER)
RETURNS SETOF deletion_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog,public
AS $$
BEGIN
  IF p_limit<1 OR p_limit>100 OR p_lease_ms<1000 OR p_lease_ms>300000 THEN RAISE EXCEPTION 'INVALID_WORKER_CLAIM_ARGUMENT'; END IF;
  RETURN QUERY
  WITH due AS (
    SELECT id FROM public.deletion_requests
    WHERE status IN('REQUESTED','FAILED') AND next_attempt_at<=now()
      AND (lease_expires_at IS NULL OR lease_expires_at<now())
    ORDER BY next_attempt_at,id FOR UPDATE SKIP LOCKED LIMIT p_limit
  )
  UPDATE public.deletion_requests j
  SET status='PROCESSING',lease_token=p_token,lease_expires_at=now()+p_lease_ms*interval '1 millisecond',updated_at=now()
  FROM due WHERE j.id=due.id RETURNING j.*;
END $$;

REVOKE ALL ON FUNCTION claim_webhook_jobs(UUID,INTEGER,INTEGER) FROM PUBLIC,constellation_api_runtime;
REVOKE ALL ON FUNCTION claim_privacy_export_jobs(UUID,INTEGER,INTEGER) FROM PUBLIC,constellation_api_runtime;
REVOKE ALL ON FUNCTION claim_privacy_deletion_jobs(UUID,INTEGER,INTEGER) FROM PUBLIC,constellation_api_runtime;
GRANT EXECUTE ON FUNCTION claim_webhook_jobs(UUID,INTEGER,INTEGER) TO constellation_worker_runtime;
GRANT EXECUTE ON FUNCTION claim_privacy_export_jobs(UUID,INTEGER,INTEGER) TO constellation_worker_runtime;
GRANT EXECUTE ON FUNCTION claim_privacy_deletion_jobs(UUID,INTEGER,INTEGER) TO constellation_worker_runtime;
