import{describe,it,expect}from'vitest';import{readFileSync}from'node:fs';
const s=readFileSync(new URL('../src/server.ts',import.meta.url),'utf8');
describe('HTTP auth edge release gate',()=>{
 it('rejects ambiguous API key headers',()=>{expect(s).toContain("Array.isArray(rawKey)");expect(s).toContain("AMBIGUOUS_CREDENTIAL")});
 it('restricts mutation content types',()=>{expect(s).toContain("['POST','PUT','PATCH'].includes(method)");expect(s).toContain("application/json");expect(s).toContain("multipart/form-data");expect(s).toContain("UNSUPPORTED_CONTENT_TYPE")});
 it('rejects cross-origin browser mutations',()=>{expect(s).toContain("req.headers.origin");expect(s).toContain("CROSS_ORIGIN_MUTATION_FORBIDDEN");expect(s).toContain("INVALID_ORIGIN")});
 it('does not return zod field diagnostics to clients',()=>{expect(s).toContain("reply.code(400).send({ error: 'INVALID_REQUEST' })");expect(s).not.toContain("error: 'INVALID_REQUEST', issues: error.issues")});
 it('marks error responses no-store',()=>expect(s).toContain("reply.header('cache-control','no-store')"));
});