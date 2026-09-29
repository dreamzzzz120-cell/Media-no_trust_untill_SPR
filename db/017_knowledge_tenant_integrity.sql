-- Knowledge-time semantics and tenant-composite integrity hardening.
ALTER TABLE constellation_entities ADD COLUMN known_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE constellation_relationships ADD COLUMN known_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE constellation_events ADD COLUMN known_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE change_events ADD CONSTRAINT change_events_org_unique UNIQUE(id,organization_id);
ALTER TABLE operational_alerts DROP CONSTRAINT IF EXISTS operational_alerts_change_event_id_fkey;
ALTER TABLE operational_alerts ADD CONSTRAINT operational_alert_change_org_fk FOREIGN KEY(change_event_id,organization_id) REFERENCES change_events(id,organization_id) ON DELETE RESTRICT;
ALTER TABLE incidents ADD CONSTRAINT incidents_org_unique UNIQUE(id,organization_id);
ALTER TABLE incident_items DROP CONSTRAINT IF EXISTS incident_items_incident_id_fkey;
ALTER TABLE incident_items ADD CONSTRAINT incident_items_org_fk FOREIGN KEY(incident_id,organization_id) REFERENCES incidents(id,organization_id) ON DELETE CASCADE;
ALTER TABLE webhook_subscriptions ADD CONSTRAINT webhook_subscription_org_unique UNIQUE(id,organization_id);
ALTER TABLE webhook_outbox DROP CONSTRAINT IF EXISTS webhook_outbox_subscription_id_fkey;
ALTER TABLE webhook_outbox ADD CONSTRAINT webhook_outbox_org_fk FOREIGN KEY(subscription_id,organization_id) REFERENCES webhook_subscriptions(id,organization_id) ON DELETE CASCADE;
ALTER TABLE constellation_entities ADD CONSTRAINT constellation_entity_hash_hex CHECK(evidence_hash ~ '^[0-9a-f]{64}$');
ALTER TABLE constellation_relationships ADD CONSTRAINT constellation_relationship_hash_hex CHECK(evidence_hash ~ '^[0-9a-f]{64}$');
ALTER TABLE constellation_events ADD CONSTRAINT constellation_event_hash_hex CHECK(evidence_hash ~ '^[0-9a-f]{64}$');
ALTER TABLE change_events ADD CONSTRAINT change_event_hash_hex CHECK(evidence_hash ~ '^[0-9a-f]{64}$');
ALTER TABLE incident_items ADD CONSTRAINT incident_item_hash_hex CHECK(evidence_hash ~ '^[0-9a-f]{64}$');
