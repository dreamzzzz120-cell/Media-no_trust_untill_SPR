import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { withTenant } from '../src/db-tenant.js';

const url=process.env.DATABASE_URL;

describe.skipIf(!url)('tenant context pool reset',()=>{
  it('does not leak app.organization_id across reused pooled connections',async()=>{
    const admin=postgres(url!,{prepare:false});
    const role='tenant_pool_probe_login';
    const password='pool-'+randomUUID();
    const a=randomUUID(),b=randomUUID(),ea=randomUUID(),eb=randomUUID();
    const u=new URL(url!);
    try{
      await admin.unsafe(`DROP ROLE IF EXISTS ${role}`);
      await admin.unsafe(`CREATE ROLE ${role} LOGIN PASSWORD '${password.replaceAll("'","''")}' NOSUPERUSER NOBYPASSRLS`);
      await admin.unsafe(`GRANT USAGE ON SCHEMA public TO ${role}; GRANT SELECT ON constellation_entities TO ${role}`);
      await admin`INSERT INTO organizations(id,name) VALUES(${a},'Pool A'),(${b},'Pool B')`;
      await admin`INSERT INTO constellation_entities(id,organization_id,identity_key,entity_type,name,evidence_state,evidence_hash,source,first_observed_at,last_observed_at,metadata) VALUES
      (${ea},${a},'pool-a','SYSTEM','Pool A','OBSERVED',${'a'.repeat(64)},'pool-test',now(),now(),'{}'),
      (${eb},${b},'pool-b','SYSTEM','Pool B','OBSERVED',${'b'.repeat(64)},'pool-test',now(),now(),'{}')`;
      u.username=role;u.password=password;
      const client=postgres(u.toString(),{prepare:false,max:1});
      try{
        const seenA=await withTenant(client,a,tx=>tx<any[]>`SELECT organization_id FROM constellation_entities ORDER BY organization_id`);
        expect(seenA.map(x=>x.organization_id)).toEqual([a]);
        const seenB=await withTenant(client,b,tx=>tx<any[]>`SELECT organization_id FROM constellation_entities ORDER BY organization_id`);
        expect(seenB.map(x=>x.organization_id)).toEqual([b]);
        const after=await client<any[]>`SELECT organization_id FROM constellation_entities`;
        expect(after).toHaveLength(0);
        for(let i=0;i<20;i++){
          const org=i%2===0?a:b;
          const rows=await withTenant(client,org,tx=>tx<any[]>`SELECT organization_id FROM constellation_entities`);
          expect(rows).toHaveLength(1);
          expect(rows[0].organization_id).toBe(org);
        }
      }finally{await client.end({timeout:5})}
    }finally{
      await admin`DELETE FROM constellation_entities WHERE id IN (${ea},${eb})`.catch(()=>undefined);
      await admin`DELETE FROM organizations WHERE id IN (${a},${b})`.catch(()=>undefined);
      await admin.unsafe(`REVOKE ALL PRIVILEGES ON constellation_entities FROM ${role}; REVOKE USAGE ON SCHEMA public FROM ${role}; DROP ROLE IF EXISTS ${role}`).catch(()=>undefined);
      await admin.end({timeout:5});
    }
  });
});
