import postgres from 'postgres';
import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { withTenant } from '../src/db-tenant.js';

const url=process.env.DATABASE_URL;

describe.skipIf(!url)('tenant context pool isolation',()=>{
  it('does not leak app.organization_id between reused pooled transactions',async()=>{
    const sql=postgres(url!,{prepare:false,max:1});
    const a=randomUUID(),b=randomUUID();
    try{
      const seenA=await withTenant(sql,a,async tx=>{
        const r=await tx<{v:string}[]>`SELECT current_setting('app.organization_id',true) AS v`;
        return r[0]?.v;
      });
      expect(seenA).toBe(a);

      const outside=await sql<{v:string|null}[]>`SELECT nullif(current_setting('app.organization_id',true),'') AS v`;
      expect(outside[0]?.v??null).toBeNull();

      const seenB=await withTenant(sql,b,async tx=>{
        const r=await tx<{v:string}[]>`SELECT current_setting('app.organization_id',true) AS v`;
        return r[0]?.v;
      });
      expect(seenB).toBe(b);

      const after=await sql<{v:string|null}[]>`SELECT nullif(current_setting('app.organization_id',true),'') AS v`;
      expect(after[0]?.v??null).toBeNull();
    }finally{await sql.end({timeout:5})}
  });
});
