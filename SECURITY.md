# Security model

## Threats addressed

- oversized uploads
- path traversal through filenames
- content-type spoofing
- unauthorized verification API calls
- accidental secret logging
- ambiguous verification claims
- provider failure being treated as success

## Required production controls

Set `REQUIRE_API_KEY=true` and a random API key of at least 32 characters. Set `DATABASE_URL` to a managed PostgreSQL database. Put the upload directory on encrypted ephemeral or object storage and configure a retention/deletion job.

The current service intentionally defaults to a conservative `UNVERIFIED` result when evidence is insufficient. Do not configure downstream systems to interpret `UNVERIFIED` as human-authored.

Before accepting untrusted public traffic, deploy malware/content scanning and an object-storage quarantine workflow. The C2PA validator is a provenance validator, not a universal deepfake detector.
