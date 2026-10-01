import{describe,it,expect}from'vitest';import{evaluateEntitlement,mayExecuteAuthorizedFeature}from'../src/commerce.js';
describe('Constellation Phase 1 Gate 9 entitlement vs authorization',()=>{
 const proof='a'.repeat(64);
 it('authorization alone never grants a paid entitlement',()=>{expect(mayExecuteAuthorizedFeature(true,'UNKNOWN')).toBe(false);expect(mayExecuteAuthorizedFeature(true,'NOT_ENTITLED')).toBe(false)});
 it('entitlement alone never grants security authorization',()=>expect(mayExecuteAuthorizedFeature(false,'ENTITLED')).toBe(false));
 it('requires both independent gates',()=>expect(mayExecuteAuthorizedFeature(true,'ENTITLED')).toBe(true));
 it('fails closed when billing evidence is absent stale-looking or incomplete',()=>{expect(evaluateEntitlement({status:'ACTIVE',subscription_status:'ACTIVE',last_evidence_hash:null})).toBe('UNKNOWN');expect(evaluateEntitlement({status:'ACTIVE',subscription_status:'PENDING',last_evidence_hash:proof})).toBe('UNKNOWN');expect(evaluateEntitlement({status:'CANCELED',subscription_status:'CANCELED',last_evidence_hash:proof})).toBe('NOT_ENTITLED')});
});