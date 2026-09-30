# Failure / chaos release gate

MEDIA must fail closed when a dependency or transaction boundary fails.

Release-blocking invariants:
- database unavailable: readiness is false; persistence failures cannot return a successful passport
- scanner unavailable, killed, timeout, malformed response: upload is BLOCKED_UNVERIFIED / VERIFICATION_UNAVAILABLE, never CLEAN
- collector unavailable, timeout or malformed response: observation is UNKNOWN with limitations, never clean/absent/observed
- webhook receiver/network failure: RETRY then DEAD at the bounded limit, never DELIVERED
- webhook database failure before durable finish: no DELIVERED claim is returned
- duplicate idempotency keys: one execution claim only; same work is IN_PROGRESS or replayed only after durable completion; different work is CONFLICT
- concurrent webhook workers rely on PostgreSQL FOR UPDATE SKIP LOCKED plus leases
- canonical evidence and media passport persistence use database transactions; partial transaction failure must roll back
- a completed media idempotency replay is returned only if the persisted passport can actually be read; incomplete/failed duplicate processing fails closed

This gate proves repository and CI behavior under injected failures. It does not claim a production chaos exercise occurred until the deployed dependencies are actually killed and observed.
