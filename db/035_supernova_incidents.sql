-- Supernova linkage: incidents are declared only from evidenced trigger conditions.
CREATE TABLE universe_incident_triggers (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 trigger_key TEXT NOT NULL, name TEXT NOT NULL, condition JSONB NOT NULL,
 severity TEXT NOT NULL CHECK(severity IN ('INFO','LOW','MEDIUM','HIGH','CRITICAL')),
 evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id), UNIQUE(organization_id,trigger_key)
);
CREATE TABLE universe_supernovas (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL, trigger_id UUID NOT NULL, event_id UUID NOT NULL,
 actor_entity_id UUID, resource_id UUID, receipt_id UUID,
 trigger_state TEXT NOT NULL CHECK(trigger_state IN ('TRIGGERED','UNKNOWN')),
 impact_state TEXT NOT NULL CHECK(impact_state IN ('OBSERVED','CALCULATED','UNKNOWN')),
 summary TEXT NOT NULL, evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 occurred_at TIMESTAMPTZ NOT NULL, observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(id,organization_id),
 FOREIGN KEY(trigger_id,organization_id) REFERENCES universe_incident_triggers(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(event_id,organization_id) REFERENCES constellation_events(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(actor_entity_id,organization_id) REFERENCES constellation_entities(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(resource_id,organization_id) REFERENCES universe_resources(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(receipt_id,organization_id) REFERENCES universe_action_receipts(id,organization_id) ON DELETE RESTRICT,
 CHECK(observed_at>=occurred_at)
);
CREATE INDEX universe_supernova_time_idx ON universe_supernovas(organization_id,occurred_at DESC);
