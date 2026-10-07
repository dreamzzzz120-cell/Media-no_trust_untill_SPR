import{beforeAll,afterAll,describe,it,expect}from'vitest';import{spawn,type ChildProcess}from'node:child_process';import{createServer}from'node:net';
let child:ChildProcess,base='',org='';const bootstrap='bootstrap-role-matrix-secret-1234567890';
const roles=['viewer','creator','reviewer','moderator','analyst','organization_admin','platform_admin','super_admin'] as const;
const keys=new Map<string,string>();
async function port(){return new Promise<number>((ok,no)=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const a=s.address();if(!a||typeof a==='string')return no(Error('NO_PORT'));const p=a.port;s.close(()=>ok(p))})})}
async function req(path:string,method='GET',key=bootstrap,body?:unknown){const r=await fetch(base+path,{method,headers:{'x-api-key':key,...(body===undefined?{}:{'content-type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)});let j:any=null;try{j=await r.json()}catch{}return{status:r.status,body:j}}
beforeAll(async()=>{const p=await port();base='http://127.0.0.1:'+p;child=spawn(process.execPath,['--import','tsx','src/server.ts'],{cwd:process.cwd(),env:{...process.env,NODE_ENV:'test',HOST:'127.0.0.1',PORT:String(p),REQUIRE_API_KEY:'true',API_KEY:bootstrap,BOOTSTRAP_API_ROLE:'super_admin'},stdio:'pipe'});for(let i=0;i<100;i++){try{if((await fetch(base+'/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,50))}const o=await req('/v1/organizations','POST',bootstrap,{name:'Role Matrix Org'});expect(o.status).toBe(201);org=o.body.id;for(const role of roles){const k=await req('/v1/api-keys','POST',bootstrap,{organizationId:org,name:'k-'+role,role});expect(k.status).toBe(201);keys.set(role,k.body.key)}});afterAll(async()=>{if(child&&child.exitCode===null){child.kill('SIGTERM');await new Promise(r=>setTimeout(r,100));if(child.exitCode===null)child.kill('SIGKILL')}});
const cases=[
 {path:'/v1/organizations',method:'POST',allowed:['platform_admin','super_admin'],body:{name:'Nope Org'}},
 {path:'/v1/api-keys',method:'POST',allowed:['organization_admin','platform_admin','super_admin'],body:()=>({organizationId:org,name:'candidate',role:'viewer'})},
 {path:'/v1/privacy/exports',method:'POST',allowed:['analyst','organization_admin','platform_admin','super_admin'],body:{exportType:'AUDIT',asOf:new Date().toISOString()}},
 {path:'/v1/privacy/deletions',method:'POST',allowed:['organization_admin','platform_admin','super_admin'],body:{subjectType:'SYSTEM',subjectId:'x',reason:'test'}},
 {path:'/v1/customer/reports',method:'POST',allowed:['analyst','organization_admin','platform_admin','super_admin'],body:{reportType:'AUDIT',asOf:new Date().toISOString()}},
 {path:'/v1/webhooks/deliveries/00000000-0000-4000-8000-000000000001/requeue',method:'POST',allowed:['organization_admin','platform_admin','super_admin'],body:{}},
 {path:'/v1/constellation/entities',method:'POST',allowed:['analyst','organization_admin','platform_admin','super_admin'],body:{}}
] as const;
describe('direct API role matrix adversarial gate',()=>{for(const c of cases)it(c.method+' '+c.path+' rejects every lower/unlisted role',async()=>{for(const role of roles){const r=await req(c.path,c.method,keys.get(role)!,typeof c.body==='function'?c.body():c.body);if(!c.allowed.includes(role as any))expect(r.status,role+' '+c.path).toBe(403);else expect(r.status,role+' '+c.path).not.toBe(403)}})});
