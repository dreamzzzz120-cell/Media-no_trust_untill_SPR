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

## Planned pipeline

`UPLOAD → FINGERPRINT → PROVENANCE → SIGNAL ANALYSIS → EVIDENCE → VERDICT → MEDIA PASSPORT → POLICY`

## Security principles

- SHA-256 content fingerprinting
- immutable verification observations
- explicit evidence provenance
- fail-closed policy decisions where configured
- no unsupported certainty claims
- bounded uploads and strict MIME validation
- provider failures recorded rather than hidden
- privacy-conscious retention

## Status

Foundation build in progress.
