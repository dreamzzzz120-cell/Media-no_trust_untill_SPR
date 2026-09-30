CREATE TABLE IF NOT EXISTS m2m_trust_nonces(
 id uuid PRIMARY KEY, organization_id text NOT NULL, issuer_machine_id uuid NOT NULL, nonce text NOT NULL,
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,issuer_machine_id,nonce),
 CHECK(length(nonce)>=16)
);
CREATE INDEX IF NOT EXISTS m2m_trust_nonces_expiry_idx ON m2m_trust_nonces(expires_at);

CREATE TABLE IF NOT EXISTS m2m_trust_grants(
 id uuid PRIMARY KEY, organization_id text NOT NULL, envelope_digest text NOT NULL, issuer_machine_id uuid NOT NULL,
 subject_machine_id uuid NOT NULL, subject_passport_id text NOT NULL, requested_action text NOT NULL,
 authority_evaluation_id uuid NOT NULL, authority_decision text NOT NULL, trust_decision text NOT NULL,
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
 UNIQUE(organization_id,envelope_digest),
 CHECK(envelope_digest ~ '^[0-9a-f]{64}$'),
 CHECK(authority_decision IN('AUTHORIZED','NOT_AUTHORIZED','UNKNOWN')),
 CHECK(trust_decision IN('VERIFIED','PARTIAL','UNKNOWN','DENIED','REVOKED','EXPIRED')),
 CHECK(completed_at IS NULL OR completed_at>=created_at)
);
CREATE INDEX IF NOT EXISTS m2m_trust_grants_subject_idx ON m2m_trust_grants(organization_id,subject_passport_id,created_at DESC);

CREATE TABLE IF NOT EXISTS m2m_trust_receipts(
 id uuid PRIMARY KEY, organization_id text NOT NULL, grant_id uuid NOT NULL REFERENCES m2m_trust_grants(id) ON DELETE RESTRICT,
 execution_outcome text NOT NULL, evidence_digest text, receipt_digest text NOT NULL, observed_at timestamptz NOT NULL,
 spr_receipt_id text, spr_ack_digest text, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,grant_id),
 CHECK(execution_outcome IN('OBSERVED_SUCCEEDED','OBSERVED_FAILED','DENIED_NOT_EXECUTED','UNKNOWN')),
 CHECK(evidence_digest IS NULL OR evidence_digest ~ '^[0-9a-f]{64}$'),
 CHECK(receipt_digest ~ '^[0-9a-f]{64}$'),
 CHECK(spr_ack_digest IS NULL OR spr_ack_digest ~ '^[0-9a-f]{64}$')
);
