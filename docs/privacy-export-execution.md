# Privacy, deletion and export execution

Privacy operations are durable jobs, not synchronous claims.

- Only authorized tenant roles can request deletion/export operations.
- Jobs are tenant scoped, leased with PostgreSQL row locks, retry with bounded exponential backoff, and end in a visible DEAD state after repeated failure.
- Every request, legal hold, completion, failure and dead-letter transition is recorded in immutable privacy_job_audit.
- Exports are generated from persisted canonical evidence/claims as of the requested timestamp. The artifact is persisted with a SHA-256 manifest hash and record count.
- Export completion proves only the persisted records included in the manifest.
- Deletion is fail-closed around MEDIA's immutable evidence ledger. A request that matches canonical evidence does NOT destroy that ledger or claim success. It fails with IMMUTABLE_EVIDENCE_REQUIRES_REDACTION_POLICY until an explicit, legally reviewed redaction/retention policy is implemented.
- A legal hold stops eligible deletion work and is audited.
- Completed deletion contains a result-manifest hash so MEDIA can prove what the worker actually did without retaining deleted subject content in the audit event.

This execution layer does not claim that external systems deleted or exported data unless separate evidence from those systems is collected.
