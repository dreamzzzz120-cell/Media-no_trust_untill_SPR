# Machine-to-Machine Trust Integration

Constellation remains the runtime observation/accountability platform. SPR remains the passport/verification platform.

The M2M trust contract sits between them.

## Flow
1. Machine A presents an `m2m-trust/1` envelope.
2. SPR verifies passport state and identity evidence.
3. The caller verifies signature freshness and replay status.
4. Constellation evaluates authority/delegation with its existing authority engine.
5. Only a fully verified envelope may execute.
6. Constellation emits an execution/evidence receipt.
7. The resulting evidence can be referenced back into SPR passport history.

## Fail-closed rule
`PARTIAL` and `UNKNOWN` are non-executable trust states. Revoked, expired, replayed, invalid, or unauthorized envelopes are denied.

This is infrastructure shared by SPR and Constellation. It is not a third customer-facing platform.
