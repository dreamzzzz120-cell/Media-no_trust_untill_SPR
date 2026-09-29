import {describe,expect,it} from 'vitest';
import {createBoundaryStore} from '../src/boundaries.js';
describe('action boundary engine',()=>{
 it('fails closed without a boundary',async()=>{const s=createBoundaryStore();const r=await s.evaluate('o','a',{actionType:'payment',numericValue:10,unit:'CAD'});expect(r.decision).toBe('REQUIRE_HUMAN');expect(r.failClosed).toBe(true);await s.close()});
 it('allows within boundary and requires review above it',async()=>{const s=createBoundaryStore();await s.create('o',{aiId:'a',name:'payment limit',version:1,actionType:'payment',effect:'REQUIRE_HUMAN',maxNumericValue:2000,unit:'CAD',enabled:true});expect((await s.evaluate('o','a',{actionType:'payment',numericValue:100,unit:'CAD'})).decision).toBe('ALLOW');expect((await s.evaluate('o','a',{actionType:'payment',numericValue:80000,unit:'CAD'})).decision).toBe('REQUIRE_HUMAN');await s.close()});
});
