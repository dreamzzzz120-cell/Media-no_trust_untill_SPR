# Real enforcement truth contract

MEDIA distinguishes policy evaluation from enforcement.

- A policy evaluation may report a violation, review requirement, block decision, or unknown state.
- An evaluation alone never proves that an external action was prevented.
- `PREVENTED` is permitted only after a configured enforcement component submits a signed receipt that identifies the external receipt and event, reports `BLOCKED`, matches the completed timestamp, and is persisted as canonical enforcement evidence.
- Missing, unavailable, malformed, mismatched, unsigned, or untrusted-source receipts cannot produce `PREVENTED`.
- `OBSERVED_VIOLATION` describes observation only. It does not imply prevention.
- `NOT_ATTEMPTED`, `UNKNOWN`, and `UNAVAILABLE` remain explicit when enforcement proof does not exist.
- The enforcement receipt endpoint is evidence ingestion. It does not make MEDIA itself the external enforcement point.

Production runtime proof remains bounded to enforcement components actually configured and observed.
