import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const server=readFileSync(new URL('../src/server.ts',import.meta.url),'utf8');
const publicMutations=new Set(['/v1/billing/provider-events','/v1/integrations/action-confirmations']);
const sharedHandlers=new Map<string,string>([
  ['/v1/media/verify','verifyUpload'],
  ['/v1/publisher/verify','verifyUpload'],
]);

describe('mutation RBAC surface gate',()=>{
  it('requires an explicit role gate on every non-public mutation route',()=>{
    const routes=[...server.matchAll(/app\.(post|put|patch|delete)\('([^']+)'\s*,/g)]
      .map(m=>({method:m[1].toUpperCase(),path:m[2],index:m.index??0}));
    expect(routes.length).toBeGreaterThan(20);
    const failures:string[]=[];
    for(const route of routes){
      if(publicMutations.has(route.path))continue;
      const handler=sharedHandlers.get(route.path);
      if(handler){
        const marker='const '+handler;
        const start=server.indexOf(marker);
        const end=server.indexOf("app.post('"+route.path,start);
        const body=server.slice(start,end>start?end:start+8000);
        if(!body.includes('requireRole('))failures.push(route.method+' '+route.path+' via '+handler);
        continue;
      }
      const body=server.slice(route.index,route.index+900);
      if(!body.includes('requireRole('))failures.push(route.method+' '+route.path);
    }
    expect(failures,'Every authenticated mutation needs server-side RBAC').toEqual([]);
  });
  it('keeps upload verification role-bounded',()=>{
    const start=server.indexOf('const verifyUpload');
    expect(start).toBeGreaterThan(-1);
    expect(server.slice(start,start+500)).toContain("['creator','analyst','organization_admin','platform_admin','super_admin']");
  });
});
