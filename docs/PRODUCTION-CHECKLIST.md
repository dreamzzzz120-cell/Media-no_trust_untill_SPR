# Production checklist

- [ ] Managed PostgreSQL provisioned and `db/001_init.sql` applied.
- [ ] `REQUIRE_API_KEY=true` and 32+ character secret configured.
- [ ] HTTPS termination enabled.
- [ ] Uploads isolated in encrypted quarantine/object storage.
- [ ] Malware/content scanning enabled before downstream distribution.
- [ ] Retention/deletion policy configured.
- [ ] External AI/media-forensics providers evaluated and configured where required.
- [ ] Provider timeouts/retries/circuit breakers configured.
- [ ] C2PA trust configuration reviewed for the deployment environment.
- [ ] Observability and alerting configured.
- [ ] Backup/restore tested.
- [ ] Abuse/rate-limit thresholds tested.
- [ ] Privacy notice and terms reviewed for the exact data flows.
- [ ] End-to-end upload, verification, public passport and policy tests passing.
- [ ] Security review completed before allowing mass-distribution enforcement.

The service must remain conservative: an absent provenance record is unknown, not proof of fabrication or proof of human origin.
