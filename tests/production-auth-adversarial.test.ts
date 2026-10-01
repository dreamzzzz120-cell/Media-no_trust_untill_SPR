import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer } from 'node:net';
import { readFileSync } from 'node:fs';
import { spawn, type ChildProcess } from 'node:child_process';
import http from 'node:http';

const source = readFileSync(new URL('../src/server.ts', import.meta.url), 'utf8');
let child: ChildProcess;
let base = '';

async function freePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const s = createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const a = s.address();
      if (!a || typeof a === 'string') return reject(new Error('NO_PORT'));
      const p = a.port;
      s.close((e) => e ? reject(e) : resolve(p));
    });
  });
}
async function waitReady(url:string){
  for(let i=0;i<120;i++){
    if(child.exitCode!==null) throw new Error('server exited during auth attack test');
    try{ const r=await fetch(url+'/health'); if(r.ok)return; }catch{}
    await new Promise(r=>setTimeout(r,50));
  }
  throw new Error('server did not start');
}
const publicPath=(path:string)=>path==='/health'||path==='/ready'||path==='/ready/ai'||path==='/'||path==='/v1/integrations/action-confirmations'||path==='/v1/billing/provider-events'||path.startsWith('/public/')||path.startsWith('/passport/')||path.startsWith('/app.')||path.startsWith('/styles.')||path.startsWith('/passport.')||path==='/ai.html'||path==='/ai.js'||path==='/docs'||path.startsWith('/docs/');
const concrete=(path:string)=>path.replace(/:id\b/g,'00000000-0000-4000-8000-000000000001').replace(/:name\b/g,'step').replace(/:domain\b/g,'AI').replace(/:recordId\b/g,'record-0000000001').replace(/:subjectType\b/g,'SYSTEM').replace(/:subjectId\b/g,'subject-000000001').replace(/:kind\b/g,'IMAGE').replace(/:assetId\b/g,'asset-000000001').replace(/:passportId\b/g,'passport-000000001');

function request(path:string,method:string,key?:string){
  return new Promise<number>((resolve,reject)=>{
    const u=new URL(base+path);
    const req=http.request({hostname:u.hostname,port:u.port,path:u.pathname+u.search,method,headers:key===undefined?{}:{'x-api-key':key}},res=>{res.resume();resolve(res.statusCode||0)});
    req.on('error',reject); req.end();
  });
}
function raw(payload:string){
  return new Promise<string>((resolve,reject)=>{
    const u=new URL(base); const s=createServer;
    const socket = require('node:net').connect({host:u.hostname,port:Number(u.port)},()=>socket.write(payload));
    let out=''; socket.setEncoding('utf8'); socket.on('data',(d:string)=>out+=d); socket.on('end',()=>resolve(out)); socket.on('close',()=>resolve(out)); socket.on('error',reject); socket.setTimeout(3000,()=>socket.destroy());
  });
}

beforeAll(async()=>{
  const port=await freePort(); base=`http://127.0.0.1:${port}`;
  child=spawn(process.execPath,['--import','tsx','src/server.ts'],{cwd:process.cwd(),env:{...process.env,NODE_ENV:'test',HOST:'127.0.0.1',PORT:String(port),REQUIRE_API_KEY:'true',API_KEY:'bootstrap-auth-attack-secret-1234567890',BOOTSTRAP_API_ROLE:'super_admin'},stdio:'pipe'});
  await waitReady(base);
});
afterAll(async()=>{ if(child && child.exitCode===null){ child.kill('SIGTERM'); await new Promise(r=>setTimeout(r,100)); if(child.exitCode===null)child.kill('SIGKILL'); } });

describe('production authentication adversarial gate',()=>{
  const routes=[...source.matchAll(/app\.(get|post|put|patch|delete)\('([^']+)'/g)].map(m=>({method:m[1].toUpperCase(),path:m[2]})).filter(x=>!publicPath(x.path));
  it('discovers protected route surface',()=>expect(routes.length).toBeGreaterThan(25));
  it('rejects missing credentials on every protected route before route behavior',async()=>{
    for(const r of routes) expect(await request(concrete(r.path),r.method),`${r.method} ${r.path}`).toBe(401);
  },30000);
  it('rejects wrong and scheme-confused credentials on every protected route',async()=>{
    for(const r of routes){
      expect(await request(concrete(r.path),r.method,'definitely-wrong-key'),`wrong ${r.method} ${r.path}`).toBe(401);
      expect(await request(concrete(r.path),r.method,'Bearer bootstrap-auth-attack-secret-1234567890'),`scheme ${r.method} ${r.path}`).toBe(401);
    }
  },30000);
  it('rejects duplicate x-api-key headers rather than accepting either credential',async()=>{
    const u=new URL(base);
    const response=await raw(`GET /v1/customer/constellation HTTP/1.1\r\nHost: ${u.host}\r\nx-api-key: bootstrap-auth-attack-secret-1234567890\r\nx-api-key: attacker\r\nConnection: close\r\n\r\n`);
    expect(response).toMatch(/^HTTP\/1\.1 (400|401) /);
  });
  it('rejects an oversized credential header at the HTTP boundary',async()=>{
    const u=new URL(base); const huge='x'.repeat(64*1024);
    const response=await raw(`GET /v1/customer/constellation HTTP/1.1\r\nHost: ${u.host}\r\nx-api-key: ${huge}\r\nConnection: close\r\n\r\n`);
    expect(response===''||/^HTTP\/1\.1 (400|413|431) /.test(response)).toBe(true);
  });
});
