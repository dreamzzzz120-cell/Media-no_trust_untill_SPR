# API

## `POST /v1/media/verify`

Authenticated with `x-api-key` when API-key enforcement is enabled. Accepts exactly one multipart file named `file`.

Returns a Media Passport record containing:

- SHA-256 fingerprint
- detected MIME type and media kind
- C2PA provenance state
- evidence observations
- conservative verdict
- distribution action
- verification limitations

## `GET /public/:id`

Returns a public, privacy-minimized verification representation. It does not return the original media bytes.

## Health

- `GET /health` — liveness
- `GET /ready` — readiness
- `/docs` — OpenAPI UI

## Distribution semantics

`ALLOW` means the configured evidence supports the policy. `LABEL` means content should be visibly identified. `REVIEW` means automated publication should wait for review. `BLOCK` means automated distribution should be denied.
