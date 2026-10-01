import { describe, expect, it } from 'vitest';
import { createKernelStore } from '../src/evidence-store.js';
const url=process.env.DATABASE_URL;

describe.skipIf(!url)('evidence truth PostgreSQL adversarial gate',()=>{
  it('never elevates stale, conflicting, limited, or foreign evidence into SUPPORTED',async()=>{
    const k=createKernelStore(url);
    const a='evidence-pg-a-'+Date.now(), b='evidence-pg-b-'+Date.now();
    try{
      const stale=await k.record(a,{sourceType:'TEST',sourceName:'stale',collector:'ci',subjectType:'SYSTEM',subjectId:'subject',observationType:'STATE',content:{v:1},observedAt:new Date(Date.now()-48*60*60*1000).toISOString(),collectedAt:new Date(Date.now()-47*60*60*1000).toISOString(),validationState:'OBSERVED',evidenceType:'STATE',provenance:{}});
      await expect(k.claim(a,{subjectType:'SYSTEM',subjectId:'subject',claimType:'CURRENT',claimText:'current',findingType:'STATE',state:'SUPPORTED',summary:'should fail',evidenceIds:[stale.evidenceId]})).rejects.toThrow(/STALE_EVIDENCE/);

      const unknown=await k.record(a,{sourceType:'TEST',sourceName:'unknown',collector:'ci',subjectType:'SYSTEM',subjectId:'subject-unknown',observationType:'STATE',content:{v:null},observedAt:new Date().toISOString(),collectedAt:new Date().toISOString(),validationState:'UNKNOWN',evidenceType:'STATE',provenance:{}});
      await expect(k.claim(a,{subjectType:'SYSTEM',subjectId:'subject-unknown',claimType:'CURRENT',claimText:'current',findingType:'STATE',state:'SUPPORTED',summary:'should fail',evidenceIds:[unknown.evidenceId]})).rejects.toThrow(/LIMITED_EVIDENCE/);

      const x=await k.record(a,{sourceType:'TEST',sourceName:'x',collector:'ci',subjectType:'SYSTEM',subjectId:'conflict',observationType:'STATE',content:{v:1},observedAt:new Date().toISOString(),collectedAt:new Date().toISOString(),validationState:'OBSERVED',evidenceType:'STATE',provenance:{}});
      const y=await k.record(a,{sourceType:'TEST',sourceName:'y',collector:'ci',subjectType:'SYSTEM',subjectId:'conflict',observationType:'STATE',content:{v:2},observedAt:new Date().toISOString(),collectedAt:new Date().toISOString(),validationState:'OBSERVED',evidenceType:'STATE',provenance:{}});
      await expect(k.claim(a,{subjectType:'SYSTEM',subjectId:'conflict',claimType:'CURRENT',claimText:'current',findingType:'STATE',state:'SUPPORTED',summary:'should fail',evidenceIds:[x.evidenceId,y.evidenceId]})).rejects.toThrow(/CONFLICTING_EVIDENCE/);

      const foreign=await k.record(b,{sourceType:'TEST',sourceName:'foreign',collector:'ci',subjectType:'SYSTEM',subjectId:'foreign',observationType:'STATE',content:{v:1},observedAt:new Date().toISOString(),collectedAt:new Date().toISOString(),validationState:'OBSERVED',evidenceType:'STATE',provenance:{}});
      expect(await k.claim(a,{subjectType:'SYSTEM',subjectId:'subject',claimType:'FOREIGN',claimText:'foreign',findingType:'STATE',state:'SUPPORTED',summary:'must not cross tenant',evidenceIds:[foreign.evidenceId]})).toBeNull();
    }finally{await k.close()}
  });
});
