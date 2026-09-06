# Media Passport API

All `/v1/*` routes require `x-api-key` in production. API keys are stored as SHA-256 hashes and have a role and organization scope.

## Authentication / administration

`POST /v1/api-keys` — create a scoped API key. Requires organization admin or higher. The returned secret is shown once.

Roles: `viewer`, `creator`, `reviewer`, `moderator`, `analyst`, `organization_admin`, `platform_admin`, `super_admin`.

## Media

`POST /v1/media/verify` — multipart upload with field `file`. Optional headers: `x-declared-ai-use`, `x-creator-id`.

`GET /v1/media/:id` — complete Passport assessment.

`GET /v1/media/:id/evidence` — evidence observations and evidence quality.

`GET /v1/media/:id/provenance` — C2PA/provenance state.

`GET /v1/media/:id/trust` — Trust Vector, score, confidence and decision.

`GET /v1/media/:id/claims` — claim-analysis status. No claims are fabricated when no source-analysis provider is configured.

## Cases

`POST /v1/media/:id/appeal` — submit an appeal for human review.

`POST /v1/media/:id/report` — report impersonation, copyright, privacy, deception, spam or other concerns.

## Platform recommendation

`POST /v1/recommendation/evaluate` — evaluates a Passport against explicit trust/provenance/disclosure criteria and returns explainability data. This endpoint does not itself publish or suppress content.

## Public verification

`GET /public/:id` returns a privacy-minimized Passport representation. It never serves original media bytes.

`GET /passport/:id` renders a human-readable Passport page with trust vector, evidence and limitations.

## Health

- `GET /health` — liveness
- `GET /ready` — readiness
- `GET /docs` — OpenAPI UI

## Decision semantics

`PROMOTE` = candidate for preferential distribution; `TRUST` = trust threshold met; `REVIEW` = human/enhanced review required; `SUPPRESS` = do not recommend until relevant risk is resolved. `REMOVE` is intentionally not an automated Media Passport decision.
