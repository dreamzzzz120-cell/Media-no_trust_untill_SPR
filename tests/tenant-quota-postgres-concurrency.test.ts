import {describe,expect,it} from 'vitest';
import postgres from 'postgres';
import {randomUUID} from 'node:crypto';
import {TenantQuotaStore} from '../src/tenant-quota.js';
const url=process.env.DATABASE_URL;

describe.skipIf(!url)('tenant quota PostgreSQL concurrency gate',()=>{
  it('cannot oversubscribe a tenant limit under concurrent requests',async()=>{
    const sql=postgres(url!,{prepare:false});
    const org=randomUUID();
    await sql`INSERT INTO organizations(id,name) VALUES(${org},'Quota race test')`;
    await sql.end({timeout:5});
    const store=new TenantQuotaStore(url!,{max:20,statementTimeoutMs:5000});
    try{
      const limit=10;
      const results=await Promise.all(Array.from({length:50},()=>store.consume(org,'GRAPH',limit,60000)));
      const allowed=results.filter(x=>x.allowed).length;
      expect(allowed).toBe(limit);
      expect(results.filter(x=>!x.allowed).length).toBe(40);
      expect(results.every(x=>x.remaining>=0)).toBe(true);
    }finally{
      await store.close();
      const cleanup=postgres(url!,{prepare:false});
      await cleanup`DELETE FROM tenant_rate_windows WHERE scope_key=${org}`;
      await cleanup`DELETE FROM organizations WHERE id=${org}`;
      await cleanup.end({timeout:5});
    }
  });
});
