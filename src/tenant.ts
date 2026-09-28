import type { ApiIdentity } from './db.js';
import type { VerificationRecord } from './domain/media.js';

/** Private API reads are scoped to the API key's organization. */
export function canReadTenantRecord(identity: ApiIdentity, record: VerificationRecord): boolean {
  if (identity.role === 'super_admin' || identity.role === 'platform_admin') return true;
  return Boolean(identity.organizationId && record.asset.organizationId === identity.organizationId);
}
