# Database integrity contract

PostgreSQL, not caller discipline, owns the invariants in migration 047.

The database rejects malformed SHA-256 digests on canonical evidence and major evidence-bearing records, impossible timestamp orderings, cross-tenant enforcement-policy and media-history references, ACTIVE billing without persisted provider evidence, READY onboarding without completion evidence, invalid JSON container shapes, and inconsistent billing receipt lifecycle timestamps.

Composite foreign keys are preferred whenever a tenant-owned record references another tenant-owned record. Evidence lineage query paths are indexed by tenant and referenced record.

Application validation remains useful for friendly errors, but it is not the final integrity boundary. CI must apply every migration to PostgreSQL and then apply the migration set a second time before this change is eligible to merge.
