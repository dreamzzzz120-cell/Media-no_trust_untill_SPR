-- Database integrity hardening: make tenant, digest, chronology and canonical-evidence invariants database-owned.

-- Reusable SHA-256 shape checks across evidence-bearing tables.
ALTER TABLE evidence_sources ADD CONSTRAINT evidence_sources_configuration_digest_hex CHECK(configuration_digest IS NULL OR configuration_digest ~ '^[0-9a-f]{64}$');
ALTER TABLE canonical_observations ADD CONSTRAINT canonical_observations_content_digest_hex CHECK(content_digest ~ '^[0-9a-f]{64}$');
ALTER TABLE canonical_evidence ADD CONSTRAINT canonical_evidence_digest_hex CHECK(digest ~ '^[0-9a-f]{64}$');
ALTER TABLE ai_accountability_entries ADD CONSTRAINT ai_accountability_evidence_hash_hex CHECK(evidence_hash ~ '^[0-9a-f]{64}$');
ALTER TABLE ai_discovery_observations ADD CONSTRAINT ai_discovery_evidence_hash_hex CHECK(evidence_hash ~ '^[0-9a-f]{64}$');
ALTER TABLE ai_behavior_signals ADD CONSTRAINT ai_behavior_evidence_hash_hex CHECK(evidence_hash ~ '^[0-9a-f]{64}$');
ALTER TABLE media_verification_history ADD CONSTRAINT media_verification_history_record_hash_hex CHECK(record_hash ~ '^[0-9a-f]{64}$');
ALTER TABLE billing_events ADD CONSTRAINT billing_events_evidence_hash_hex CHECK(evidence_hash ~ '^[0-9a-f]{64}$');
ALTER TABLE billing_accounts ADD CONSTRAINT billing_accounts_evidence_hash_hex CHECK(last_evidence_hash IS NULL OR last_evidence_hash ~ '^[0-9a-f]{64}$');
ALTER TABLE billing_webhook_receipts ADD CONSTRAINT billing_receipt_payload_hash_hex CHECK(payload_hash ~ '^[0-9a-f]{64}$');
ALTER TABLE onboarding_state ADD CONSTRAINT onboarding_completion_hash_hex CHECK(completion_evidence_hash IS NULL OR completion_evidence_hash ~ '^[0-9a-f]{64}$');
ALTER TABLE webhook_outbox ADD CONSTRAINT webhook_outbox_payload_hash_hex CHECK(payload_hash ~ '^[0-9a-f]{64}$');
ALTER TABLE audit_packages ADD CONSTRAINT audit_package_manifest_hash_hex CHECK(manifest_hash ~ '^[0-9a-f]{64}$');
ALTER TABLE customer_reports ADD CONSTRAINT customer_report_content_hash_hex CHECK(content_hash ~ '^[0-9a-f]{64}$');
ALTER TABLE export_jobs ADD CONSTRAINT export_manifest_hash_hex CHECK(manifest_hash IS NULL OR manifest_hash ~ '^[0-9a-f]{64}$');
ALTER TABLE enforcement_attempts ADD CONSTRAINT enforcement_evidence_hash_hex CHECK(evidence_hash IS NULL OR evidence_hash ~ '^[0-9a-f]{64}$');

-- Chronology cannot be made true only by application code.
ALTER TABLE canonical_observations ADD CONSTRAINT canonical_observation_time_order CHECK(collected_at>=observed_at AND ingested_at>=collected_at);
ALTER TABLE constellation_entities ADD CONSTRAINT constellation_entity_time_order CHECK(last_observed_at>=first_observed_at AND known_at>=last_observed_at);
ALTER TABLE constellation_relationships ADD CONSTRAINT constellation_relationship_time_order CHECK((ended_at IS NULL OR ended_at>=observed_at) AND known_at>=observed_at);
ALTER TABLE constellation_events ADD CONSTRAINT constellation_event_time_order CHECK(known_at>=occurred_at);
ALTER TABLE ai_behavior_signals ADD CONSTRAINT ai_behavior_baseline_time_order CHECK((baseline_from IS NULL AND baseline_to IS NULL) OR (baseline_from IS NOT NULL AND baseline_to IS NOT NULL AND baseline_to>=baseline_from AND observed_at>=baseline_to));
ALTER TABLE observation_cursors ADD CONSTRAINT observation_cursor_time_order CHECK(last_success_at IS NULL OR last_success_at<=last_attempt_at);
ALTER TABLE operational_alerts ADD CONSTRAINT operational_alert_time_order CHECK((acknowledged_at IS NULL OR acknowledged_at>=created_at) AND (resolved_at IS NULL OR resolved_at>=created_at) AND (resolved_at IS NULL OR acknowledged_at IS NULL OR resolved_at>=acknowledged_at));
ALTER TABLE incidents ADD CONSTRAINT incident_time_order CHECK(closed_at IS NULL OR closed_at>=opened_at);
ALTER TABLE compliance_controls ADD CONSTRAINT compliance_control_time_order CHECK(retired_at IS NULL OR retired_at>effective_at);
ALTER TABLE deletion_requests ADD CONSTRAINT deletion_request_time_order CHECK(completed_at IS NULL OR completed_at>=requested_at);
ALTER TABLE export_jobs ADD CONSTRAINT export_job_time_order CHECK(completed_at IS NULL OR completed_at>=created_at);
ALTER TABLE webhook_outbox ADD CONSTRAINT webhook_outbox_time_order CHECK((last_attempt_at IS NULL OR last_attempt_at>=created_at) AND (delivered_at IS NULL OR delivered_at>=created_at));
ALTER TABLE enforcement_attempts ADD CONSTRAINT enforcement_attempt_time_order CHECK(completed_at IS NULL OR completed_at>=attempted_at);
ALTER TABLE billing_accounts ADD CONSTRAINT billing_account_time_order CHECK(observed_at IS NULL OR updated_at>=observed_at);
ALTER TABLE billing_webhook_receipts ADD CONSTRAINT billing_receipt_time_order CHECK(processed_at IS NULL OR processed_at>=received_at);

