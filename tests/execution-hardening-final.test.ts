import{describe,it,expect,vi}from'vitest';
import{readFileSync}from'node:fs';
import{executeGoverned}from'../src/execution.js';

const authority={id:'eval',decision:'AUTHORIZED' as const,reasons:[],evaluatedAt:'2026-10-06T00:00:00Z'};
const req={organizationId:'tenant-a',actorEntityId:'agent-a',actionType:'SEND',payload:{x:1},authority,idempotencyKey:'idem-1'};

describe('execution hardening',()=>{
 it('binds external provider identity into the sealed receipt',async()=>{
  const r=await executeGoverned(req,async()=>({externalEventId:'evt-1',status:'SUCCEEDED',occurredAt:'2026-10-06T00:00:01Z'}),()=>new Date('2026-10-06T00:00:00Z'));
  expect(r.outcome).toBe('OBSERVED_SUCCEEDED');expect(r.externalEventId).toBe('evt-1');expect(r.receiptDigest).toMatch(/^[a-f0-9]{64}$/);
 });
 it('does not invent provider identity for denied or unknown execution',async()=>{
  const never=vi.fn(async()=>({externalEventId:'evt',status:'SUCCEEDED' as const,occurredAt:'2026-10-06T00:00:01Z'}));
  const denied=await executeGoverned({...req,authority:{...authority,decision:'NOT_AUTHORIZED' as const}},never,()=>new Date('2026-10-06T00:00:00Z'));
  expect(denied.externalEventId).toBeNull();expect(never).not.toHaveBeenCalled();
 });
 it('downgrades forged or unverifiable provider receipts to UNKNOWN',async()=>{
  const verifier=vi.fn(async()=>false);
  const r=await executeGoverned(req,async()=>({externalEventId:'evt-2',status:'SUCCEEDED',occurredAt:'2026-10-06T00:00:01Z',providerIdentity:'provider-a',proof:'forged'}),()=>new Date('2026-10-06T00:00:00Z'),verifier);
  expect(r.outcome).toBe('UNKNOWN');expect(r.evidenceState).toBe('UNKNOWN');expect(r.externalEventId).toBeNull();expect(verifier).toHaveBeenCalledOnce();
 });
 it('binds verifier context to tenant actor action payload and idempotency key',async()=>{
  let seen:any;
  const r=await executeGoverned(req,async()=>({externalEventId:'evt-3',status:'SUCCEEDED',occurredAt:'2026-10-06T00:00:01Z'}),()=>new Date('2026-10-06T00:00:00Z'),async(_receipt,ctx)=>{seen=ctx;return true});
  expect(r.outcome).toBe('OBSERVED_SUCCEEDED');expect(seen).toMatchObject({organizationId:'tenant-a',actorEntityId:'agent-a',actionType:'SEND',idempotencyKey:'idem-1'});expect(seen.payloadDigest).toMatch(/^[a-f0-9]{64}$/);
 });
});

describe('approval consumption migration',()=>{
 const m=readFileSync(new URL('../db/063_approval_consumption.sql',import.meta.url),'utf8');
 it('is single-use and tenant scoped',()=>{expect(m).toContain('UNIQUE(organization_id, approval_id)');expect(m).toContain('FORCE ROW LEVEL SECURITY')});
 it('binds consumption to action and idempotency',()=>{expect(m).toContain('action_fingerprint CHAR(64)');expect(m).toContain('UNIQUE(organization_id, idempotency_key)')});
 it('is append only',()=>expect(m).toContain('approval consumption history is append-only'));
});
