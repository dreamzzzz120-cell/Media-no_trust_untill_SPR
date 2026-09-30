# Customer evidence views

Customer-facing views are projections of persisted tenant evidence.

- Dashboard: canonical evidence and evaluated claims available by an `asOf` timestamp.
- Passport: evidence and evaluated claims for one subject. No evidence returns `UNKNOWN`, never PASS, SAFE, VERIFIED, COMPLIANT, CLEAN or ABSENT.
- Timeline: persisted canonical observations ordered by observed time.
- Constellation: persisted entities, relationships and events known by the requested timestamp. An empty graph is UNKNOWN coverage.
- Reports: immutable hashed snapshots in `customer_reports`. A SUPPORTED section requires canonical evidence IDs. UNKNOWN sections cannot carry asserted facts.

All views are tenant scoped. Counts describe only records MEDIA can see. Missing collectors, missing observations and unavailable systems are limitations, not positive findings.
