-- Final authority and async tenant-integrity invariants.
-- This migration extends existing controls without changing the authority model.

-- Prevent cross-tenant artifact/job linkage even if an application predicate is omitted.
ALTER TABLE export_jobs
  ADD CONSTRAINT export_jobs_org_unique UNIQUE(id,organization_id);
ALTER TABLE export_artifacts DROP CONSTRAINT IF EXISTS export_artifacts_job_id_fkey;
ALTER TABLE export_artifacts
  ADD CONSTRAINT export_artifacts_job_org_fk
  FOREIGN KEY(job_id,organization_id)
  REFERENCES export_jobs(id,organization_id)
  ON DELETE CASCADE;

-- Approval evidence cannot self-approve, have invalid chronology, or be replayed as a second approval.
ALTER TABLE universe_approvals
  ADD CONSTRAINT universe_approval_no_self_approval
  CHECK(approver_entity_id IS NULL OR approver_entity_id<>actor_entity_id);
ALTER TABLE universe_approvals
  ADD CONSTRAINT universe_approval_validity_order
  CHECK(valid_until IS NULL OR valid_until>decided_at);
CREATE UNIQUE INDEX IF NOT EXISTS universe_approval_replay_uq
  ON universe_approvals(
    organization_id,requirement_id,mission_id,actor_entity_id,approver_entity_id,evidence_hash
  )
  WHERE approver_entity_id IS NOT NULL;

-- Delegations are bounded by the parent chain as well as their local row.
CREATE OR REPLACE FUNCTION enforce_delegation_bounds() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
 parent_class SMALLINT;
 child_class SMALLINT;
 parent_depth SMALLINT;
 parent_expiry TIMESTAMPTZ;
BEGIN
 SELECT license_class INTO parent_class
 FROM universe_licenses
 WHERE id=NEW.parent_license_id AND organization_id=NEW.organization_id;
 SELECT license_class INTO child_class
 FROM universe_licenses
 WHERE id=NEW.child_license_id AND organization_id=NEW.organization_id;

 IF parent_class IS NULL OR child_class IS NULL THEN
  RAISE EXCEPTION 'delegation licence authority not established';
 END IF;
 IF parent_class < 6 THEN
  RAISE EXCEPTION 'parent licence cannot delegate authority';
 END IF;
 IF NEW.delegated_class > parent_class OR child_class > NEW.delegated_class THEN
  RAISE EXCEPTION 'delegated authority exceeds parent grant';
 END IF;

 SELECT d.depth,d.expires_at INTO parent_depth,parent_expiry
 FROM universe_delegations d
 WHERE d.organization_id=NEW.organization_id
   AND d.child_entity_id=NEW.parent_entity_id
   AND d.mission_id=NEW.mission_id
 ORDER BY d.occurred_at DESC
 LIMIT 1;

 IF parent_depth IS NOT NULL AND NEW.depth<>parent_depth+1 THEN
  RAISE EXCEPTION 'delegation depth does not extend parent chain';
 END IF;
 IF parent_expiry IS NOT NULL AND NEW.expires_at>parent_expiry THEN
  RAISE EXCEPTION 'delegation cannot outlive parent delegation';
 END IF;

 IF EXISTS (
  WITH RECURSIVE chain(id) AS (
   SELECT NEW.child_entity_id
   UNION
   SELECT d.child_entity_id
   FROM universe_delegations d
   JOIN chain c ON d.parent_entity_id=c.id
   WHERE d.organization_id=NEW.organization_id
  )
  SELECT 1 FROM chain WHERE id=NEW.parent_entity_id
 ) THEN
  RAISE EXCEPTION 'delegation cycle rejected';
 END IF;
 RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS universe_delegation_bounds ON universe_delegations;
CREATE TRIGGER universe_delegation_bounds
 BEFORE INSERT ON universe_delegations
 FOR EACH ROW EXECUTE FUNCTION enforce_delegation_bounds();

-- A deployment/runtime verifier can assert a configured PostgreSQL role cannot bypass RLS.
CREATE OR REPLACE FUNCTION assert_runtime_role_rls_safe(role_name text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE r record;
BEGIN
 SELECT rolname,rolsuper,rolbypassrls INTO r FROM pg_roles WHERE rolname=role_name;
 IF r.rolname IS NULL THEN
  RAISE EXCEPTION 'runtime database role % does not exist',role_name;
 END IF;
 IF r.rolsuper OR r.rolbypassrls THEN
  RAISE EXCEPTION 'runtime database role % can bypass RLS',role_name;
 END IF;
END $$;
