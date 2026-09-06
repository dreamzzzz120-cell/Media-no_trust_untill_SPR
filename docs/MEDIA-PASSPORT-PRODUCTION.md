# Media Passport — Production Contract

Media Passport is an evidence-based trust assessment system. It does **not** determine objective truth and does not make legal conclusions.

## Core flow

`upload -> quarantine -> malware scan -> file validation -> hash -> provenance -> analysis providers -> evidence aggregation -> Trust Vector -> decision -> immutable observation -> Passport`

## Decisions

- **PROMOTE** — high-confidence candidate for preferential distribution when a consuming platform elects to use the signal.
- **TRUST** — trust threshold met; not a guarantee of truth.
- **REVIEW** — evidence conflict, disclosure mismatch, insufficient confidence, or policy escalation.
- **SUPPRESS** — do not recommend until the relevant risk is resolved.
- **REMOVE** remains a platform/moderation action, not an automated truth judgment.

## Trust dimensions

Provenance, Authenticity, AI Transparency, Source Quality, Claim Integrity, Manipulation Risk, Originality, Copyright Risk, Creator Trust, Spam Risk, Human Contribution, Evidence Quality.

Each dimension is nullable where evidence is absent. Missing evidence is never silently converted into certainty.

## AI governance

The system distinguishes AI involvement from deception. AI-assisted or AI-edited work is not inherently negative. Every model-derived finding must retain model name/version, timestamp, input/content hash, confidence and policy version.

## Evidence retention

Hashes and structured findings should be retained preferentially. Raw media is quarantined during processing and is deleted after successful verification when `DELETE_SOURCE_AFTER_VERIFICATION=true`.

## Security boundary

Uploaded media is hostile input. Processing must be isolated from the application control plane. Never execute uploaded content. Validate MIME using file signatures, enforce size limits, scan for malware, constrain decompression/transcoding resources, and treat embedded text/metadata as untrusted data rather than instructions.

## API contract

- `POST /v1/media/verify`
- `GET /v1/media/:id`
- `GET /v1/media/:id/evidence`
- `GET /v1/media/:id/provenance`
- `GET /v1/media/:id/claims`
- `GET /v1/media/:id/trust`
- `POST /v1/media/:id/appeal`
- `POST /v1/media/:id/report`
- `POST /v1/recommendation/evaluate`
- `POST /v1/api-keys`

OpenAPI is exposed at `/docs`.

## Production gate

A release is not production-ready until CI passes, authenticated tenant isolation is verified, the malware scanner is reachable, object/database persistence is confirmed, external AI providers are configured and tested where used, rate limits are tested, restore has been executed against a real backup, and live health/readiness plus representative authenticated API calls succeed.

Credentials and provider configuration cannot be safely fabricated in source control. Those are deployment gates, not code claims.
