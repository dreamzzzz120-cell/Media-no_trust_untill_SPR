import{describe,it,expect,vi}from'vitest';import{runGuardedAction}from'../src/guarded-action.js';import type{AuthorityStore}from'../src/authority-store.js';
const store=(decision:'AUTHORIZED'|'NOT_AUTHORIZED'|'UNKNOWN'):AuthorityStore=>({ready:async()=>true,close:async()=>{},check:async()=>({id:'e',decision,reasons:[],evaluatedAt:new Date().toISOString()})});
const a={organizationId:'org',actorEntityId:'actor',missionId:'mission',actionType:'SEND',payload:{secret:'x'}};
describe('guarded action',()=>{
 it('executes only after persisted authority authorizes',async()=>{const x=vi.fn(async()=>{});const r=await runGuardedAction(store('AUTHORIZED'),a,x);expect(x).toHaveBeenCalledOnce();expect(r.outcome).toBe('OBSERVED_SUCCEEDED')});
 it('blocks explicit denial without invoking side effect',async()=>{const x=vi.fn(async()=>{});const r=await runGuardedAction(store('NOT_AUTHORIZED'),a,x);expect(x).not.toHaveBeenCalled();expect(r.outcome).toBe('BLOCKED')});
 it('holds unknown authority without invoking side effect',async()=>{const x=vi.fn(async()=>{});const r=await runGuardedAction(store('UNKNOWN'),a,x);expect(x).not.toHaveBeenCalled();expect(r.outcome).toBe('UNKNOWN')});
});
