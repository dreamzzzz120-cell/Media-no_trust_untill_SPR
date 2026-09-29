import { test, expect } from 'vitest';import{evaluateAuthority,executionGate}from'../src/authority.js';
const h='a'.repeat(64), now='2026-09-29T10:00:00.000Z';
const base={actorEntityId:'actor',actionType:'COMMUNICATE',license:{id:'l',licenseClass:2,endorsements:['EXT'],validFrom:'2026-09-01T00:00:00.000Z',validUntil:'2026-10-01T00:00:00.000Z',evidenceHash:h},mission:{id:'m',maxLicenseClass:2,startsAt:'2026-09-01T00:00:00.000Z',expiresAt:'2026-10-01T00:00:00.000Z',evidenceHash:h},authorityStatus:'ACTIVE' as const,freshness:'CURRENT' as const,budget:'WITHIN_BUDGET' as const,law:'SUPPORTED' as const,now};
test('authorizes only fully established active authority',()=>expect(evaluateAuthority(base).decision).toBe('AUTHORIZED'));
test('missing mission fails closed to UNKNOWN',()=>expect(evaluateAuthority({...base,mission:null}).decision).toBe('UNKNOWN'));
test('revoked authority is not authorized',()=>expect(evaluateAuthority({...base,authorityStatus:'REVOKED'}).decision).toBe('NOT_AUTHORIZED'));
test('stale authority is UNKNOWN rather than allowed',()=>expect(evaluateAuthority({...base,freshness:'STALE'}).decision).toBe('UNKNOWN'));
test('required approval without evidence is UNKNOWN',()=>expect(evaluateAuthority({...base,approval:{required:true,decision:'APPROVED'}}).decision).toBe('UNKNOWN'));
test('over budget is not authorized',()=>expect(evaluateAuthority({...base,budget:'OVER_BUDGET'}).decision).toBe('NOT_AUTHORIZED'));
test('unknown law evidence fails closed',()=>expect(evaluateAuthority({...base,law:'UNKNOWN'}).decision).toBe('UNKNOWN'));
test('expired mission is not authorized',()=>expect(evaluateAuthority({...base,now:'2026-10-02T00:00:00.000Z'}).decision).toBe('NOT_AUTHORIZED'));

test('execution gate allows only established authorization',()=>{expect(executionGate(evaluateAuthority(base))).toBe('ALLOW_EXECUTION');expect(executionGate(evaluateAuthority({...base,authorityStatus:'REVOKED'}))).toBe('DENY_EXECUTION');expect(executionGate(evaluateAuthority({...base,freshness:'UNKNOWN'}))).toBe('HOLD_UNKNOWN')});

test('explicit denial dominates simultaneous unknown evidence',()=>{const r=evaluateAuthority({...base,authorityStatus:'REVOKED',freshness:'UNKNOWN',budget:'UNKNOWN',law:'UNKNOWN'});expect(r.decision).toBe('NOT_AUTHORIZED');expect(r.reasons).toContain('AUTHORITY_INACTIVE');expect(r.reasons).toContain('AUTHORITY_FRESHNESS_NOT_ESTABLISHED');expect(executionGate(r)).toBe('DENY_EXECUTION')});

test('unknown action policy fails closed',()=>expect(evaluateAuthority({...base,actionType:'UNREGISTERED_ACTION'}).decision).toBe('UNKNOWN'));
test('insufficient licence class is denied',()=>expect(evaluateAuthority({...base,actionType:'TRANSACT',license:{...base.license,licenseClass:3,endorsements:['FIN']}}).decision).toBe('NOT_AUTHORIZED'));
test('missing required endorsement is denied',()=>expect(evaluateAuthority({...base,actionType:'TRANSACT',license:{...base.license,licenseClass:4,endorsements:[]}}).decision).toBe('NOT_AUTHORIZED'));
test('action outside explicit licence scope is denied',()=>expect(evaluateAuthority({...base,license:{...base.license,scope:{actionTypes:['OBSERVE']}}}).decision).toBe('NOT_AUTHORIZED'));
