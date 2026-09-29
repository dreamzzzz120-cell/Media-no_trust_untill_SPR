-- Commercial Exploration: evidence-backed prospecting and outreach accountability.
CREATE TABLE commercial_accounts (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 name TEXT NOT NULL, domain TEXT, industry TEXT, jurisdiction TEXT,
 evidence_state TEXT NOT NULL CHECK(evidence_state IN ('OBSERVED','VERIFIED','DECLARED','UNKNOWN','STALE','CONFLICTING','UNAVAILABLE')),
 evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(), metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(id,organization_id)
);
CREATE TABLE commercial_signals (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL, account_id UUID NOT NULL,
 signal_type TEXT NOT NULL, claim TEXT NOT NULL,
 claim_state TEXT NOT NULL CHECK(claim_state IN ('OBSERVED','VERIFIED','INFERRED','UNKNOWN','CONFLICTING')),
 evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id), FOREIGN KEY(account_id,organization_id) REFERENCES commercial_accounts(id,organization_id) ON DELETE RESTRICT
);
CREATE TABLE commercial_contact_boundaries (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL, account_id UUID,
 channel TEXT NOT NULL, destination_digest CHAR(64) NOT NULL CHECK(destination_digest ~ '^[0-9a-f]{64}$'),
 state TEXT NOT NULL CHECK(state IN ('ALLOWED','SUPPRESSED','OPTED_OUT','BOUNCED','UNKNOWN')),
 jurisdiction TEXT, basis TEXT NOT NULL, evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'),
 source TEXT NOT NULL, observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id), FOREIGN KEY(account_id,organization_id) REFERENCES commercial_accounts(id,organization_id) ON DELETE RESTRICT
);
CREATE TABLE commercial_opportunities (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL, account_id UUID NOT NULL,
 stage TEXT NOT NULL CHECK(stage IN ('DISCOVERED','QUALIFIED','OUTREACH','ENGAGED','MEETING','PROPOSAL','CUSTOMER','LOST','UNKNOWN')),
 fit_basis JSONB NOT NULL DEFAULT '[]'::jsonb, value_state TEXT NOT NULL CHECK(value_state IN ('OBSERVED','CALCULATED','ESTIMATED','UNKNOWN')),
 value_amount NUMERIC, currency TEXT, evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id), FOREIGN KEY(account_id,organization_id) REFERENCES commercial_accounts(id,organization_id) ON DELETE RESTRICT,
 CHECK((value_state='UNKNOWN' AND value_amount IS NULL) OR value_state<>'UNKNOWN')
);
CREATE TABLE commercial_outreach_receipts (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL, account_id UUID NOT NULL, work_order_id UUID NOT NULL,
 actor_entity_id UUID NOT NULL, boundary_id UUID NOT NULL, channel TEXT NOT NULL,
 outcome TEXT NOT NULL CHECK(outcome IN ('ATTEMPTED','DELIVERED','FAILED','BOUNCED','REPLIED','UNKNOWN')),
 content_digest CHAR(64) NOT NULL CHECK(content_digest ~ '^[0-9a-f]{64}$'),
 evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 occurred_at TIMESTAMPTZ NOT NULL, observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(id,organization_id),
 FOREIGN KEY(account_id,organization_id) REFERENCES commercial_accounts(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(work_order_id,organization_id) REFERENCES astronomical_corps_work_orders(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(actor_entity_id,organization_id) REFERENCES constellation_entities(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(boundary_id,organization_id) REFERENCES commercial_contact_boundaries(id,organization_id) ON DELETE RESTRICT,
 CHECK(observed_at>=occurred_at)
);
CREATE INDEX commercial_accounts_domain_idx ON commercial_accounts(organization_id,domain);
CREATE INDEX commercial_outreach_time_idx ON commercial_outreach_receipts(organization_id,occurred_at DESC);
CREATE OR REPLACE FUNCTION reject_commercial_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'commercial evidence is append-only'; END $$;
CREATE TRIGGER commercial_signals_immutable BEFORE UPDATE OR DELETE ON commercial_signals FOR EACH ROW EXECUTE FUNCTION reject_commercial_history_mutation();
CREATE TRIGGER commercial_contact_boundaries_immutable BEFORE UPDATE OR DELETE ON commercial_contact_boundaries FOR EACH ROW EXECUTE FUNCTION reject_commercial_history_mutation();
CREATE TRIGGER commercial_outreach_receipts_immutable BEFORE UPDATE OR DELETE ON commercial_outreach_receipts FOR EACH ROW EXECUTE FUNCTION reject_commercial_history_mutation();
