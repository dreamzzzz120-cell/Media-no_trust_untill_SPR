# Production webhook delivery

MEDIA's webhook delivery contract is durable and fail-visible.

- The outbox deduplicates by subscription, event type and event ID.
- Workers claim due rows with PostgreSQL row locks and expiring leases, so concurrent workers do not intentionally deliver the same claim.
- Each network attempt has a unique delivery ID and immutable attempt record.
- Requests include `x-media-delivery-id`, `x-media-timestamp`, `x-media-key-id`, `x-media-signature` and `idempotency-key`.
- HMAC-SHA256 signs the delivery ID, timestamp and exact request body. Receivers should reject timestamps outside their replay window and persist delivery IDs to reject replays.
- Signing keys have IDs and ACTIVE / VERIFY_ONLY / RETIRED lifecycle states. Only the current ACTIVE key signs new deliveries; old VERIFY_ONLY keys can remain available to receivers during rotation.
- Retries use bounded exponential backoff. 2xx succeeds; transient network/408/409/425/429/5xx failures retry; permanent 4xx or exhausted attempts dead-letter.
- HTTP requests have a timeout, redirects are rejected, response bodies are read only to a configured bound, and errors are stored in bounded form.
- Dead letters require an explicit tenant-scoped operator requeue. Requeues are auditable.
- Operations endpoints expose queue state and immutable attempt history without exposing signing secrets.

This contract proves MEDIA's delivery machinery. It does not prove a receiver processed an event beyond the HTTP response MEDIA actually observed.
