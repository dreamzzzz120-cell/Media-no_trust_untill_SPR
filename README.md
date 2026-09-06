# Media Passport

**Evidence before amplification.**

Media Passport is an evidence-first media provenance and trust assessment service. It supports video, images and audio intake today and defines a common trust model for additional media types.

## Product principle

> We don't decide what you're allowed to believe. We show you what the evidence says about how content was made, where it came from, and how confidently it can be verified.

The system does not claim objective truth, legal ownership, copyright infringement, identity certainty, or regulatory certification.

## Trust Vector

1. Provenance
2. Authenticity
3. AI Transparency
4. Source Quality
5. Claim Integrity
6. Manipulation Risk
7. Originality
8. Copyright Risk
9. Creator Trust
10. Spam Risk
11. Human Contribution
12. Evidence Quality

Scores remain evidence-backed and confidence-aware. Missing evidence does not become certainty.

## Pipeline

`UPLOAD → QUARANTINE → MALWARE SCAN → FILE VALIDATION → HASH → C2PA/PROVENANCE → SIGNAL PROVIDERS → EVIDENCE → TRUST VECTOR → DECISION → PASSPORT`

## API

- `POST /v1/media/verify`
- `GET /v1/media/:id`
- `GET /v1/media/:id/evidence`
- `GET /v1/media/:id/provenance`
- `GET /v1/media/:id/trust`
- `GET /v1/media/:id/claims`
- `POST /v1/media/:id/appeal`
- `POST /v1/media/:id/report`
- `POST /v1/recommendation/evaluate`
- `POST /v1/api-keys`
- `GET /health`
- `GET /ready`
- `GET /docs`

## Security

Uploaded media is hostile input. Production requires malware scanning, strict MIME/file-signature validation, upload limits, secure temporary storage, authenticated API access, RBAC, hashed API keys, security headers, rate limiting, and privacy-minimized public output.

## Evidence governance

Every persisted Trust Observation records content hash, model name/version, confidence, timestamp and policy version. C2PA is treated as signed provenance evidence rather than a universal deepfake detector. AI involvement is separated from deception, and creator disclosure is evaluated independently.

## Data model

Migration `002_media_passport.sql` adds organizations, creators, media assets, Passports, immutable Trust Observations, evidence, provenance manifests, claims, reviews, appeals, reports, audit logs, API keys, webhook subscriptions and versioned policies. Migration `003_legacy_media_kind.sql` expands the original verification table for additional media kinds.

## Release gate

`npm run check` must pass lint, typecheck, tests and build. CI also checks lockfile integrity and production dependency vulnerabilities.

The repository contains the production application foundation, but a real production release still requires deployment-specific credentials and infrastructure verification that cannot be fabricated in Git: PostgreSQL persistence, malware scanner, persistent object storage/ephemeral deletion behavior, any selected AI/source-analysis providers, authenticated tenant-isolation tests, and an executed backup/restore drill.
