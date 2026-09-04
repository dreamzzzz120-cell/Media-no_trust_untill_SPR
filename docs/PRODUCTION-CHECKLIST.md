# Production release gate

The application intentionally fails closed at startup unless required production controls are configured.

## Required infrastructure

- [ ] Managed PostgreSQL provisioned and `db/001_init.sql` applied.
- [ ] `REQUIRE_API_KEY=true` and a 32+ character secret configured.
- [ ] HTTPS termination enabled at the trusted edge.
- [ ] `PERSISTENT_STORAGE_CONFIRMED=true` set only when `UPLOAD_DIR` is backed by durable, access-controlled storage/volume.
- [ ] Malware scanner deployed at `MALWARE_SCAN_URL`; it must accept uploaded bytes and return JSON `{ "clean": boolean }`.
- [ ] `MALWARE_SCAN_TOKEN` configured and kept secret.
- [ ] Retention/deletion policy configured for uploaded media and verification records.
- [ ] Database backups and a restore drill completed.

## Verification controls

- [ ] C2PA trust configuration reviewed for the deployment environment.
- [ ] External AI/media-forensics providers evaluated and configured if the product is marketed as detecting unprovenanced synthetic media.
- [ ] Provider timeouts/retries/circuit breakers implemented before adding network-based forensic providers.
- [ ] No provider failure is converted into a positive authenticity claim.
- [ ] Missing provenance remains `UNVERIFIED`; it never becomes proof of human origin.

## Operational controls

- [ ] Observability, error alerts and uptime monitoring configured.
- [ ] Rate-limit thresholds tested under expected traffic.
- [ ] Upload size, MIME/container mismatch and malformed-input tests passing.
- [ ] Public passport endpoint reviewed for privacy and information disclosure.
- [ ] Privacy notice and terms reviewed for the exact media/data flows.
- [ ] Security review completed before enabling automated mass-distribution enforcement.
- [ ] Full CI `typecheck + test + build` is green on the exact release commit.

The service is an evidence/provenance system, not a universal truth detector. C2PA can verify supported provenance but cannot prove that every asset without provenance is human-made.
