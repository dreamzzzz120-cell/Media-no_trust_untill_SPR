-- Universe semantics: Gravity is evidenced dependency concentration; Oxygen is an evidenced operational dependency.
-- These labels never imply risk, criticality, or failure without supporting observations.
ALTER TABLE constellation_relationships DROP CONSTRAINT IF EXISTS constellation_relationships_relationship_type_check;
ALTER TABLE constellation_relationships ADD CONSTRAINT constellation_relationships_relationship_type_check
 CHECK(relationship_type IN ('ORBIT','CLUSTER','WORMHOLE','DEPENDENCY','INTERACTION','PROVENANCE','OBSERVATION','POLICY_APPLIES','TRANSIENT','GRAVITY','OXYGEN'));
