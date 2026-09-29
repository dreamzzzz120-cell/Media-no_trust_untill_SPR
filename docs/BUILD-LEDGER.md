# Media build ledger

Source of truth: the sequential build and harden command. A passing unit suite does not certify a phase. Status is based on demonstrated behavior in this repository, not route existence.

## Repository audit (2026-09-29 UTC)

- Runtime: TypeScript, Node 22, Fastify 5, PostgreSQL via `postgres`, SQL migrations `db/001` through `005`, Vite-free static browser UI, Vitest, Docker and GitHub Actions.
- Local check: `npm ci --ignore-scripts`, lint, typecheck, 41 tests in 15 files, and build pass under Node 24.19.0. This is outside the declared Node >=22.22 <23 engine; repeat on Node 22 before locking.
- HTTP tests use an in-memory store and local scanner stub. PostgreSQL migrations and transactions, production deployment, backup/restore, and scanner behavior are not demonstrated by that suite.
- Production config requires database, key, malware scanner, and source deletion. No live infrastructure or credentials were inspected.

| Capability | Status | Evidence and tests | Security status and limitations | Next action |
| --- | --- | --- | --- | --- |
| API key and tenant foundation | PARTIAL | `src/db.ts`, `src/tenant.ts`, `tests/api-keys.test.ts`, `tests/publisher-http.test.ts` | Scoped private reads; public passport access closed pending publication consent. No users, memberships, key revocation API, durable audit events, or PostgreSQL cross-tenant test. | Implement and test durable auth/audit model, real DB tenant adversarial suite. |
| Media intake and evidence | PARTIAL | `src/storage.ts`, `src/verification`, `src/db.ts`, upload HTTP test | Scanner required; result stored transactionally in production. `save` updates current record and appends related rows; historical reproducibility and canonical lineage are unproven. | Build immutable evidence kernel with deterministic digests and snapshot reconstruction. |
| AI inventory and flight recorder | PARTIAL | `src/ai.ts`, `db/005_ai_flight_recorder.sql`, AI HTTP/unit tests | Submissions are declarations; trusted confirmation has HMAC. No complete model/tool coverage or real connector acceptance test. | Finish source verification, causality and event coverage after kernel lock. |
| AI cost and rework ledger | NOT BUILT | No cost ledger implementation | No defensible attribution or measured labor time | Build from persisted events after flight recorder lock. |
| Cases and public passports | BLOCKED | Routes return 503/404; regression test | Prior 202 responses did not persist cases; public routes exposed tenant-owned data to URL holders. Both are closed. | Add durable case workflow and explicit tenant-authorized sharing state before reopening. |
| Policy, graph, investigation, compliance, billing, reporting | NOT BUILT | No end-to-end demonstration for requested contracts | Do not advertise as complete | Follow ordered phase gates. |
| Production readiness | BLOCKED | Local checks only | Node engine mismatch; no live DB migration, restore, adversarial or deployed acceptance proof | Run production-equivalent gates and external dependency drills. |

## Lock gate

No phase is locked yet. Each needs implementation, migration, successful and adversarial tests on the real persistence path, integration regression, observability, and contract documentation. Record the exact commit and test evidence when a phase is locked.