-- Tenant-composite ownership: referenced rows must belong to the same tenant.
ALTER TABLE governance_evaluations ADD CONSTRAINT governance_evaluations_org_unique UNIQUE(id,organization_id);
ALTER TABLE enforcement_attempts ADD CONSTRAINT enforcement_policy_eval_org_fk FOREIGN KEY(policy_evaluation_id,organization_id) REFERENCES governance_evaluations(id,organization_id) ON DELETE RESTRICT;

ALTER TABLE media_assets ADD CONSTRAINT media_assets_org_unique UNIQUE(id,organization_id);
ALTER TABLE media_verification_history DROP CONSTRAINT IF EXISTS media_verification_history_asset_id_fkey;
ALTER TABLE media_verification_history ADD CONSTRAINT media_verification_history_asset_org_fk FOREIGN KEY(asset_id,organization_id) REFERENCES media_assets(id,organization_id) ON DELETE CASCADE;

-- Canonical evidence must have an internally consistent validation state.
ALTER TABLE canonical_evidence ADD CONSTRAINT canonical_evidence_reference_semantics CHECK(
 (validation_state IN('VERIFIED','OBSERVED','DECLARED') AND (content_reference IS NOT NULL OR jsonb_typeof(provenance)='object'))
 OR validation_state IN('UNKNOWN','STALE','CONFLICTING','UNAVAILABLE')
);
ALTER TABLE finding_evidence ADD CONSTRAINT finding_evidence_no_nil_ids CHECK(finding_id<>'00000000-0000-0000-0000-000000000000'::uuid AND evidence_id<>'00000000-0000-0000-0000-000000000000'::uuid);

-- Billing/onboarding completion is evidence-backed at rest.
ALTER TABLE onboarding_state ADD CONSTRAINT onboarding_ready_requires_evidence CHECK(status<>'READY' OR (completed_at IS NOT NULL AND completion_evidence_hash IS NOT NULL));
ALTER TABLE onboarding_state ADD CONSTRAINT onboarding_nonready_no_completion CHECK(status='READY' OR completed_at IS NULL);
ALTER TABLE billing_accounts ADD CONSTRAINT billing_active_requires_evidence CHECK(
 (status<>'ACTIVE' AND subscription_status<>'ACTIVE') OR
 (last_external_event_id IS NOT NULL AND btrim(last_external_event_id)<>'' AND last_evidence_hash IS NOT NULL AND observed_at IS NOT NULL)
);
ALTER TABLE billing_webhook_receipts ADD CONSTRAINT billing_receipt_processed_semantics CHECK(
 (processing_status='RECEIVED' AND processed_at IS NULL) OR
 (processing_status IN('PROCESSED','IGNORED','FAILED') AND processed_at IS NOT NULL)
);

-- Evidence JSON arrays must actually be arrays when the schema calls them arrays.
ALTER TABLE governance_evaluations ADD CONSTRAINT governance_evidence_hashes_array CHECK(jsonb_typeof(evidence_hashes)='array');
ALTER TABLE compliance_evaluations ADD CONSTRAINT compliance_evidence_hashes_array CHECK(jsonb_typeof(evidence_hashes)='array');
ALTER TABLE onboarding_state ADD CONSTRAINT onboarding_steps_object CHECK(jsonb_typeof(steps)='object');
ALTER TABLE onboarding_state ADD CONSTRAINT onboarding_blockers_array CHECK(jsonb_typeof(blockers)='array');

-- Query paths used for evidence lineage, receipts and tenant timelines.
CREATE INDEX IF NOT EXISTS canonical_evidence_tenant_observation_idx ON canonical_evidence(organization_id,observation_id,created_at DESC,id);
CREATE INDEX IF NOT EXISTS finding_evidence_evidence_idx ON finding_evidence(organization_id,evidence_id,finding_id);
CREATE INDEX IF NOT EXISTS claim_evaluations_finding_idx ON claim_evaluations(organization_id,finding_id,evaluated_at DESC) WHERE finding_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS billing_receipts_provider_time_idx ON billing_webhook_receipts(provider,received_at DESC,external_event_id);
CREATE INDEX IF NOT EXISTS billing_accounts_status_idx ON billing_accounts(status,subscription_status,updated_at DESC);
CREATE INDEX IF NOT EXISTS enforcement_attempts_evidence_idx ON enforcement_attempts(organization_id,evidence_id) WHERE evidence_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS incident_items_item_lookup_idx ON incident_items(organization_id,item_type,item_id,occurred_at DESC);
CREATE INDEX IF NOT EXISTS operational_alert_change_idx ON operational_alerts(organization_id,change_event_id) WHERE change_event_id IS NOT NULL;
