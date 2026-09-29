# Action boundary enforcement

A proposed AI action must pass the boundary engine before a connected execution gateway treats it as permitted.

Boundaries are versioned and tenant scoped. Missing boundaries, missing required values, and unit mismatches fail closed to REQUIRE_HUMAN. Only an explicit ALLOW means the proposal is within the configured boundary.

Each evaluation is written to the accountability decision chain with the exact boundary ID/version and the signals available at decision time.

This layer evaluates and records permission decisions. It does not itself perform external side effects. A connected execution gateway must enforce the returned decision and separately report the authoritative outcome.

Risk signals remain signals; they are not claims about intent.
