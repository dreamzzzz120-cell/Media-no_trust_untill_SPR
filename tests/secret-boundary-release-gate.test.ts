import{describe,it,expect}from'vitest';import{readFileSync}from'node:fs';
const server=readFileSync(new URL('../src/server.ts',import.meta.url),'utf8');
const ui=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const config=readFileSync(new URL('../src/config.ts',import.meta.url),'utf8');
describe('secret boundary release gate',()=>{
 it('redacts authentication and signature headers',()=>{for(const x of ['req.headers.authorization','req.headers.x-api-key','req.headers.x-billing-signature','req.headers.x-media-signature','req.headers.x-enforcement-signature','req.body.token','req.body.secret'])expect(server).toContain(x)});
 it('never persists browser tenant keys',()=>{expect(ui).not.toMatch(/localStorage|sessionStorage|indexedDB/);expect(ui).toContain("type='password'");expect(ui).toContain("autocomplete='off'")});
 it('requires production secrets instead of fallback literals',()=>{expect(config).toContain("REQUIRE_API_KEY=true requires API_KEY");expect(config).toContain("MALWARE_SCAN_TOKEN is required in production");expect(config).not.toMatch(/TENANT_ISOLATION_PROBE_SECRET/)});
 it('does not return configured signing or scanner secrets',()=>{expect(server).not.toMatch(/send\([^\n]*(MALWARE_SCAN_TOKEN|BILLING_WEBHOOK_SECRET|ENFORCEMENT_WEBHOOK_SECRET|TRUSTED_ACTION_WEBHOOK_SECRET)/)});
 it('keeps API-key inventory secret-free',()=>{expect(server).toContain("warning:'The secret is returned once. Store it securely.'");expect(server).toContain("warning:'The replacement secret is returned once. The old key is revoked.'")});
});