-- Commercial lifecycle after outreach: replies, meetings, proposals, contracts, onboarding and renewals.
CREATE TABLE commercial_responses (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL, account_id UUID NOT NULL, outreach_receipt_id UUID,
 response_type TEXT NOT NULL CHECK(response_type IN ('INTERESTED','QUESTION','OBJECTION','REFERRAL','NOT_NOW','OPT_OUT','OTHER','UNKNOWN')),
 classification_state TEXT NOT NULL CHECK(classification_state IN ('OBSERVED','CALCULATED','INFERRED','UNKNOWN')),
 content_digest CHAR(64) NOT NULL CHECK(content_digest ~ '^[0-9a-f]{64}$'), evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'),
 source TEXT NOT NULL, occurred_at TIMESTAMPTZ NOT NULL, observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(id,organization_id),
 FOREIGN KEY(account_id,organization_id) REFERENCES commercial_accounts(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(outreach_receipt_id,organization_id) REFERENCES commercial_outreach_receipts(id,organization_id) ON DELETE RESTRICT,
 CHECK(observed_at>=occurred_at)
);
CREATE TABLE commercial_engagements (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL, account_id UUID NOT NULL, opportunity_id UUID,
 engagement_type TEXT NOT NULL CHECK(engagement_type IN ('MEETING','DEMO','PROPOSAL','CONTRACT','ONBOARDING','RENEWAL','EXPANSION')),
 status TEXT NOT NULL CHECK(status IN ('PLANNED','OBSERVED_COMPLETED','OBSERVED_CANCELLED','FAILED','UNKNOWN')),
 starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ, evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'),
 source TEXT NOT NULL, observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(), metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(id,organization_id),
 FOREIGN KEY(account_id,organization_id) REFERENCES commercial_accounts(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(opportunity_id,organization_id) REFERENCES commercial_opportunities(id,organization_id) ON DELETE RESTRICT,
 CHECK(ends_at IS NULL OR starts_at IS NULL OR ends_at>=starts_at)
);
CREATE TABLE commercial_contract_obligations (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL, engagement_id UUID NOT NULL,
 obligation_key TEXT NOT NULL, obligation_text TEXT NOT NULL, responsible_party TEXT NOT NULL,
 due_at TIMESTAMPTZ, state TEXT NOT NULL CHECK(state IN ('OBSERVED','DECLARED','SUPPORTED','PARTIAL','UNSUPPORTED','UNKNOWN')),
 evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id), UNIQUE(engagement_id,obligation_key),
 FOREIGN KEY(engagement_id,organization_id) REFERENCES commercial_engagements(id,organization_id) ON DELETE RESTRICT
);
CREATE TABLE commercial_customer_checkpoints (
 id UUID PRIMARY KEY, organization_id TEXT NOT NULL, account_id UUID NOT NULL,
 checkpoint_type TEXT NOT NULL CHECK(checkpoint_type IN ('ONBOARDING','ADOPTION','DELIVERY','ISSUE','RENEWAL','EXPANSION')),
 state TEXT NOT NULL CHECK(state IN ('SUPPORTED','PARTIAL','UNSUPPORTED','UNKNOWN','CONFLICTING')),
 summary TEXT NOT NULL, evidence_hash CHAR(64) NOT NULL CHECK(evidence_hash ~ '^[0-9a-f]{64}$'), source TEXT NOT NULL,
 observed_at TIMESTAMPTZ NOT NULL, known_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id), FOREIGN KEY(account_id,organization_id) REFERENCES commercial_accounts(id,organization_id) ON DELETE RESTRICT
);
CREATE INDEX commercial_response_account_time_idx ON commercial_responses(organization_id,account_id,occurred_at DESC);
CREATE INDEX commercial_engagement_account_time_idx ON commercial_engagements(organization_id,account_id,observed_at DESC);
CREATE TRIGGER commercial_responses_immutable BEFORE UPDATE OR DELETE ON commercial_responses FOR EACH ROW EXECUTE FUNCTION reject_commercial_history_mutation();
CREATE TRIGGER commercial_contract_obligations_immutable BEFORE UPDATE OR DELETE ON commercial_contract_obligations FOR EACH ROW EXECUTE FUNCTION reject_commercial_history_mutation();
CREATE TRIGGER commercial_customer_checkpoints_immutable BEFORE UPDATE OR DELETE ON commercial_customer_checkpoints FOR EACH ROW EXECUTE FUNCTION reject_commercial_history_mutation();
