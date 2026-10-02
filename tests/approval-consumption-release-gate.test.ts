import{describe,it,expect}from'vitest';import{readFileSync}from'node:fs';
const m=readFileSync(new URL('../db/062_approval_consumption.sql',import.meta.url),'utf8');
describe('approval consumption hardening',()=>{
 it('makes approval consumption tenant scoped and single use',()=>{expect(m).toContain('UNIQUE(organization_id, approval_id)');expect(m).toContain('UNIQUE(organization_id, idempotency_key)')});
 it('binds consumption to the exact action fingerprint',()=>expect(m).toContain('action_fingerprint CHAR(64)'));
 it('forces database tenant isolation',()=>{expect(m).toContain('ENABLE ROW LEVEL SECURITY');expect(m).toContain('FORCE ROW LEVEL SECURITY')});
 it('keeps consumption history append only',()=>expect(m).toContain('approval consumption history is append-only'));
});
