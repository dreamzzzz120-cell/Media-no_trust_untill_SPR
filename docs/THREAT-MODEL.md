# Threat model

### Malicious upload
Mitigations: byte limits, MIME/container detection, randomized storage names, non-executable permissions, quarantine, and external malware scanning before distribution.

### Spoofed provenance
Mitigations: C2PA cryptographic validation, trust-list configuration, explicit distinction between valid, untrusted, absent and errored provenance.

### Detector overconfidence
Mitigations: provider observations remain evidence; no provider alone creates human-origin truth; unknown is preserved.

### API abuse
Mitigations: API key authentication, rate limiting, bounded multipart fields/files, structured error responses, and redacted logs.

### Data leakage
Mitigations: public endpoint returns minimized evidence, never original media bytes; secrets are environment-only; storage should be encrypted and retention-limited.

### Supply-chain compromise
Mitigations: pinned Node major, CI typecheck/test/build, lockfile required before production release, dependency review, and container non-root execution.
