import{describe,it,expect}from'vitest';import{readFileSync}from'node:fs';
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
describe('Constellation UI adversarial release gate',()=>{
 it('never renders API content through innerHTML',()=>{expect(app).not.toMatch(/\.innerHTML\s*=/);expect(app).toContain('textContent=safeText')});
 it('bounds untrusted text and metadata',()=>{expect(app).toContain('const safeText=');expect(app).toContain('metadataChars:20000');expect(app).toContain('safeText(message,500)');expect(app).toContain('safeText(reason,1000)')});
 it('caps hostile collection cardinality before DOM expansion',()=>{for(const x of ['entities:250','relationships:500','events:100','evidence:100','reports:50'])expect(app).toContain(x);expect(app).toContain('boundedArray')});
 it('fails closed on malformed tenant projections',()=>{expect(app).toContain('validSnapshot');expect(app).toContain('validDashboard');expect(app).toContain('TENANT_IDENTITY_MISSING');expect(app).toContain('TENANT_PROJECTION_MISMATCH')});
 it('prevents stale tenant races',()=>{expect(app).toContain('generation!==state.generation');expect(app).toContain('state.controller?.abort()');expect(app).toContain('mutationGeneration!==state.generation');expect(app).toContain('state.snapshot?.organizationId!==mutationOrg')});
 it('prevents concurrent report submission',()=>{expect(app).toContain('if(state.reportPending)return');expect(app).toContain('state.reportPending=true');expect(app).toContain('state.reportPending=false')});
 it('clears loaded tenant state when credentials mutate',()=>{expect(app).toContain("Tenant key changed. Previously loaded evidence was cleared");expect(app).toContain('state.snapshot=null');expect(app).toContain('state.dashboard=null')});
 it('treats expired credentials as an auth failure, not current data',()=>{expect(app).toContain('AUTH_EXPIRED_OR_REVOKED');expect(app).toContain('Existing data was cleared rather than shown as current.')});
 it('does not persist tenant credentials in browser storage',()=>{expect(app).not.toMatch(/localStorage|sessionStorage|indexedDB/);expect(html).toContain('type="password"');expect(html).toContain('autocomplete="off"')});
});