-- Align durable upload recovery states with the fail-closed scanner gate.
ALTER TABLE media_processing_runs DROP CONSTRAINT IF EXISTS media_processing_runs_stage_check;
ALTER TABLE media_processing_runs ADD CONSTRAINT media_processing_runs_stage_check CHECK (stage IN ('QUARANTINED','BLOCKED_UNVERIFIED','SCANNED_CLEAN','VERIFIED','PERSISTED','COMPLETED','FAILED'));
