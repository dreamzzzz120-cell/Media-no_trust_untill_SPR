# Media AI flight recorder MVP

The existing Media upload and verification pipeline remains in place. This patch adds tenant-scoped AI identities, declared events, an append-only flight record and evidence ledger, a human-readable timeline, a source coverage view, and a signed action-result ingestion endpoint. The UI at `/ai.html` lets an organization key register an AI, report a declaration, inspect events, and see critical contradictions. It refreshes every five seconds while open.

## Authentication and boundaries

Use an organization-scoped key with `analyst` or `organization_admin` role to register and submit events. A viewer key can read the tenant's AI records. The global bootstrap key has no tenant and cannot use AI routes. Cross-tenant reads return 404. Submitted events are `DECLARED`; the API rejects client attempts to label them authoritative.

To enable action-result ingestion, set both `TRUSTED_ACTION_SOURCE` and a random `TRUSTED_ACTION_WEBHOOK_SECRET` of at least 32 characters. Provision the secret only to an independently instrumented gateway that reports its own execution results. The result endpoint is `POST /v1/integrations/action-confirmations`. It does not accept the normal tenant API key as a substitute for its signature.

The JSON request fields are `organizationId`, `aiId`, `claimEventId`, `outcome` (`CONFIRMED`, `FAILED`, `ABSENT`, or `UNREACHABLE`), `source`, `occurredAt` (ISO date with timezone), `evidenceHash` (lowercase SHA-256), and a unique `externalEventId`. Compute `x-media-signature` as lowercase HMAC-SHA256 using the connector secret over those eight field values joined with newline characters in that exact order. The configured source must match. A second submission of the same `(organizationId, source, externalEventId)` is rejected. The connector must authenticate and verify the external result before signing it; knowledge of this shared secret is an assertion of source authority.

A confirmed result adds a linked `VERIFIED` event. A failed or absent action adds a linked `CONFLICTING` event and a persisted `CRITICAL` alert. An unreachable source adds an `UNAVAILABLE` event without claiming failure. Existing events are never overwritten. `GET /v1/ai/:id/alerts` and `/coverage` are tenant-scoped. Alerts appear in the dashboard on its next refresh.

## Evidence and limitations

The ledger stores a hash reference for each event. Its source payload is not stored or independently fetched by Media; a signed connector report establishes that the configured connector asserted the outcome, not that Media performed a direct payment-provider query. The hash chain and SQL triggers make in-database changes detectable or reject them, but there is no external anchor or Merkle tree yet. `merkle_root_reference` is nullable and not populated. The coverage map explicitly reports missing provider, tool, and organization discovery connectors. Compliance is `HOLD`; no regulatory rule set is implemented. This MVP does not claim full AI discovery, complete activity history, legal compliance, or production monitoring.

`GET /v1/ai/:id/integrity` recomputes the internal event hashes, checks the append links, and checks each ledger hash reference. It reports `VALID_INTERNAL_CHAIN`, `BROKEN`, `EMPTY`, or `INCOMPLETE` with the event IDs that failed. It always states that no external anchor is configured. Internal chain integrity does not verify the truth of a source's account of an action.
The synchronous integrity check is capped at 10,000 events per request. Larger histories return `INCOMPLETE` unless a checked event is broken; they never report the entire history as valid without examining it. A background verification job is required for larger installations.

Timeline reads are paginated in ingestion order. `GET /v1/ai/:id/timeline?limit=100&afterSequence=0` returns `hasMore` and `nextCursor`; clients continue with that cursor until `hasMore` is false. Each event also includes its actual occurrence time, which may differ from ingestion order. The UI exposes a Load more control and never implies the first page is the entire history.

Apply `db/005_ai_flight_recorder.sql` through the repository migration command before deploying the new routes. The migration was executed locally in embedded PostgreSQL, with inserts, mutation rejection, and tenant foreign-key rejection checked. It has not been applied to production or run against a deployed PostgreSQL service. The authenticated gateway must be built or configured in the customer's environment before any event can be independently confirmed.

`/ready/ai` checks database access for the AI registry and event API only. `/ready` continues to require the malware scanner for media uploads. A healthy AI readiness response must never be represented as evidence that media scanning works. The event submission API rejects self-reported completion, failure, and approval-result types; those require the signed connector path.
