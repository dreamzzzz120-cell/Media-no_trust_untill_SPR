# Accountability decision chain

The accountability system must preserve why it made its own decisions.

For every allow, flag, human-review requirement, or block, retain the context that existed at decision time:

proposed action -> evidence snapshot -> observer references -> risk signals -> policy/boundary version -> decision -> reason -> human state -> later outcome

Decision records are append-only and hash-linked. Historical records are not rewritten when policy changes.

Risk signals are evidence inputs, not facts about intent. A boundary signal can justify review without being represented as proof of malicious behavior.

This first slice records decision-time context. Automatic policy execution, recommendation generation, and authoritative outcome reconciliation remain separate work.

Core rules:
- Every AI action must be traceable.
- Every observation must itself be observable.
- Every accountability decision must be traceable.
