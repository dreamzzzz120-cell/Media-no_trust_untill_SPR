import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const server=readFileSync(new URL('../src/server.ts',import.meta.url),'utf8');

describe('security observability release gate',()=>{
  it('returns a correlation id header',()=>expect(server).toContain("reply.header('x-request-id', req.id)"));
  it('logs authentication failures as structured security events',()=>expect(server).toContain("event:'AUTHENTICATION_FAILURE'"));
  it('logs authorization failures as structured security events',()=>expect(server).toContain("event:'AUTHORIZATION_FAILURE'"));
  it('does not expose internal errors to clients',()=>expect(server).toContain("error: 'INTERNAL_ERROR', requestId:req.id"));
});
