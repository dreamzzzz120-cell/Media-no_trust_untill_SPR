import{describe,it,expect}from'vitest';import{readFileSync}from'node:fs';
const tenantStores=[
 'ai.ts','accountability.ts','commerce.ts','inventory-store.ts','governance-store.ts',
 'evidence-store.ts','authority-store.ts','customer-projections.ts','star-dna.ts'
];
describe('tenant DB context regression gate',()=>{
 it('requires transaction-local tenant context in every API tenant store',()=>{
  const failures:string[]=[];
  for(const file of tenantStores){
   const s=readFileSync(new URL('../src/'+file,import.meta.url),'utf8');
   if(!s.includes("withTenant"))failures.push(file);
  }
  expect(failures,'Tenant stores must establish app.organization_id on the same DB transaction').toEqual([]);
 });
 it('keeps Constellation on its explicit transaction-local tenant helper',()=>{
  const s=readFileSync(new URL('../src/constellation.ts',import.meta.url),'utf8');
  expect(s).toContain("set_config('app.organization_id'");
 });
 it('does not pretend cross-tenant worker queue discovery is tenant-scoped',()=>{
  const s=readFileSync(new URL('../src/webhook-delivery.ts',import.meta.url),'utf8');
  expect(s).toContain('async claim(');
  expect(s).toContain('withTenant');
 });
});
