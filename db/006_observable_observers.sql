CREATE TABLE observer_registry (
 id UUID PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 name TEXT NOT NULL,
 observer_type TEXT NOT NULL CHECK (observer_type IN ('CONNECTOR','GATEWAY','AUDIT_LOG','SCANNER','PROVIDER','HUMAN','OTHER')),
 version TEXT,
 collection_method TEXT NOT NULL,
 authority_scope TEXT NOT NULL,
 signing_identity TEXT,
 health_state TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK (health_state IN ('HEALTHY','DEGRADED','UNAVAILABLE','UNKNOWN')),
 last_verified_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id, organization_id)
);
CREATE INDEX observer_registry_tenant_idx ON observer_registry(organization_id, created_at DESC);

ALTER TABLE evidence_ledger
 ADD COLUMN observer_id UUID,
 ADD COLUMN source_locator TEXT,
 ADD COLUMN collection_method TEXT,
 ADD COLUMN observed_at TIMESTAMPTZ,
 ADD COLUMN verification_note TEXT,
 ADD CONSTRAINT evidence_ledger_observer_fk
 FOREIGN KEY (observer_id, organization_id) REFERENCES observer_registry(id, organization_id);

CREATE INDEX evidence_ledger_observer_idx ON evidence_ledger(organization_id, observer_id, captured_at DESC);
