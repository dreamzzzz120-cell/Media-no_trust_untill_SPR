import{describe,it,expect}from'vitest';import{report,readiness}from'../src/reporting.js';
describe('customer reporting truth boundary',()=>{
 it('never turns an empty report into supported coverage',()=>{const r=report('org','customer','2026-09-30T00:00:00.000Z',[]);expect(r.content.coverage).toBe('UNKNOWN');expect(r.content.limitations.join(' ')).toMatch(/Missing evidence is not treated as a positive result/)});
 it('requires canonical evidence for supported sections',()=>{expect(()=>report('org','x','2026-09-30T00:00:00.000Z',[{name:'security',coverage:'SUPPORTED',facts:[{safe:true}],evidenceIds:[]}])).toThrow('SUPPORTED_REPORT_SECTION_REQUIRES_CANONICAL_EVIDENCE')});
 it('forbids asserted facts in UNKNOWN sections',()=>{expect(()=>report('org','x','2026-09-30T00:00:00.000Z',[{name:'compliance',coverage:'UNKNOWN',facts:[{compliant:true}]}])).toThrow('UNKNOWN_REPORT_SECTION_CANNOT_CONTAIN_ASSERTED_FACTS')});
 it('propagates incomplete coverage instead of manufacturing supported',()=>{const r=report('org','x','2026-09-30T00:00:00.000Z',[{name:'a',coverage:'SUPPORTED',facts:[1],evidenceIds:['00000000-0000-4000-8000-000000000001']},{name:'b',coverage:'UNKNOWN',facts:[]}]);expect(r.content.coverage).toBe('PARTIAL')});
 it('readiness keeps unknown distinct from ready',()=>{expect(readiness({db:true,scanner:null}).status).toBe('unknown');expect(readiness({db:true,scanner:false}).status).toBe('not_ready')});
});
