-- Bind enforcement outcomes to the authority decision they claim to enforce.
CREATE OR REPLACE FUNCTION enforce_action_attempt_consistency() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE e_decision TEXT; e_actor UUID; e_action TEXT;
BEGIN
 SELECT decision,actor_entity_id,action_type INTO e_decision,e_actor,e_action
 FROM universe_authority_evaluations WHERE id=NEW.authority_evaluation_id AND organization_id=NEW.organization_id;
 IF e_decision IS NULL THEN RAISE EXCEPTION 'authority evaluation not established'; END IF;
 IF e_actor<>NEW.actor_entity_id OR e_action<>NEW.action_type THEN RAISE EXCEPTION 'action attempt does not match authority evaluation'; END IF;
 IF NEW.enforcement_outcome='ALLOWED' AND e_decision<>'AUTHORIZED' THEN RAISE EXCEPTION 'only AUTHORIZED evaluations may be allowed'; END IF;
 IF NEW.enforcement_outcome='BLOCKED' AND e_decision='AUTHORIZED' THEN RAISE EXCEPTION 'authorized evaluation cannot be recorded as authority-blocked'; END IF;
 IF e_decision='UNKNOWN' AND NEW.enforcement_outcome NOT IN ('UNKNOWN','NOT_ATTEMPTED') THEN RAISE EXCEPTION 'unknown authority must fail closed'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER universe_action_attempt_consistency BEFORE INSERT ON universe_action_attempts FOR EACH ROW EXECUTE FUNCTION enforce_action_attempt_consistency();

-- A receipt that says authority was established must be backed by an AUTHORIZED evaluation.
ALTER TABLE universe_action_receipts ADD COLUMN authority_evaluation_id UUID;
ALTER TABLE universe_action_receipts ADD CONSTRAINT universe_receipt_authority_eval_fk
 FOREIGN KEY(authority_evaluation_id,organization_id) REFERENCES universe_authority_evaluations(id,organization_id) ON DELETE RESTRICT;
ALTER TABLE universe_action_receipts ADD CONSTRAINT universe_receipt_authority_binding
 CHECK(authority_state<>'ESTABLISHED' OR authority_evaluation_id IS NOT NULL);
