import {describe,expect,it} from 'vitest';
import {createConstellationStore} from '../src/constellation.js';
describe('Constellation',()=>{
 it('requires evidence for relationships and reconstructs visibility gaps',async()=>{
  const s=createConstellationStore();
  const a=await s.addNode('o',{nodeType:'AI',label:'Agent',evidenceState:'OBSERVED',aiIdentityId:null,metadata:{},firstObservedAt:'2026-09-28T20:00:00Z',lastObservedAt:'2026-09-28T20:00:00Z'});
  const b=await s.addNode('o',{nodeType:'API',label:'External API',evidenceState:'VERIFIED',aiIdentityId:null,metadata:{},firstObservedAt:'2026-09-28T20:01:00Z',lastObservedAt:'2026-09-28T20:01:00Z'});
  await expect(s.addEdge('o',{fromNodeId:a.id,toNodeId:b.id,relationType:'cross_environment_call',phenomenon:'WORMHOLE',evidenceState:'OBSERVED',evidenceRefs:[],firstObservedAt:'2026-09-28T20:02:00Z',lastObservedAt:'2026-09-28T20:02:00Z'})).rejects.toThrow('EVIDENCE_REQUIRED');
  await s.addEdge('o',{fromNodeId:a.id,toNodeId:b.id,relationType:'cross_environment_call',phenomenon:'WORMHOLE',evidenceState:'OBSERVED',evidenceRefs:['event:123'],firstObservedAt:'2026-09-28T20:02:00Z',lastObservedAt:'2026-09-28T20:02:00Z'});
  await s.addGap('o',{nodeId:b.id,gapType:'BLACK_HOLE',reason:'No observer is installed beyond the external API boundary.',evidenceRefs:['observer:missing'],observedAt:'2026-09-28T20:03:00Z'});
  const snap=await s.snapshot('o','2026-09-28T20:04:00Z');
  expect(snap.edges[0]?.phenomenon).toBe('WORMHOLE'); expect(snap.gaps[0]?.gapType).toBe('BLACK_HOLE'); expect(snap.semantics.BLACK_HOLE).toMatch(/Visibility ends/);
  await s.close();
 });
});
