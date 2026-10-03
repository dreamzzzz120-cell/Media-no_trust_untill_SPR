import {describe,it,expect} from 'vitest';
import {createHash,createHmac} from 'node:crypto';
import {assertRegistryItem,canonicalRegistryJson,simulateRegistryAuthority} from '../src/galaxy-registry.js';

const h=(s:string)=>createHash('sha256').update(s).digest('hex');
const item={registryId:'github:owner/repo',kind:'REPOSITORY' as const,name:'repo',repositoryUrl:'https://github.com/owner/repo',version:null,evidenceState:'OBSERVED' as const,evidenceHash:h('repo'),observedAt:'2026-10-03T20:00:00.000Z',provenance:{source:'SPR'},capabilities:[],dependencies:[]};

describe('SPR Galaxy registry boundary',()=>{
 it('accepts evidence without importing authority',()=>{expect(()=>assertRegistryItem(item)).not.toThrow()});
 it('rejects portable authority conclusions',()=>{expect(()=>assertRegistryItem({...item,registryId:'x',provenance:{approved:true}})).toThrow('REGISTRY_CANNOT_PORT_AUTHORITY')});
 it('rejects portable trust scores',()=>{expect(()=>assertRegistryItem({...item,registryId:'x',provenance:{trustScore:99}})).toThrow('REGISTRY_CANNOT_PORT_AUTHORITY')});
 it('simulation has no side effects and missing local authority stays UNKNOWN',()=>{const r=simulateRegistryAuthority({actorEntityId:'00000000-0000-4000-8000-000000000001',actionType:'READ',authorityStatus:'UNKNOWN'});expect(r.sideEffects).toBe(false);expect(r.decision).toBe('UNKNOWN')});
 it('canonical JSON is stable across object key order for M2M signing',()=>{const a=canonicalRegistryJson({b:2,a:{d:4,c:3}});const b=canonicalRegistryJson({a:{c:3,d:4},b:2});expect(a).toBe(b);const secret='x'.repeat(32);expect(createHmac('sha256',secret).update('1700000000.'+a).digest('hex')).toBe(createHmac('sha256',secret).update('1700000000.'+b).digest('hex'))});
});
