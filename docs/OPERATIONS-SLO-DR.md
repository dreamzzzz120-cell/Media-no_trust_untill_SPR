# Constellation production SLO and recovery contract

## SLOs
- API availability: 99.9% over a rolling 30-day window.
- API latency: p95 <= 750 ms and p99 <= 2 s for non-upload API requests.
- Evidence ingestion success: >= 99.5% of accepted ingestion jobs reach a terminal persisted state without operator repair.
- M2M verification: >= 99.9% availability for verification decisions. Missing dependencies return UNKNOWN/retryable, never VERIFIED.
- Scanner availability: >= 99.5%. Scanner unavailability fails readiness and never means clean.

## Rate and resource boundaries
Authentication failures are limited independently from normal traffic. Upload, report/export, and graph-heavy operations use separate budgets. Tenant quotas must be enforced atomically in the persistence layer before expensive work begins; in-memory counters are not authoritative in multi-instance production.

Database clients have a bounded connection pool, connect timeout, statement timeout, and idle-in-transaction timeout. Long-running transactions are an incident signal and must be visible in database telemetry.

## Retention baseline
Default policy until a customer contract or legal requirement supersedes it: raw uploaded media is quarantined only for processing and deleted after verification; generated customer exports expire after 7 days; operational logs/telemetry retain 30 days with PII minimized; evidence and audit records retain 7 years unless a documented legal basis requires a different period. Legal hold overrides deletion. Immutable evidence is not destroyed by a privacy deletion request; redact/separate PII while retaining hashes and required audit proof.

## Recovery objectives
RPO: <= 24 hours for primary database data until continuous/PITR backup is independently verified. RTO: <= 4 hours for database/service restoration until a measured restore drill establishes a tighter value. These are engineering objectives, not claims that the provider backup configuration has been verified.

## Zero-downtime migration rules
Use expand -> deploy compatible code -> backfill -> switch reads/writes -> contract. Never deploy destructive schema changes before all running code is compatible. Every migration is checksum-locked, transactionally applied where PostgreSQL permits it, and protected by an advisory deployment lock. Rollback means application rollback plus a forward corrective migration; never silently edit an applied migration.

## Disaster recovery drill
1. Freeze writes or declare the source unavailable.
2. Restore the newest approved backup into an isolated database.
3. Apply only checksum-verified pending migrations.
4. Run schema-manifest verification, evidence-hash verification, and tenant-isolation/RLS tests.
5. Start the application against the isolated restore and verify /ready.
6. Exercise a tenant read, evidence lookup, report projection, and M2M verification.
7. Record actual RPO/RTO and immutable deployment/commit identifiers.
8. Promote only after all gates pass; otherwise remain degraded/UNKNOWN.

Provider backup schedule, encryption, retention, and an actual isolated restore remain runtime evidence gates and may not be inferred from code.
