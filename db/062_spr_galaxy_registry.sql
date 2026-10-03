-- Constellation tenant-local catalog of SPR evidence. Discovery never grants authority.
CREATE TABLE IF NOT EXISTS galaxy_registry_catalog(
 id UUID PRIMARY KEY,
 organization_id TEXT NOT NULL,
 spr_registry_id TEXT NOT NULL,
 kind TEXT NOT NULL,
 name TEXT NOT NULL,
 repository_url TEXT,
 version TEXT,
 evidence_state TEXT NOT NULL,
 evidence_hash TEXT NOT NULL CHECK (evidence_hash ~ '^[a-f0-9]{64}$'),
 observed_at TIMESTAMPTZ NOT NULL,
 provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
 capabilities TEXT[] NOT NULL DEFAULT '{}',
 dependencies TEXT[] NOT NULL DEFAULT '{}',
 known_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(organization_id,spr_registry_id,evidence_hash)
);
CREATE TABLE IF NOT EXISTS galaxy_registry_imports(
 id UUID PRIMARY KEY,
 organization_id TEXT NOT NULL,
 spr_registry_id TEXT NOT NULL,
 entity_id UUID NOT NULL,
 authority_state TEXT NOT NULL DEFAULT 'UNAUTHORIZED'
   CHECK(authority_state IN('UNAUTHORIZED','UNKNOWN','AUTHORIZED','REVOKED')),
 imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(organization_id,spr_registry_id),
 FOREIGN KEY(entity_id,organization_id) REFERENCES constellation_entities(id,organization_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS galaxy_registry_ingress_replay(
 id UUID PRIMARY KEY,
 organization_id TEXT NOT NULL,
 signature_hash TEXT NOT NULL CHECK (signature_hash ~ '^[a-f0-9]{64}$'),
 expires_at TIMESTAMPTZ NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(organization_id,signature_hash)
);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['galaxy_registry_catalog','galaxy_registry_imports','galaxy_registry_ingress_replay'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I',t);
  EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (organization_id = nullif(current_setting(''app.organization_id'',true),'''')) WITH CHECK (organization_id = nullif(current_setting(''app.organization_id'',true),''''))',t);
 END LOOP;
END $$;
CREATE INDEX IF NOT EXISTS galaxy_registry_catalog_search_idx ON galaxy_registry_catalog(organization_id,observed_at DESC);
CREATE INDEX IF NOT EXISTS galaxy_registry_import_entity_idx ON galaxy_registry_imports(organization_id,entity_id);
CREATE INDEX IF NOT EXISTS galaxy_registry_ingress_expiry_idx ON galaxy_registry_ingress_replay(organization_id,expires_at);
