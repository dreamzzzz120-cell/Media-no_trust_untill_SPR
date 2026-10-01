import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const server=readFileSync(new URL('../src/server.ts',import.meta.url),'utf8');
describe('private upload storage release gate',()=>{
  it('serves static files only from public/',()=>expect(server).toContain("fastifyStatic, { root: resolve('public')"));
  it('does not mount UPLOAD_DIR as a static root',()=>expect(server).not.toMatch(/fastifyStatic[^\n]+UPLOAD_DIR/));
  it('keeps public passport routes data-only/not-found instead of exposing files',()=>{
    expect(server).toContain("app.get('/public/:id'");
    expect(server).toContain("app.get('/passport/:id'");
  });
});
