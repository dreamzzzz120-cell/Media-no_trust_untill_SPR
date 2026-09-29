CREATE TABLE action_boundaries (
 id UUID PRIMARY KEY,
 organization_id TEXT NOT NULL,
 ai_identity_id UUID NOT NULL,
 name TEXT NOT NULL,
 version INTEGER NOT NULL CHECK (version > 0),
 action_type TEXT NOT NULL,
 effect TEXT NOT NULL CHECK (effect IN ('ALLOW','FLAG','REQUIRE_HUMAN','BLOCK')),
 max_numeric_value NUMERIC,
 unit TEXT,
 enabled BOOLEAN NOT NULL DEFAULT true,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id, organization_id),
 UNIQUE(organization_id, ai_identity_id, name, version),
 FOREIGN KEY (ai_identity_id, organization_id) REFERENCES ai_identities(id, organization_id)
);
CREATE INDEX action_boundaries_active_idx ON action_boundaries(organization_id, ai_identity_id, action_type, enabled, version DESC);
CREATE OR REPLACE FUNCTION reject_action_boundary_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'action_boundaries are versioned; create a new version instead'; END $$;
CREATE TRIGGER action_boundaries_immutable BEFORE UPDATE OR DELETE ON action_boundaries FOR EACH ROW EXECUTE FUNCTION reject_action_boundary_mutation();
