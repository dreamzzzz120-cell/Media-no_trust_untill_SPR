import { describe, expect, it } from 'vitest';
import { evaluateM2MTrust } from '../src/m2m-trust.js';

const h='a'.repeat(64);
const envelope={protocol:'m2m-trust/1' as const,envelopeId:'env-1',issuer:{machineId:'machine-a',organizationId:'org-a'},subject:{machineId:'machine-b',organizationId:'org-b'},requestedAction:'OBSERVE',passportState:'ACTIVE' as const,issuedAt:'2026-09-29T00:00:00.000Z',expiresAt:'2026-09-30T00:00:00.000Z',nonce:'1234567890abcdef',evidenceDigest:h};
const authority={actorEntityId:'machine-a',actionType:'OBSERVE',license:{id:'l',licenseClass:1,validFrom:'2026-09-01T00:00:00.000Z',evidenceHash:h},mission:{id:'m',maxLicenseClass:1,startsAt:'2026-09-01T00:00:00.000Z',expiresAt:'2026-10-01T00:00:00.000Z',evidenceHash:h},authorityStatus:'ACTIVE' as const,freshness:'CURRENT' as const};

describe('m2m trust',()=>{it('fails closed when signature proof is missing',()=>{const r=evaluateM2MTrust(envelope,{passportVerified:true,signatureVerified:null,nonceSeen:false,authority},'2026-09-29T12:00:00.000Z');expect(r.decision).toBe('UNKNOWN')});it('blocks replay',()=>{const r=evaluateM2MTrust(envelope,{passportVerified:true,signatureVerified:true,nonceSeen:true,authority},'2026-09-29T12:00:00.000Z');expect(r.decision).toBe('DENIED')})});
