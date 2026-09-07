# Media Passport

**Evidence before amplification.**

Media Passport is an independent **identity + evidence layer for digital media**. It supports video, images and audio intake today and defines a common trust model for additional media types.

## The bigger product

Media Passport is designed to sit above the media ecosystem rather than compete with it.

The same piece of media can move from a creator to YouTube, TikTok, X, a news publisher, an advertiser, an archive, or an AI system while losing information about its origin, edits, disclosures, and supporting evidence.

Media Passport gives that media a persistent identity and evidence history that can travel across platforms.

> **What is this media, where did it come from, what happened to it, what evidence supports the assessment, and how confident are we?**

Media Passport evaluates. The platform, publisher, advertiser, or other downstream system makes the final product decision.

See the network architecture in `MEDIA_PASSPORT_NETWORK.md`.

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

## Media Passport Network

The network adds four durable primitives:

- **Media Identity** — exact asset identity plus evidence-backed media-family relationships.
- **Transformation Graph** — records copies, crops, trims, transcodes, edits, AI edits and other derivatives.
- **Publication Graph** — records where an asset or derivative has been observed across platforms and publishers.
- **Evidence Timeline** — append-only events covering creation, publication, republication, transformation, claims, corrections, verification, appeals and removal.

Migration `004_media_network.sql` establishes these primitives without treating similarity as proof of identity.

## Pipeline

`UPLOAD → QUARANTINE → MALWARE SCAN → FILE VALIDATION → HASH → C2PA/PROVENANCE → SIGNAL PROVIDERS → EVIDENCE → TRUST VECTOR → DECISION → PASSPORT`

The network extends the result into:

`PASSPORT → IDENTITY → TRANSFORMATIONS → PUBLICATIONS → EVENTS → CROSS-PLATFORM VERIFICATION`

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

Network API surface planned by the new schema:

- `POST /v1/network/identify`
- `GET /v1/network/media/:id`
- `GET /v1/network/media/:id/history`
- `GET /v1/network/media/:id/publications`
- `GET /v1/network/media/:id/transformations`
- `POST /v1/network/events`

## Security

Uploaded media is hostile input. Production requires malware scanning, strict MIME/file-signature validation, upload limits, secure temporary storage, authenticated API access, RBAC, hashed API keys, security headers, rate limiting, and privacy-minimized public output.

## Evidence governance

Every persisted Trust Observation records content hash, model name/version, confidence, timestamp and policy version. C2PA is treated as signed provenance evidence rather than a universal deepfake detector. AI involvement is separated from deception, and creator disclosure is evaluated independently.

Network identity and transformation relationships are also evidence-backed and confidence-aware. Similarity alone must never silently become certainty.

## Data model

Migration `002_media_passport.sql` adds organizations, creators, media assets, Passports, immutable Trust Observations, evidence, provenance manifests, claims, reviews, appeals, reports, audit logs, API keys, webhook subscriptions and versioned policies. Migration `003_legacy_media_kind.sql` expands the original verification table for additional media kinds. Migration `004_media_network.sql` adds persistent media identities, identity membership, transformation relationships, publication observations and an append-only network event timeline.

## Release gate

`npm run check` must pass lint, typecheck, tests and build. CI also checks lockfile integrity and production dependency vulnerabilities.

The repository contains the production application foundation, but a real production release still requires deployment-specific credentials and infrastructure verification that cannot be fabricated in Git: PostgreSQL persistence, malware scanner, persistent object storage/ephemeral deletion behavior, any selected AI/source-analysis providers, authenticated tenant-isolation tests, and an executed backup/restore drill.
