import { describe,expect,it } from 'vitest';
import { createDecisionStore } from '../src/decisions.js';

describe('accountability decision chain',()=>{
 it('hash-links decision-time evidence and policy context',async()=>{
  const store=createDecisionStore();
  const first=await store.append('tenant-a',{aiId:'11111111-1111-4111-8111-111111111111',actionEventId:null,decision:'REQUIRE_HUMAN',decisionMode:'COMBINED',reason:'Configured bulk-export boundary was exceeded.',policyId:'export-policy',policyVersion:'3',boundaryId:'records-per-export',boundaryVersion:'2',evidenceSnapshot:['event:abc','observer:gateway-1'],riskSignals:['record_count_above_boundary'],humanState:'PENDING',humanActor:null,decidedAt:'2026-09-28T20:00:00.000Z'});
  const second=await store.append('tenant-a',{aiId:first.aiId,actionEventId:null,decision:'ALLOW',decisionMode:'HUMAN',reason:'Human approval recorded for the bounded action.',policyId:'export-policy',policyVersion:'3',boundaryId:'records-per-export',boundaryVersion:'2',evidenceSnapshot:['prior-decision:'+first.id],riskSignals:[],humanState:'APPROVED',humanActor:'reviewer:42',decidedAt:'2026-09-28T20:01:00.000Z'});
  expect(second.previousHash).toBe(first.decisionHash);
  expect((await store.timeline('tenant-a',first.aiId))).toHaveLength(2);
  await store.close();
 });
});
