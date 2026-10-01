import postgres from 'postgres';
import { describe, it, expect } from 'vitest';
const url=process.env.DATABASE_URL;
const protectedTables=['customer_reports','universe_authority_roots','universe_licenses','universe_missions','universe_mission_members','universe_action_receipts','universe_authority_evaluations','universe_action_attempts','universe_authority_status_events','universe_authority_freshness','universe_delegations','universe_handoff_receipts','universe_investigations','universe_investigation_items','universe_timeline_snapshots','universe_mission_budgets','universe_resource_consumption','universe_budget_evaluations'];
describe.skipIf(!url)('Constellation control-plane RLS coverage',()=>{
 it('forces RLS and installs tenant policy on every control-plane table',async()=>{
  const sql=postgres(url!,{prepare:false});
  try{
   const rows=await sql.unsafe("SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity,(SELECT count(*)::int FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=c.relname AND p.policyname='tenant_isolation') AS policy_count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'");
   const by=new Map(rows.map((r:any)=>[r.relname,r]));
   for(const t of protectedTables){const r:any=by.get(t);expect(r,t).toBeTruthy();expect(r.relrowsecurity,t+' RLS').toBe(true);expect(r.relforcerowsecurity,t+' FORCE RLS').toBe(true);expect(Number(r.policy_count),t+' tenant policy').toBe(1)}
  }finally{await sql.end({timeout:5})}
 });
});
