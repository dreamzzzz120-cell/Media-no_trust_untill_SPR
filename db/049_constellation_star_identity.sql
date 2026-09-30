-- Stable tenant-scoped star identity. Display names are never identity.
ALTER TABLE constellation_entities ADD COLUMN IF NOT EXISTS identity_key TEXT;
UPDATE constellation_entities SET identity_key='legacy:'||id::text WHERE identity_key IS NULL;
ALTER TABLE constellation_entities ALTER COLUMN identity_key SET NOT NULL;
ALTER TABLE constellation_entities ADD CONSTRAINT constellation_entities_identity_key_format CHECK(identity_key ~ '^[A-Za-z0-9][A-Za-z0-9._:/@-]{0,199}$');
CREATE UNIQUE INDEX IF NOT EXISTS constellation_entities_stable_identity_uq ON constellation_entities(organization_id,entity_type,source,identity_key);
