import { describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { createKernelStore } from '../src/evidence-store.js';
const url=process.env.DATABASE_URL;

async function withOrg(fn:(k:ReturnType<typeof createKernelStore>,org:string)=>Promise<void>){
  const admin=postgres(url!,{prepare:false}); const org=randomUUID();
  await admin`INSERT INTO organizations(id,name) VALUES(${org},'Evidence truth isolated')`;
  const k=createKernelStore(url);
  try{await fn(k,org)}finally{await k.close();await admin.end({timeout:5})}
}

describe.skipIf(!url)('evidence truth PostgreSQL adversarial gate',()=>{
  it('stale evidence cannot support a current claim',()=>withOrg(async(k,org)=>{
    const e=await k.record(org,{sourceType:'TEST',sourceName:'stale',collector:'ci',subjectType:'SYSTEM',subjectId:'stale',observationType:'STATE',content:{v:1},observedAt:new Date(Date.now()-48*60*60*1000).toISOString(),collectedAt:new Date(Date.now()-47*60*60*1000).toISOString(),validationState:'OBSERVED',evidenceType:'STATE',provenance:{}});
    await expect(k.claim(org,{subjectType:'SYSTEM',subjectId:'stale',claimType:'CURRENT',claimText:'current',findingType:'STATE',state:'SUPPORTED',summary:'must fail',evidenceIds:[e.evidenceId]})).rejects.toThrow('STALE_EVIDENCE_CANNOT_SUPPORT_CURRENT_CLAIM');
  }));
  it('unknown evidence cannot support a claim',()=>withOrg(async(k,org)=>{
    const e=await k.record(org,{sourceType:'TEST',sourceName:'unknown',collector:'ci',subjectType:'SYSTEM',subjectId:'unknown',observationType:'STATE',content:{v:null},observedAt:new Date().toISOString(),collectedAt:new Date().toISOString(),validationState:'UNKNOWN',evidenceType:'STATE',provenance:{}});
    await expect(k.claim(org,{subjectType:'SYSTEM',subjectId:'unknown',claimType:'CURRENT',claimText:'current',findingType:'STATE',state:'SUPPORTED',summary:'must fail',evidenceIds:[e.evidenceId]})).rejects.toThrow('LIMITED_EVIDENCE_CANNOT_SUPPORT_CLAIM');
  }));
  it('conflicting evidence cannot be elevated to supported',()=>withOrg(async(k,org)=>{
    const x=await k.record(org,{sourceType:'TEST',sourceName:'x',collector:'ci',subjectType:'SYSTEM',subjectId:'conflict',observationType:'STATE',content:{v:1},observedAt:new Date().toISOString(),collectedAt:new Date().toISOString(),validationState:'OBSERVED',evidenceType:'STATE',provenance:{}});
    const y=await k.record(org,{sourceType:'TEST',sourceName:'y',collector:'ci',subjectType:'SYSTEM',subjectId:'conflict',observationType:'STATE',content:{v:2},observedAt:new Date().toISOString(),collectedAt:new Date().toISOString(),validationState:'OBSERVED',evidenceType:'STATE',provenance:{}});
    await expect(k.claim(org,{subjectType:'SYSTEM',subjectId:'conflict',claimType:'CURRENT',claimText:'current',findingType:'STATE',state:'SUPPORTED',summary:'must fail',evidenceIds:[x.evidenceId,y.evidenceId]})).rejects.toThrow('CONFLICTING_EVIDENCE_CANNOT_SUPPORT_CLAIM');
  }));
  it('foreign tenant evidence is invisible to a claim',async()=>{
    const admin=postgres(url!,{prepare:false});const a=randomUUID(),b=randomUUID();
    await admin`INSERT INTO organizations(id,name) VALUES(${a},'Evidence A'),(${b},'Evidence B')`;
    const k=createKernelStore(url);
    try{
      const foreign=await k.record(b,{sourceType:'TEST',sourceName:'foreign',collector:'ci',subjectType:'SYSTEM',subjectId:'foreign',observationType:'STATE',content:{v:1},observedAt:new Date().toISOString(),collectedAt:new Date().toISOString(),validationState:'OBSERVED',evidenceType:'STATE',provenance:{}});
      expect(await k.claim(a,{subjectType:'SYSTEM',subjectId:'foreign',claimType:'FOREIGN',claimText:'foreign',findingType:'STATE',state:'SUPPORTED',summary:'must not cross tenant',evidenceIds:[foreign.evidenceId]})).toBeNull();
    }finally{await k.close();await admin.end({timeout:5})}
  });
});
