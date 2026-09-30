import { describe, expect, it } from 'vitest';
import { canReadTenantRecord } from '../src/tenant.js';
import type { VerificationRecord } from '../src/domain/media.js';
const record = { asset: { organizationId: 'publisher-a' } } as VerificationRecord;
describe('private passport access', () => {
  it('allows the owning publisher and denies other tenants and unowned records', () => {
    expect(canReadTenantRecord({ keyId: 'a', role: 'creator', organizationId: 'publisher-a' }, record)).toBe(true);
    expect(canReadTenantRecord({ keyId: 'b', role: 'creator', organizationId: 'publisher-b' }, record)).toBe(false);
    expect(canReadTenantRecord({ keyId: 'a', role: 'creator', organizationId: 'publisher-a' }, { asset: {} } as VerificationRecord)).toBe(false);
  });
});


it('does not let ordinary cross-tenant identities read another tenant passport',()=>{for(const role of ['viewer','creator','reviewer','moderator','analyst','organization_admin'] as const)expect(canReadTenantRecord({keyId:'x',role,organizationId:'publisher-b'},record)).toBe(false)});
