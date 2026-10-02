import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createConstellationStore } from '../src/constellation.js';
import { canReadTenantRecord } from '../src/tenant.js';
import type { VerificationRecord } from '../src/domain/media.js';

const h=(s:string)=>createHash('sha256').update(s).digest('hex');
const entity=(name:string)=>({entityType:'SYSTEM' as const,name,identityKey:name.toLowerCase().replace(/\s+/g,'-'),evidenceState:'OBSERVED' as const,evidenceHash:h(name),source:'boundary-test',firstObservedAt:'2026-09-30T00:00:00Z',lastObservedAt:'2026-09-30T00:00:00Z',metadata:{}});

describe('Constellation Gate 01 — Galaxy authorization boundaries',()=>{
  it('never exposes Galaxy B entities, edges, or events in Galaxy A snapshot',async()=>{
    const s=createConstellationStore(undefined,()=>new Date('2026-09-30T00:01:00Z'));
    const a1=await s.addEntity('galaxy-a',entity('A Sun'));
    const a2=await s.addEntity('galaxy-a',entity('A Planet'));
    const b1=await s.addEntity('galaxy-b',entity('B Secret Sun'));
    const ar=await s.addRelationship('galaxy-a',{fromEntityId:a1.id,toEntityId:a2.id,relationshipType:'ORBIT',evidenceState:'OBSERVED',evidenceHash:h('a-edge'),source:'boundary-test',observedAt:'2026-09-30T00:00:10Z',endedAt:null,metadata:{}});
    await s.addEvent('galaxy-a',{eventType:'CHANGE',entityId:a1.id,relationshipId:ar!.id,evidenceState:'OBSERVED',summary:'Observed A change',evidenceHash:h('a-event'),source:'boundary-test',occurredAt:'2026-09-30T00:00:20Z',metadata:{}});
    expect(await s.addRelationship('galaxy-a',{fromEntityId:a1.id,toEntityId:b1.id,relationshipType:'ORBIT',evidenceState:'OBSERVED',evidenceHash:h('cross-edge'),source:'boundary-test',observedAt:'2026-09-30T00:00:30Z',endedAt:null,metadata:{}})).toBeNull();
    expect(await s.addEvent('galaxy-a',{eventType:'CHANGE',entityId:b1.id,relationshipId:null,evidenceState:'OBSERVED',summary:'Cross tenant attempt',evidenceHash:h('cross-event'),source:'boundary-test',occurredAt:'2026-09-30T00:00:40Z',metadata:{}})).toBeNull();
    const a=await s.snapshot('galaxy-a','2026-09-30T00:02:00Z');
    expect(a.organizationId).toBe('galaxy-a');
    expect(a.entities.map(x=>x.id)).toEqual(expect.arrayContaining([a1.id,a2.id]));
    expect(a.entities.map(x=>x.id)).not.toContain(b1.id);
    expect(a.relationships.every(x=>a.entities.some(e=>e.id===x.fromEntityId)&&a.entities.some(e=>e.id===x.toEntityId))).toBe(true);
    expect(JSON.stringify(a)).not.toContain('B Secret Sun');
    await s.close();
  });

  it('ordinary tenant identities cannot read a foreign tenant record',()=>{
    const foreign={asset:{organizationId:'galaxy-b'}} as VerificationRecord;
    for(const role of ['viewer','creator','reviewer','moderator','analyst','organization_admin'] as const)
      expect(canReadTenantRecord({keyId:'attacker',organizationId:'galaxy-a',role},foreign)).toBe(false);
  });
});
