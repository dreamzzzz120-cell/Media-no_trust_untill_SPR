# Observable observers

Media must not stop at the label **OBSERVED**. Every observation should be inspectable back to the observer and evidence source.

The trace model is:

`claim -> event -> evidence -> observer -> source locator -> collection method -> timestamp -> integrity hash -> verification note`

An observer is a tenant-scoped identity for the component that collected or witnessed evidence. Examples include an execution gateway, provider audit-log connector, malware scanner, database audit collector, or human reviewer.

Observer registration records what the observer is, its version, how it collects evidence, the scope it is authoritative for, signing identity when applicable, health, and the last time that observer was verified.

Evidence may then reference that observer. If evidence has no registered observer, the API must expose that limitation rather than silently treating the evidence as independently observed.

This does **not** mean that a healthy observer makes every claim true. Observer health, evidence integrity, source authority, and corroboration are separate questions. The purpose is to make the observation itself observable and auditable.

Core rule:

> Every observation must itself be observable.
