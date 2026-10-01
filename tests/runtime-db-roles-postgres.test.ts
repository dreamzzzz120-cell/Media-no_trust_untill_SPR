import postgres from 'postgres';
import {describe,expect,it} from 'vitest';
import {randomUUID} from 'node:crypto';
import {withTenant} from '../src/db-tenant.js';
const url=process.env.DATABASE_URL;

const roleUrl=(base:string,role:string)=>{const u=new URL(base);u.searchParams.set('options','-c role='+role);return u.toString()};

describe.skipIf(!url)('runtime database role gate',()=>{
 it('starts API and worker sessions in non-bypass roles with narrow worker claims',async()=>{
  const admin=postgres(url!,{prepare:false});const org=randomUUID(),entity=randomUUID();
  await admin`INSERT INTO organizations(id,name) VALUES(${org},'Runtime role gate')`;
  await admin`INSERT INTO constellation_entities(id,organization_id,identity_key,entity_type,name,evidence_state,evidence_hash,source,first_observed_at,last_observed_at,metadata) VALUES(${entity},${org},'runtime-role-gate','SYSTEM','Runtime Role Gate','OBSERVED',${'a'.repeat(64)},'ci',now(),now(),'{}')`;
  const api=postgres(roleUrl(url!,'constellation_api_runtime'),{prepare:false,max:1});
  const worker=postgres(roleUrl(url!,'constellation_worker_runtime'),{prepare:false,max:1});
  try{
   const ar=await api<{current_user:string;session_user:string;super:boolean;bypass:boolean}[]>`SELECT current_user,session_user,r.rolsuper super,r.rolbypassrls bypass FROM pg_roles r WHERE r.rolname=current_user`;
   expect(ar[0]?.current_user).toBe('constellation_api_runtime');expect(ar[0]?.super).toBe(false);expect(ar[0]?.bypass).toBe(false);
   expect(await api`SELECT id FROM constellation_entities WHERE id=${entity}`).toHaveLength(0);
   expect(await withTenant(api,org,tx=>tx`SELECT id FROM constellation_entities WHERE id=${entity}`)).toHaveLength(1);
   await expect(api`SELECT * FROM claim_webhook_jobs(${randomUUID()}::uuid,1,30000)`).rejects.toBeTruthy();
   const wr=await worker<{current_user:string;super:boolean;bypass:boolean}[]>`SELECT current_user,r.rolsuper super,r.rolbypassrls bypass FROM pg_roles r WHERE r.rolname=current_user`;
   expect(wr[0]).toMatchObject({current_user:'constellation_worker_runtime',super:false,bypass:false});
   expect(await worker`SELECT * FROM claim_webhook_jobs(${randomUUID()}::uuid,1,30000)`).toEqual([]);
  }finally{await api.end({timeout:5});await worker.end({timeout:5});await admin.end({timeout:5})}
 });
});
