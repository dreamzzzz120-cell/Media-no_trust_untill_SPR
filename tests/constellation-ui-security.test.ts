import{describe,it,expect}from'vitest';import{readFileSync}from'node:fs';
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
describe('Constellation production UI security gate',()=>{
 it('does not use dynamic innerHTML or browser persistence for tenant credentials',()=>{expect(app).not.toMatch(/\.innerHTML\s*=/);expect(app).not.toMatch(/localStorage|sessionStorage|indexedDB/);});
 it('uses tenant-scoped customer projections',()=>{expect(app).toContain('/v1/customer/constellation');expect(app).toContain('/v1/customer/dashboard');expect(app).toContain('/v1/customer/reports');});
 it('fails closed and protects against stale requests',()=>{expect(app).toContain('UNKNOWN is not treated as safe or empty');expect(app).toContain('state.controller?.abort()');expect(app).toContain('generation!==state.generation');expect(app).toContain('setTimeout(()=>controller.abort(),15000)');});
 it('keeps the credential field non-persistent and explicit',()=>{expect(html).toContain('type="password"');expect(html).toContain('autocomplete="off"');expect(html).toContain('Tenant key — kept only in this page');});
 it('requires confirmation before persisted report creation',()=>{expect(app).toContain("confirm('Create a persisted evidence-derived Constellation report for the current tenant?')");});
});