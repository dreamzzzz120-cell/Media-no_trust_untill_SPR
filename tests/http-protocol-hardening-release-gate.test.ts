import{describe,it,expect}from'vitest';import{readFileSync}from'node:fs';
const s=readFileSync(new URL('../src/server.ts',import.meta.url),'utf8');
describe('HTTP protocol hardening release gate',()=>{
 it('enables Fastify prototype and constructor poisoning rejection',()=>{expect(s).toContain("onProtoPoisoning:'error'");expect(s).toContain("onConstructorPoisoning:'error'")});
 it('rejects TRACE and CONNECT',()=>{expect(s).toContain("method==='TRACE'||method==='CONNECT'");expect(s).toContain("METHOD_NOT_ALLOWED")});
 it('rejects method override headers',()=>{expect(s).toContain("x-http-method-override");expect(s).toContain("METHOD_OVERRIDE_FORBIDDEN")});
 it('bounds request URI length',()=>{expect(s).toContain("path.length>2048");expect(s).toContain("URI_TOO_LONG")});
});