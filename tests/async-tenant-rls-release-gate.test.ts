import postgres from 'postgres';import{describe,it,expect}from'vitest';
const url=process.env.DATABASE_URL;
const protectedTables=['export_jobs','export_artifacts','privacy_job_audit','deletion_requests','webhook_outbox','webhook_subscriptions','webhook_signing_keys','webhook_delivery_attempts','webhook_dead_letter_events','universe_approval_requirements','universe_approvals'];
describe.skipIf(!url)('async tenant/RLS production gate',()=>{
 it('forces RLS on exports, privacy jobs, webhooks and approvals',async()=>{const sql=postgres(url!,{prepare:false});try{const rows=await sql.unsafe("SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'");const by=new Map(rows.map((r:any)=>[r.relname,r]));for(const t of protectedTables){const r:any=by.get(t);expect(r,t).toBeTruthy();expect(r.relrowsecurity,t).toBe(true);expect(r.relforcerowsecurity,t).toBe(true)}}finally{await sql.end({timeout:5})}});
 it('rejects superuser/BYPASSRLS runtime roles when named',async()=>{const role=process.env.APP_DATABASE_ROLE;if(!role)return;const sql=postgres(url!,{prepare:false});try{const r=await sql`SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=${role}`;expect(r).toHaveLength(1);expect(r[0].rolsuper).toBe(false);expect(r[0].rolbypassrls).toBe(false)}finally{await sql.end({timeout:5})}});
});
