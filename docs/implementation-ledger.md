# MEDIA implementation ledger
Governing rule: **IF MEDIA CANNOT OBSERVE IT, MEDIA DOES NOT CLAIM IT.**
A subsystem is not HARDENED/TESTED merely because code exists. CI and integration behavior are required.

| Phase | Subsystem | Status | Evidence / remaining gate |
|---|---|---|---|
| 0 | Repository truth audit | PARTIAL | Existing migrations/routes/tests inspected; ongoing as integration exposes defects. |
| 1 | Security + tenant foundation | PARTIAL | API-key roles and tenant checks exist; media DB query tenant filtering added; full DB/RLS-style audit remains. |
| 2 | Evidence kernel | PARTIAL | AI evidence ledger + hashes exist; canonical cross-domain claim→finding→evidence lineage is not yet complete. |
| 3 | AI Flight Recorder | TESTED | Existing append-only recorder, reconciliation, integrity and tenant tests. |
| 4 | AI Accountability Cost Ledger | PARTIAL | Append-only ledger/API/tests added; Postgres migration/integration CI gate pending. |
| 5 | AI Identity + Inventory | PARTIAL | Discovery/Shadow-AI schema and fail-closed domain tests added; collectors/API persistence incomplete. |
| 6 | AI Behavior | PARTIAL | Behavior signal schema/domain semantics exist; production derivation worker incomplete. |
| 7 | Boundary Engine | PARTIAL | Versioned deterministic evaluator foundation added; persistent store/API integration incomplete. |
| 8 | Policy Engine | PARTIAL | Same governance foundation; policy administration/review lifecycle incomplete. |
| 9 | Digital Media Intake | TESTED | Multipart intake, size/type validation, quarantine path and malware scanner dependency covered by tests. |
| 10 | Artifact Identity | PARTIAL | SHA-256 identity exists; broader fingerprint adapters incomplete. |
| 11 | Provenance | PARTIAL | C2PA path exists; trust/absence semantics require final regression. |
| 12 | Media Signals | PARTIAL | Evidence observations exist; provider coverage remains bounded. |
| 13 | Media Passport | TESTED | Publisher HTTP flow persists and retrieves passport/evidence with tenant tests. |
| 14 | Relationship Graph | PARTIAL | Existing media network + new Constellation relationships; unified lineage incomplete. |
| 15 | Constellation | PARTIAL | Persisted tenant topology/API/UI implemented; CI/integration gate in progress. |
| 16 | Evidence Wormholes | PARTIAL | Evidenced relationship type only; automated crossing derivation incomplete. |
| 17 | Evidence Black Holes | PARTIAL | Visibility-loss event primitive only; expectation-driven derivation incomplete. |
| 18 | Human-readable Timeline | TESTED | AI timeline behavior already covered; cross-domain timeline incomplete. |
| 19 | Point-in-time Reconstruction | PARTIAL | Constellation asOf reconstruction implemented/tested; knowledge-time semantics need DB integration test. |
| 20 | Incident Reconstruction | NOT BUILT | Requires cross-domain timeline + graph snapshot composition. |
| 21 | Continuous Observation | NOT BUILT | Production collectors/worker orchestration incomplete. |
| 22 | Change Detection | PARTIAL | Signal schema exists; durable derivation engine incomplete. |
| 23 | Alerts | PARTIAL | AI contradiction alerts exist; general alert routing incomplete. |
| 24 | Webhooks | PARTIAL | Trusted action confirmation exists; customer event webhooks incomplete. |
| 25 | M2M API | PARTIAL | API-key machine access exists; scoped API contract incomplete. |
| 26 | Compliance Evidence | NOT BUILT | Must map evidence/gaps without certification claims. |
| 27 | Audit Packages | NOT BUILT | Exportable evidence package not complete. |
| 28 | Reporting | NOT BUILT | Evidence-backed customer reports incomplete. |
| 29 | Customer Dashboard | PARTIAL | Constellation shell exists; full operational dashboard incomplete. |
| 30 | Onboarding | NOT BUILT | Production onboarding flow incomplete. |
| 31 | Billing Foundation | NOT BUILT | No completion claim. |
| 32 | Retention + Privacy | NOT BUILT | Policies/jobs/export-delete semantics incomplete. |
| 33 | Export | NOT BUILT | No complete evidence export package. |
| 34 | Observability | PARTIAL | health/ready endpoints exist; full metrics/tracing incomplete. |
| 35 | Security Hardening Gate | BLOCKED | Cannot pass until preceding surfaces are integrated and attacked. |
| 36 | Database Hardening | PARTIAL | Constraints/FKs/append-only triggers growing; migration integration test required. |
| 37 | Failure Testing | PARTIAL | Existing failure tests plus new adversarial unit tests; dependency matrix incomplete. |
| 38 | E2E Acceptance | BLOCKED | Requires remaining phases. |
| 39 | Regression | BLOCKED | Requires green CI after full integration. |
| 40 | Final Truth Audit | BLOCKED | Last gate only. |

## Locked completion rule
CODED + PERSISTED + TENANT-SCOPED + AUTHORIZED + VALIDATED + EVIDENCE-TRACEABLE + FAIL-CLOSED + ERROR-HANDLED + TESTED + ADVERSARIALLY TESTED + INTEGRATED + REGRESSION TESTED + OBSERVABLE + DOCUMENTED.
