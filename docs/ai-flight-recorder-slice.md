# AI activity slice

This release adds tenant-scoped registration and an append-only event log. It does not discover AI, connect to providers, verify source evidence, monitor live activity, or determine legal compliance.

Use an organization-scoped API key with the `analyst` or `organization_admin` role. The bootstrap key has no tenant and cannot access these routes.

- `POST /v1/ai` — register a system with `name`, `purpose`, and optional `owner`, `provider`, `model`.
- `GET /v1/ai/:id` — identity, event count, and explicit monitoring/compliance state.
- `POST /v1/ai/:id/events` — submit `eventType`, `sourceType: "DECLARATION"`, `source`, `summary`, RFC3339 `occurredAt`, and lowercase SHA-256 `evidenceHash`.
- `GET /v1/ai/:id/timeline` — human-readable statements with evidence hash references.
- `/ai.html` — minimal authenticated timeline viewer. The key stays in the page input and is not stored by the application.

The event hash chains submitted records, and the database rejects updates and deletes. The supplied evidence hash is a reference only: Media has not fetched or verified the underlying evidence. External API callers cannot assert an authoritative source. Event summaries are submitted text and may be inaccurate. The compliance result is HOLD because no reviewed regulatory rules or controls are encoded. The dashboard does not imply continuous monitoring.

Apply migration `005_ai_flight_recorder.sql` with the existing migration command before serving the new endpoints. Production DB behavior and migration have not been exercised without a database connection. Future work requires trusted connector ingestion, independent evidence verification, secure retained evidence, rule versioning, assessment logic, and live monitoring.
