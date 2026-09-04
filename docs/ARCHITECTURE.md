# Architecture

## Boundary

Media Passport is a separate service. It must not import, mutate, or depend on the production SPR application database.

## Verification pipeline

1. Receive an image/video upload.
2. Enforce upload limits and MIME/container validation.
3. Compute SHA-256 fingerprint.
4. Extract available metadata without treating metadata alone as proof.
5. Validate C2PA/Content Credentials when present.
6. Run supported synthetic-media and manipulation signals.
7. Normalize provider observations into an evidence ledger.
8. Resolve observations into a conservative verdict.
9. Create an immutable Media Passport record containing the evidence summary and content fingerprint.
10. Expose a public verification representation and a machine-readable policy response.

## Core rule

No single detector, watermark, metadata field, or missing signal is sufficient to establish human authorship. Every verdict must identify the evidence supporting it and the limitations of that evidence.

## Policy outcomes

A policy layer can map verification states to `ALLOW`, `LABEL`, `REVIEW`, or `BLOCK`. Policy is configurable and is separate from evidence collection so customers can choose their enforcement posture.

## Future integrations

- C2PA validators
- Content Credentials trust lists
- generator-specific provenance/watermark signals
- media forensics providers
- secure object storage
- asynchronous verification workers
- enterprise/platform API keys

## Production requirements

Before public production use, the service needs authenticated API access, rate limiting, upload size limits, malware/content safety scanning, encrypted storage, retention controls, audit logs, provider timeouts, retries, observability, key rotation, and end-to-end tests.
