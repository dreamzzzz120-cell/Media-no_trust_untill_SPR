import postgres from 'postgres';
import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
const url=process.env.DATABASE_URL;

describe.skipIf(!url)('cross-tenant object-id adversarial gate',()=>{
  it('blocks foreign and guessed IDs across constellation, reports and evidence',async()=>{
    const admin=postgres(url!,{prepare:false});
    const role='galaxy_object_attack_probe';
    const a=randomUUID(),b=randomUUID();
    const ea=randomUUID(),ea2=randomUUID(),eb=randomUUID();
    const ra=randomUUID(),rb=randomUUID(),eva=randomUUID(),evb=randomUUID();
    const srcA=randomUUID(),srcB=randomUUID(),obsA=randomUUID(),obsB=randomUUID(),evidA=randomUUID(),evidB=randomUUID();
    const reportA=randomUUID(),reportB=randomUUID();
    const guessed=randomUUID();
    try{
      await admin.unsafe(`DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='${role}') THEN CREATE ROLE ${role} NOLOGIN; END IF; END $$`);
      await admin.unsafe(`GRANT USAGE ON SCHEMA public TO ${role}; GRANT SELECT,INSERT,UPDATE,DELETE ON constellation_entities,constellation_relationships,constellation_events,customer_reports,evidence_sources,canonical_observations,canonical_evidence TO ${role}`);
      await admin`INSERT INTO organizations(id,name) VALUES(${a},'Galaxy A object attack'),(${b},'Galaxy B object attack')`;
      for(const [id,org,key,name,h] of [[ea,a,'a-1','A1','a'],[ea2,a,'a-2','A2','b'],[eb,b,'b-1','B1','c']] as const)
        await admin`INSERT INTO constellation_entities(id,organization_id,identity_key,entity_type,name,evidence_state,evidence_hash,source,first_observed_at,last_observed_at,metadata) VALUES(${id},${org},${key},'SYSTEM',${name},'OBSERVED',${h.repeat(64)},'attack',now(),now(),'{}')`;
      await admin`INSERT INTO constellation_relationships(id,organization_id,from_entity_id,to_entity_id,relationship_type,evidence_state,evidence_hash,source,observed_at,metadata) VALUES(${ra},${a},${ea},${ea2},'DEPENDENCY','OBSERVED',${'d'.repeat(64)},'attack',now(),'{}')`;
      await admin`INSERT INTO constellation_relationships(id,organization_id,from_entity_id,to_entity_id,relationship_type,evidence_state,evidence_hash,source,observed_at,metadata) VALUES(${rb},${b},${eb},${eb},'DEPENDENCY','OBSERVED',${'e'.repeat(64)},'attack',now(),'{}')`.catch(()=>undefined);
      await admin`INSERT INTO constellation_events(id,organization_id,event_type,entity_id,evidence_state,summary,evidence_hash,source,occurred_at,metadata) VALUES(${eva},${a},'CHANGE',${ea},'OBSERVED','A event',${'f'.repeat(64)},'attack',now(),'{}')`;
      await admin`INSERT INTO constellation_events(id,organization_id,event_type,entity_id,evidence_state,summary,evidence_hash,source,occurred_at,metadata) VALUES(${evb},${b},'CHANGE',${eb},'OBSERVED','B event',${'1'.repeat(64)},'attack',now(),'{}')`;
      await admin`INSERT INTO customer_reports(id,organization_id,report_type,as_of,coverage_state,content,content_hash) VALUES(${reportA},${a},'ATTACK',now(),'SUPPORTED','{}',${'2'.repeat(64)}),(${reportB},${b},'ATTACK',now(),'SUPPORTED','{}',${'3'.repeat(64)})`;
      await admin`INSERT INTO evidence_sources(id,organization_id,source_type,name,collector) VALUES(${srcA},${a},'TEST','A','attack'),(${srcB},${b},'TEST','B','attack')`;
      await admin`INSERT INTO canonical_observations(id,organization_id,source_id,subject_type,subject_id,observation_type,content,content_digest,observed_at,collected_at,validation_state) VALUES(${obsA},${a},${srcA},'SYSTEM','a','TEST','{}',${'4'.repeat(64)},now(),now(),'OBSERVED'),(${obsB},${b},${srcB},'SYSTEM','b','TEST','{}',${'5'.repeat(64)},now(),now(),'OBSERVED')`;
      await admin`INSERT INTO canonical_evidence(id,organization_id,observation_id,evidence_type,digest,validation_state) VALUES(${evidA},${a},${obsA},'TEST',${'6'.repeat(64)},'OBSERVED'),(${evidB},${b},${obsB},'TEST',${'7'.repeat(64)},'OBSERVED')`;
      await admin.begin(async tx=>{
        await tx.unsafe(`SET LOCAL ROLE ${role}`);
        await tx`SELECT set_config('app.organization_id',${a},true)`;
        const checks=[
          ['entity',eb,'constellation_entities'],['relationship',rb,'constellation_relationships'],['event',evb,'constellation_events'],
          ['report',reportB,'customer_reports'],['evidence',evidB,'canonical_evidence'],['guessed',guessed,'constellation_entities']
        ] as const;
        for(const [label,id,table] of checks){
          const rows=await tx.unsafe(`SELECT id FROM ${table} WHERE id=$1`,[id]);
          expect(rows,label).toHaveLength(0);
        }
        expect((await tx`SELECT id FROM constellation_entities WHERE id=${ea}`).length).toBe(1);
        expect((await tx`SELECT id FROM customer_reports WHERE id=${reportA}`).length).toBe(1);
        expect((await tx`SELECT id FROM canonical_evidence WHERE id=${evidA}`).length).toBe(1);
      });
    }finally{
      await admin`DELETE FROM canonical_evidence WHERE organization_id IN (${a},${b})`;
      await admin`DELETE FROM canonical_observations WHERE organization_id IN (${a},${b})`;
      await admin`DELETE FROM evidence_sources WHERE organization_id IN (${a},${b})`;
      await admin`DELETE FROM customer_reports WHERE organization_id IN (${a},${b})`;
      await admin`DELETE FROM constellation_events WHERE organization_id IN (${a},${b})`;
      await admin`DELETE FROM constellation_relationships WHERE organization_id IN (${a},${b})`;
      await admin`DELETE FROM constellation_entities WHERE organization_id IN (${a},${b})`;
      await admin`DELETE FROM organizations WHERE id IN (${a},${b})`;
      await admin.unsafe(`REVOKE ALL PRIVILEGES ON constellation_entities,constellation_relationships,constellation_events,customer_reports,evidence_sources,canonical_observations,canonical_evidence FROM ${role}; REVOKE USAGE ON SCHEMA public FROM ${role}; DROP ROLE IF EXISTS ${role}`);
      await admin.end({timeout:5});
    }
  });
});
