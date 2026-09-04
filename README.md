# SPR Media Passport

**No trust until SPR.**

An isolated evidence-first media provenance and authenticity verification service.

## Product goal

SPR Media Passport analyzes images and video and produces an evidence-backed verification record. It does **not** claim that absence of an AI signal proves human origin.

Initial verdict model:

- `AI_VERIFIED` — supported synthetic-generation provenance/signals verified
- `HUMAN_ORIGIN_VERIFIED` — supported capture/provenance evidence verified
- `UNVERIFIED` — insufficient trustworthy evidence
- `REVIEW` — conflicting or suspicious evidence requires review
- `BLOCK` — policy engine determines distribution should be blocked

## Architecture boundary

This repository is intentionally independent from the production Software Passport Registry application. Do not add production SPR database credentials, Stripe secrets, or production infrastructure dependencies here.

## Pipeline

`UPLOAD → FINGERPRINT → MALWARE SCAN → PROVENANCE → SIGNAL ANALYSIS → EVIDENCE → VERDICT → MEDIA PASSPORT → POLICY`

## Security principles

- SHA-256 content fingerprinting
- immutable verification observations
- explicit evidence provenance
- fail-closed policy decisions where configured
- no unsupported certainty claims
- bounded uploads and strict MIME validation
- fail-closed malware scanning in production
- provider failures recorded rather than hidden
- privacy-conscious public output
- durable storage is explicitly required for production
- database readiness is actively probed
- API-key comparison uses constant-time equality

## Production contract

Production startup requires PostgreSQL, API authentication, confirmed durable upload storage, and a malware scanner endpoint. The malware scanner contract is a POST of the uploaded bytes with the media MIME type and a bearer token; it must return JSON containing a boolean `clean` property. A scanner failure is treated as unavailable and the media is not verified or distributed.

For deployment, apply `db/001_init.sql`, mount encrypted durable storage at `UPLOAD_DIR`, configure the required secrets, and require the CI release gate to pass.

## Important limitation

C2PA is provenance evidence, not a universal deepfake detector. Missing provenance means **UNVERIFIED**, not human-made. Automated mass-distribution blocking should only be enabled after an appropriate security/legal review and platform integration.

## Status

Production-hardened application code; deployment requires the documented production infrastructure and secrets.
