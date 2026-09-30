# Media Passport API

All `/v1/*` routes require `x-api-key` in production. API keys are stored as SHA-256 hashes and have a role and organization scope.

## Authentication / administration

`POST /v1/organizations` — create a publisher organization. Requires platform admin or super admin. Save the returned ID for key creation.

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

`GET /public/:id` is closed (`404`) until durable, tenant-authorized publication state exists.

`GET /passport/:id` is closed (`404`) until durable, tenant-authorized publication state exists.

## Health

- `GET /health` — liveness
- `GET /ready` — readiness
- `GET /docs` — OpenAPI UI

## Decision semantics

`PROMOTE` = candidate for preferential distribution; `TRUST` = trust threshold met; `REVIEW` = human/enhanced review required; `SUPPRESS` = do not recommend until relevant risk is resolved. `REMOVE` is intentionally not an automated Media Passport decision.

## Publisher integration (one upload, one result)

Create an organization-scoped `creator` or `organization_admin` API key. Keep it on the publisher's server; do not put it in a browser bundle. In the publisher's existing upload workflow, send the uploaded media bytes to `POST /v1/publisher/verify` as multipart field `file`. This route requires an organization-scoped key and returns `201` with `passportId`, the exact-file SHA-256, decision, confidence, AI status, provenance, evidence, limitations, and a tenant-scoped private result URL. Keep publishing decisions in the publisher's own workflow; an `UNVERIFIED` result is not proof of human origin.

```sh
curl --fail-with-body -X POST "$MEDIA_PASSPORT_URL/v1/publisher/verify" \
  -H "x-api-key: $MEDIA_PASSPORT_API_KEY" \
  -H 'x-declared-ai-use: UNKNOWN' \
  -F 'file=@./upload.mp4;type=video/mp4'
```

The publisher may retrieve its private result with `GET /v1/media/:id` using the same tenant key Private result endpoints return `404` for records belonging to another organization. Public passport URLs are disabled until publication authorization and durable sharing state exist. A malware or validation failure does not create a passport; handle `422`, `413`, `415`, and `503` as failed intake or retry as appropriate. Production requires PostgreSQL, the scanner, and configured storage controls before this flow can operate.
