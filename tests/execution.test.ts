import{describe,it,expect,vi}from'vitest';import{executeGoverned}from'../src/execution.js';
const auth=(decision:'AUTHORIZED'|'NOT_AUTHORIZED'|'UNKNOWN')=>({id:'eval-1',decision,reasons:[],evaluatedAt:'2026-09-29T10:00:00.000Z'});
const req=(decision:'AUTHORIZED'|'NOT_AUTHORIZED'|'UNKNOWN')=>({organizationId:'org',actorEntityId:'actor',actionType:'SEND',payload:{x:1},authority:auth(decision),idempotencyKey:'test-'+decision});
const ok=async()=>({externalEventId:'evt-1',status:'SUCCEEDED' as const,occurredAt:new Date().toISOString()});
describe('governed execution',()=>{
 it('never invokes executor when denied',async()=>{const x=vi.fn(ok);const r=await executeGoverned(req('NOT_AUTHORIZED'),x);expect(x).not.toHaveBeenCalled();expect(r.outcome).toBe('DENIED_NOT_EXECUTED')});
 it('never invokes executor when authority is unknown',async()=>{const x=vi.fn(ok);const r=await executeGoverned(req('UNKNOWN'),x);expect(x).not.toHaveBeenCalled();expect(r.outcome).toBe('UNKNOWN')});
 it('records observed success only after executor returns',async()=>{const x=vi.fn(ok);const r=await executeGoverned(req('AUTHORIZED'),x);expect(x).toHaveBeenCalledOnce();expect(r.outcome).toBe('OBSERVED_SUCCEEDED')});
 it('records observed failure when authorized executor throws',async()=>{const x=vi.fn(async()=>{throw Error('provider failed')});const r=await executeGoverned(req('AUTHORIZED'),x);expect(r.outcome).toBe('UNKNOWN')});
 it('does not store raw payload in receipt',async()=>{const r=await executeGoverned(req('AUTHORIZED'),ok);expect(r).not.toHaveProperty('payload');expect(r.payloadDigest).toMatch(/^[a-f0-9]{64}$/)});
});

it('hashes payload canonically regardless of object key order',async()=>{const a=await executeGoverned({...req('AUTHORIZED'),payload:{a:1,b:2}},ok);const b=await executeGoverned({...req('AUTHORIZED'),payload:{b:2,a:1}},ok);expect(a.payloadDigest).toBe(b.payloadDigest)});
it('seals every receipt with a sha256 digest',async()=>{const r=await executeGoverned({...req('UNKNOWN'),idempotencyKey:'job-1'},ok);expect(r.receiptDigest).toMatch(/^[a-f0-9]{64}$/);expect(r.idempotencyKey).toBe('job-1')});
