# Billing and onboarding execution truth contract

MEDIA does not treat browser redirects, button clicks, checkout pages, client-side flags or optimistic UI state as proof.

- Billing state is updated only from an authenticated provider event persisted in billing_events and billing_accounts.
- Provider event IDs are idempotent. Reusing an event ID with a different payload hash is rejected as a replay mismatch.
- ACTIVE/payment-active UI may be shown only when the backend reports both account and subscription ACTIVE with persisted provider evidence.
- Missing provider evidence is UNKNOWN/PENDING, never paid or active.
- Onboarding steps marked COMPLETE require a backend evidence hash.
- Overall READY/setupComplete is derived only when persisted steps are complete and a completion evidence hash exists.
- Every onboarding transition is durably audited.
- The status APIs are the source of truth for customer UI. Frontends must re-fetch them after any setup/payment action and must not manufacture completion locally.

This proves only provider events and setup evidence MEDIA actually received. It does not infer payment or setup success from absence of errors.
