import{describe,it,expect}from'vitest';import{readFileSync}from'node:fs';
const h=readFileSync(new URL('../src/shadow-ai-collectors.ts',import.meta.url),'utf8');
describe('collector SSRF release gate',()=>{
 it('resolves DNS before connecting and rejects private answers',()=>{expect(h).toContain("lookup(hostname,{all:true,verbatim:true})");expect(h).toContain("addresses.some(x=>isPrivateAddress(x.address))");expect(h).toContain("COLLECTOR_PRIVATE_NETWORK_FORBIDDEN")});
 it('pins the validated address into the HTTPS connection',()=>{expect(h).toContain("lookup:(_hostname,_options,cb)=>cb(null,pinned.address,pinned.family)");expect(h).toContain("servername:u.hostname")});
 it('does not use global fetch which would re-resolve the hostname',()=>expect(h).not.toContain("await fetch("));
 it('forbids redirects and cross-origin path override',()=>{expect(h).toContain("COLLECTOR_REDIRECT_FORBIDDEN");expect(h).toContain("COLLECTOR_CROSS_ORIGIN_PATH_FORBIDDEN")});
 it('forbids URL credentials and requires HTTPS',()=>{expect(h).toContain("COLLECTOR_URL_CREDENTIALS_FORBIDDEN");expect(h).toContain("COLLECTOR_HTTPS_REQUIRED")});
});
