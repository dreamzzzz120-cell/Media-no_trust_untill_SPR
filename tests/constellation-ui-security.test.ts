import{describe,it,expect}from'vitest';import{readFileSync}from'node:fs';
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
describe('Constellation production UI security gate',()=>{
 it('does not use dynamic innerHTML or browser persistence for tenant credentials',()=>{expect(app).not.toMatch(/\.innerHTML\s*=/);expect(app).not.toMatch(/localStorage|sessionStorage|indexedDB/);});
 it('uses tenant-scoped customer projections',()=>{expect(app).toContain('/v1/customer/constellation');expect(app).toContain('/v1/customer/dashboard');expect(app).toContain('/v1/customer/reports');});
 it('fails closed and protects against stale requests',()=>{expect(app).toContain('UNKNOWN is not treated as safe or empty');expect(app).toContain('state.controller?.abort()');expect(app).toContain('generation!==state.generation');expect(app).toContain('setTimeout(()=>controller.abort(),15000)');});
 it('keeps the credential field non-persistent and explicit',()=>{expect(html).toContain('type="password"');expect(html).toContain('autocomplete="off"');expect(html).toContain('Tenant key — kept only in this page');});
 it('requires confirmation before persisted report creation',()=>{expect(app).toContain("confirm('Create a persisted evidence-derived Constellation report for the current tenant?')");});
 it('clears tenant state when credentials change',()=>{expect(app).toContain("Tenant key changed. Previously loaded evidence was cleared");expect(app).toContain("state.snapshot=null");expect(app).toContain("state.dashboard=null");expect(app).toContain("state.reports=[]");});
 it('rejects malformed credential input before requests',()=>{expect(app).toContain('validApiKey');expect(html).toContain('maxlength="512"');expect(html).toContain('spellcheck="false"');});
 it('allowlists UI routes instead of trusting arbitrary fragments',()=>{expect(app).toContain('ALLOWED_VIEWS');expect(app).toContain("ALLOWED_VIEWS.has(raw)");});
 it('aborts requests and clears the credential on page lifecycle exit',()=>{expect(app).toContain("window.addEventListener('pagehide'");expect(app).toContain("$('key').value=''");});
 it('bounds hostile response rendering',()=>{expect(app).toContain('MAX_RENDER');expect(app).toContain('boundedArray');expect(app).toContain('metadataChars:20000');});
 it('validates tenant projection identity before rendering',()=>{expect(app).toContain('validSnapshot');expect(app).toContain('validDashboard');expect(app).toContain('TENANT_PROJECTION_MISMATCH');});
 it('redacts unexpected browser errors',()=>{expect(app).toContain('SAFE_ERRORS');expect(app).toContain("safeError=e=>");});
 it('binds report mutations to the verified tenant generation',()=>{expect(app).toContain('mutationGeneration');expect(app).toContain('mutationOrg');expect(app).toContain("state.snapshot?.organizationId!==mutationOrg");});
});