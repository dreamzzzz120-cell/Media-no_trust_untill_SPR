import postgres from'postgres';import{describe,it,expect}from'vitest';import{randomUUID}from'node:crypto';
const url=process.env.DATABASE_URL;
describe.skipIf(!url)('Constellation PostgreSQL RLS adversarial runtime',()=>{
 it('database policy prevents Galaxy A from reading or writing Galaxy B rows',async()=>{const admin=postgres(url!,{prepare:false});const role='constellation_rls_probe';const a=randomUUID(),b=randomUUID(),ea=randomUUID(),eb=randomUUID();try{
  await admin.unsafe(`DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='${role}') THEN CREATE ROLE ${role} NOLOGIN; END IF; END $$`);
  await admin.unsafe(`GRANT USAGE ON SCHEMA public TO ${role}; GRANT SELECT,INSERT,UPDATE,DELETE ON constellation_entities TO ${role}`);
  await admin`INSERT INTO constellation_entities(id,organization_id,identity_key,entity_type,name,evidence_state,evidence_hash,source,first_observed_at,last_observed_at,metadata) VALUES(${ea},${a},'a','SYSTEM','A','OBSERVED',${'a'.repeat(64)},'rls-test',now(),now(),'{}')`;
  await admin`INSERT INTO constellation_entities(id,organization_id,identity_key,entity_type,name,evidence_state,evidence_hash,source,first_observed_at,last_observed_at,metadata) VALUES(${eb},${b},'b','SYSTEM','B','OBSERVED',${'b'.repeat(64)},'rls-test',now(),now(),'{}')`;
  await admin.begin(async tx=>{await tx.unsafe(`SET LOCAL ROLE ${role}`);await tx`SELECT set_config('app.organization_id',${a},true)`;const visible=await tx`SELECT organization_id FROM constellation_entities WHERE id IN (${ea},${eb})`;expect(visible.map((x:any)=>x.organization_id)).toEqual([a]);await expect(tx`UPDATE constellation_entities SET name='PWNED' WHERE id=${eb} RETURNING id`).resolves.toHaveLength(0)});
 }finally{await admin`DELETE FROM constellation_entities WHERE id IN (${ea},${eb})`;await admin.unsafe(`DROP ROLE IF EXISTS ${role}`);await admin.end({timeout:5})}});
});