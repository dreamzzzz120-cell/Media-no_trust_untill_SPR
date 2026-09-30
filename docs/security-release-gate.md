# Security release gate

A release is blocked unless CI proves the adversarial security suite.

Covered boundaries:
- tenant isolation and API-key role escalation
- global request rate limiting and bounded request/upload sizes
- upload quarantine, byte limits, filename/path traversal and MIME mismatch
- Shadow-AI collector SSRF/private-network and response-size defenses
- outbound customer webhook SSRF prevention: HTTPS, no URL credentials, no private/loopback/link-local destination, standard TLS port
- unauthenticated billing webhook body limits and signature verification
- webhook delivery signing, bounded responses, retries/dead-letter/idempotency
- secret-bearing request headers/body fields are redacted from application logs
- public passport routes remain fail-closed 404 and verification responses do not manufacture public URLs

This gate is defense in depth. It does not claim penetration-test certification or prove infrastructure controls outside this repository.
