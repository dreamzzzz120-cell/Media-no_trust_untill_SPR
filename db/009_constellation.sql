CREATE TABLE constellation_nodes (
 id UUID PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 node_type TEXT NOT NULL CHECK (node_type IN ('AI','MODEL','TOOL','API','DATABASE','HUMAN','OBSERVER','POLICY','DEPLOYMENT','EVIDENCE_SOURCE','UNKNOWN')),
 label TEXT NOT NULL,
 evidence_state TEXT NOT NULL CHECK (evidence_state IN ('OBSERVED','VERIFIED','DECLARED','UNKNOWN','STALE','CONFLICTING','UNAVAILABLE')),
 ai_identity_id UUID,
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 first_observed_at TIMESTAMPTZ NOT NULL,
 last_observed_at TIMESTAMPTZ NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id),
 FOREIGN KEY (ai_identity_id,organization_id) REFERENCES ai_identities(id,organization_id)
);
CREATE TABLE constellation_edges (
 id UUID PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 from_node_id UUID NOT NULL,
 to_node_id UUID NOT NULL,
 relation_type TEXT NOT NULL,
 phenomenon TEXT NOT NULL CHECK (phenomenon IN ('CONNECTION','ORBIT','WORMHOLE','GRAVITY','DESCENDANT','TRANSIENT')),
 evidence_state TEXT NOT NULL CHECK (evidence_state IN ('OBSERVED','VERIFIED','DECLARED','UNKNOWN','STALE','CONFLICTING','UNAVAILABLE')),
 evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
 first_observed_at TIMESTAMPTZ NOT NULL,
 last_observed_at TIMESTAMPTZ NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id),
 FOREIGN KEY (from_node_id,organization_id) REFERENCES constellation_nodes(id,organization_id),
 FOREIGN KEY (to_node_id,organization_id) REFERENCES constellation_nodes(id,organization_id)
);
CREATE TABLE constellation_visibility_gaps (
 id UUID PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 node_id UUID,
 gap_type TEXT NOT NULL CHECK (gap_type IN ('BLACK_HOLE','NEBULA')),
 reason TEXT NOT NULL,
 evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
 observed_at TIMESTAMPTZ NOT NULL,
 resolved_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 FOREIGN KEY (node_id,organization_id) REFERENCES constellation_nodes(id,organization_id)
);
CREATE INDEX constellation_nodes_time_idx ON constellation_nodes(organization_id,last_observed_at DESC);
CREATE INDEX constellation_edges_time_idx ON constellation_edges(organization_id,last_observed_at DESC);
CREATE INDEX constellation_gaps_time_idx ON constellation_visibility_gaps(organization_id,observed_at DESC);
