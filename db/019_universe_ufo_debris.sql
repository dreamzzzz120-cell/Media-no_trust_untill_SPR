-- Universe event semantics.
-- UFO = directly observed activity/object whose identity or classification is not established.
-- SPACE_DEBRIS = identified artifact whose current owner or active purpose is not established.
-- Neither event is itself a risk or wrongdoing conclusion.
ALTER TABLE constellation_events DROP CONSTRAINT IF EXISTS constellation_events_event_type_check;
ALTER TABLE constellation_events ADD CONSTRAINT constellation_events_event_type_check
 CHECK(event_type IN ('SUPERNOVA','BLACK_HOLE','NEBULA','CHANGE','BOUNDARY','VISIBILITY_LOSS','UFO','SPACE_DEBRIS'));
