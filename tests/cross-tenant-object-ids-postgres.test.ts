import postgres from 'postgres';
import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
const url=process.env.DATABASE_URL;
const ROLLBACK='__EXPECTED_ATTACK_ROLLBACK__';

describe.skipIf(!url)('cross-tenant object-id adversarial gate',()=>{
  it('blocks foreign and guessed IDs across constellation, reports and evidence',async()=>{
    const admin=postgres(url!,{prepare:false});
    const role='galaxy_object_attack_probe';
    try{
      await expect(admin.begin(async tx=>{
        const a=randomUUID(),b=randomUUID();
        const ea=randomUUID(),ea2=randomUUID(),eb=randomUUID(),eb2=randomUUID();
        const ra=randomUUID(),rb=randomUUID(),eva=randomUUID(),evb=randomUUID();
        const srcA=randomUUID(),srcB=randomUUID(),obsA=randomUUID(),obsB=randomUUID(),evidA=randomUUID(),evidB=randomUUID();
        const reportA=randomUUID(),reportB=randomUUID(),guessed=randomUUID();
        await tx.unsafe(`DROP ROLE IF EXISTS ${role}`);
        await tx.unsafe(`CREATE ROLE ${role} NOLOGIN`);
        await tx.unsafe(`GRANT USAGE ON SCHEMA public TO ${role}; GRANT SELECT,INSERT,UPDATE,DELETE ON constellation_entities,constellation_relationships,constellation_events,customer_reports,evidence_sources,canonical_observations,canonical_evidence TO ${role}`);
        await tx`INSERT INTO organizations(id,name) VALUES(${a},'Galaxy A object attack'),(${b},'Galaxy B object attack')`;
        const rows=[[ea,a,'a-1','A1','a'],[ea2,a,'a-2','A2','b'],[eb,b,'b-1','B1','c'],[eb2,b,'b-2','B2','d']] as const;
        for(const [id,org,key,name,h] of rows)
          await tx`INSERT INTO constellation_entities(id,organization_id,identity_key,entity_type,name,evidence_state,evidence_hash,source,first_observed_at,last_observed_at,metadata) VALUES(${id},${org},${key},'SYSTEM',${name},'OBSERVED',${h.repeat(64)},'attack',now(),now(),'{}')`;
        await tx`INSERT INTO constellation_relationships(id,organization_id,from_entity_id,to_entity_id,relationship_type,evidence_state,evidence_hash,source,observed_at,metadata) VALUES(${ra},${a},${ea},${ea2},'DEPENDENCY','OBSERVED',${'e'.repeat(64)},'attack',now(),'{}'),(${rb},${b},${eb},${eb2},'DEPENDENCY','OBSERVED',${'f'.repeat(64)},'attack',now(),'{}')`;
        await tx`INSERT INTO constellation_events(id,organization_id,event_type,entity_id,evidence_state,summary,evidence_hash,source,occurred_at,metadata) VALUES(${eva},${a},'CHANGE',${ea},'OBSERVED','A event',${'1'.repeat(64)},'attack',now(),'{}'),(${evb},${b},'CHANGE',${eb},'OBSERVED','B event',${'2'.repeat(64)},'attack',now(),'{}')`;
        await tx`INSERT INTO customer_reports(id,organization_id,report_type,as_of,coverage_state,content,content_hash) VALUES(${reportA},${a},'ATTACK',now(),'SUPPORTED','{}',${'3'.repeat(64)}),(${reportB},${b},'ATTACK',now(),'SUPPORTED','{}',${'4'.repeat(64)})`;
        await tx`INSERT INTO evidence_sources(id,organization_id,source_type,name,collector) VALUES(${srcA},${a},'TEST','A','attack'),(${srcB},${b},'TEST','B','attack')`;
        await tx`INSERT INTO canonical_observations(id,organization_id,source_id,subject_type,subject_id,observation_type,content,content_digest,observed_at,collected_at,validation_state) VALUES(${obsA},${a},${srcA},'SYSTEM','a','TEST','{}',${'5'.repeat(64)},now(),now(),'OBSERVED'),(${obsB},${b},${srcB},'SYSTEM','b','TEST','{}',${'6'.repeat(64)},now(),now(),'OBSERVED')`;
        await tx`INSERT INTO canonical_evidence(id,organization_id,observation_id,evidence_type,digest,validation_state) VALUES(${evidA},${a},${obsA},'TEST',${'7'.repeat(64)},'OBSERVED'),(${evidB},${b},${obsB},'TEST',${'8'.repeat(64)},'OBSERVED')`;
        await tx.unsafe(`SET LOCAL ROLE ${role}`);
        await tx`SELECT set_config('app.organization_id',${a},true)`;
        for(const [label,id,table] of [
          ['foreign entity',eb,'constellation_entities'],['foreign relationship',rb,'constellation_relationships'],
          ['foreign event',evb,'constellation_events'],['foreign report',reportB,'customer_reports'],
          ['foreign evidence',evidB,'canonical_evidence'],['guessed UUID',guessed,'constellation_entities']
        ] as const){
          const found=await tx.unsafe(`SELECT id FROM ${table} WHERE id=$1`,[id]);
          expect(found,label).toHaveLength(0);
        }
        expect(await tx`SELECT id FROM constellation_entities WHERE id=${ea}`).toHaveLength(1);
        expect(await tx`SELECT id FROM constellation_relationships WHERE id=${ra}`).toHaveLength(1);
        expect(await tx`SELECT id FROM constellation_events WHERE id=${eva}`).toHaveLength(1);
        expect(await tx`SELECT id FROM customer_reports WHERE id=${reportA}`).toHaveLength(1);
        expect(await tx`SELECT id FROM canonical_evidence WHERE id=${evidA}`).toHaveLength(1);
        throw new Error(ROLLBACK);
      })).rejects.toThrow(ROLLBACK);
    }finally{await admin.end({timeout:5})}
  });
});
