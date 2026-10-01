import{describe,it,expect}from'vitest';import{createKernelStore}from'../src/evidence-store.js';
const h='a'.repeat(64);
describe('evidence source lifecycle',()=>{
 it('preserves evidence but blocks current SUPPORTED claims after source revocation',async()=>{
  const k=createKernelStore();
  const now=new Date().toISOString();
  const e=await k.record('org',{sourceType:'TEST',sourceName:'connector',collector:'ci',subjectType:'SYSTEM',subjectId:'s',observationType:'STATE',content:{v:1},observedAt:now,collectedAt:now,validationState:'OBSERVED',evidenceType:'STATE',provenance:{}});
  expect(await k.sourceStatus('org',e.sourceId,'REVOKED','credential compromised',h,now)).toBe(true);
  await expect(k.claim('org',{subjectType:'SYSTEM',subjectId:'s',claimType:'CURRENT',claimText:'current',findingType:'STATE',state:'SUPPORTED',summary:'must fail',evidenceIds:[e.evidenceId]})).rejects.toThrow('INACTIVE_EVIDENCE_SOURCE_CANNOT_SUPPORT_CLAIM');
 });
 it('historical evidence remains addressable after source decommission',async()=>{
  const k=createKernelStore();const now=new Date().toISOString();
  const e=await k.record('org',{sourceType:'TEST',sourceName:'connector',collector:'ci',subjectType:'SYSTEM',subjectId:'s2',observationType:'STATE',content:{v:1},observedAt:now,collectedAt:now,validationState:'OBSERVED',evidenceType:'STATE',provenance:{}});
  expect(await k.sourceStatus('org',e.sourceId,'DECOMMISSIONED','connector retired',h,now)).toBe(true);
  const partial=await k.claim('org',{subjectType:'SYSTEM',subjectId:'s2',claimType:'HISTORICAL',claimText:'historical observation existed',findingType:'STATE',state:'PARTIAL',summary:'historical only',evidenceIds:[e.evidenceId]});
  expect(partial).not.toBeNull();
 });
});
