ALTER TABLE tenant_rate_windows RENAME COLUMN organization_id TO scope_key;
ALTER TABLE tenant_rate_windows DROP CONSTRAINT IF EXISTS tenant_rate_windows_pkey;
ALTER TABLE tenant_rate_windows ADD PRIMARY KEY(scope_key,rate_class,window_start);

CREATE OR REPLACE FUNCTION consume_tenant_quota(p_org TEXT,p_class TEXT,p_limit INTEGER,p_window_ms INTEGER)
RETURNS TABLE(allowed BOOLEAN,remaining INTEGER,reset_at TIMESTAMPTZ)
LANGUAGE plpgsql AS $$
DECLARE
 v_now TIMESTAMPTZ:=clock_timestamp();
 v_epoch_ms BIGINT;
 v_bucket_ms BIGINT;
 v_start TIMESTAMPTZ;
 v_count INTEGER;
BEGIN
 IF p_org IS NULL OR p_org='' OR p_limit<1 OR p_window_ms<1 THEN RAISE EXCEPTION 'INVALID_QUOTA_ARGUMENT'; END IF;
 v_epoch_ms:=floor(extract(epoch FROM v_now)*1000);
 v_bucket_ms:=(v_epoch_ms/p_window_ms)*p_window_ms;
 v_start:=to_timestamp(v_bucket_ms/1000.0);
 INSERT INTO tenant_rate_windows(scope_key,rate_class,window_start,request_count)
 VALUES(p_org,p_class,v_start,1)
 ON CONFLICT(scope_key,rate_class,window_start)
 DO UPDATE SET request_count=tenant_rate_windows.request_count+1
 RETURNING request_count INTO v_count;
 RETURN QUERY SELECT v_count<=p_limit,GREATEST(0,p_limit-v_count),v_start+(p_window_ms*interval '1 millisecond');
END $$;
