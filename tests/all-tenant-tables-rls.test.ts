import postgres from 'postgres';
import { describe, expect, it } from 'vitest';
const url=process.env.DATABASE_URL;

describe.skipIf(!url)('all tenant tables are database isolated',()=>{
  it('requires RLS + FORCE RLS + tenant policy on every organization_id table',async()=>{
    const sql=postgres(url!,{prepare:false});
    try{
      const rows=await sql.unsafe(`
        SELECT c.relname,
               c.relrowsecurity,
               c.relforcerowsecurity,
               EXISTS (
                 SELECT 1 FROM pg_policies p
                 WHERE p.schemaname='public'
                   AND p.tablename=c.relname
                   AND p.policyname='tenant_isolation'
               ) AS has_tenant_policy
        FROM pg_class c
        JOIN pg_namespace n ON n.oid=c.relnamespace
        JOIN pg_attribute a ON a.attrelid=c.oid
        WHERE n.nspname='public'
          AND c.relkind='r'
          AND a.attname='organization_id'
          AND a.attisdropped=false
        ORDER BY c.relname
      `);
      expect(rows.length).toBeGreaterThan(10);
      const failures=rows.filter((r:any)=>!r.relrowsecurity||!r.relforcerowsecurity||!r.has_tenant_policy)
        .map((r:any)=>({table:r.relname,rls:r.relrowsecurity,force:r.relforcerowsecurity,policy:r.has_tenant_policy}));
      expect(failures,'Every organization_id table must be fail-closed at PostgreSQL').toEqual([]);
    }finally{await sql.end({timeout:5})}
  });
});
