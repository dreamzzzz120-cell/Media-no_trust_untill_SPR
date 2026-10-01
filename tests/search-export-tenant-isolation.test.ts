import postgres from 'postgres';
import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { CustomerProjectionStore } from '../src/customer-projections.js';
import { PrivacyExecutionStore } from '../src/privacy-execution.js';
import { StarDnaStore } from '../src/star-dna.js';

const url=process.env.DATABASE_URL;

describe.skipIf(!url)('search/filter/export tenant isolation',()=>{
  it('prevents foreign records from appearing in projections, exports, and lineage',async()=>{
    const admin=postgres(url!,{prepare:false});
    const a=randomUUID(),b=randomUUID();
    const aParent=randomUUID(),aChild=randomUUID(),bParent=randomUUID(),bChild=randomUUID();
    const srcA=randomUUID(),srcB=randomUUID(),obsA=randomUUID(),obsB=randomUUID(),evA=randomUUID(),evB=randomUUID();
    await admin`INSERT INTO organizations(id,name) VALUES(${a},'Search A'),(${b},'Search B')`;
    for(const [id,org,key,name,h] of [
      [aParent,a,'search-a-parent','Search A Parent','a'],
      [aChild,a,'search-a-child','Search A Child','b'],
      [bParent,b,'search-b-parent','Search B Parent','c'],
      [bChild,b,'search-b-child','Search B Child','d']
    ] as const){
      await admin`INSERT INTO constellation_entities(id,organization_id,identity_key,entity_type,name,evidence_state,evidence_hash,source,first_observed_at,last_observed_at,metadata) VALUES(${id},${org},${key},'SYSTEM',${name},'OBSERVED',${h.repeat(64)},'test',now(),now(),'{}')`;
    }
    await admin`INSERT INTO evidence_sources(id,organization_id,source_type,name,collector) VALUES(${srcA},${a},'TEST','A','test'),(${srcB},${b},'TEST','B','test')`;
    await admin`INSERT INTO canonical_observations(id,organization_id,source_id,subject_type,subject_id,observation_type,content,content_digest,observed_at,collected_at,validation_state) VALUES
      (${obsA},${a},${srcA},'SYSTEM','shared-subject','TEST','{"tenant":"A"}',${'e'.repeat(64)},now(),now(),'OBSERVED'),
      (${obsB},${b},${srcB},'SYSTEM','shared-subject','TEST','{"tenant":"B"}',${'f'.repeat(64)},now(),now(),'OBSERVED')`;
    await admin`INSERT INTO canonical_evidence(id,organization_id,observation_id,evidence_type,digest,validation_state) VALUES
      (${evA},${a},${obsA},'TEST',${'1'.repeat(64)},'OBSERVED'),
      (${evB},${b},${obsB},'TEST',${'2'.repeat(64)},'OBSERVED')`;
    await admin`INSERT INTO universe_provenance_edges(id,organization_id,parent_entity_id,child_entity_id,edge_type,evidence_hash,source,occurred_at,observed_at) VALUES
      (${randomUUID()},${a},${aParent},${aChild},'DERIVED_FROM',${'3'.repeat(64)},'test',now(),now()),
      (${randomUUID()},${b},${bParent},${bChild},'DERIVED_FROM',${'4'.repeat(64)},'test',now(),now())`;
    const projection=new CustomerProjectionStore(url!);
    const privacy=new PrivacyExecutionStore(url!);
    const dna=new StarDnaStore(url!);
    try{
      const dash=await projection.dashboard(a,new Date().toISOString(),500);
      expect(dash.evidence.map((x:any)=>x.id)).toContain(evA);
      expect(dash.evidence.map((x:any)=>x.id)).not.toContain(evB);

      const passport=await projection.passport(a,'SYSTEM','shared-subject',new Date().toISOString());
      expect(passport.evidence.map((x:any)=>x.id)).toContain(evA);
      expect(passport.evidence.map((x:any)=>x.id)).not.toContain(evB);

      const job=await privacy.requestExport(a,'FULL',new Date().toISOString(),'attack-test');
      expect(await privacy.job(b,'EXPORT',job.id)).toBeNull();
      expect((await privacy.job(a,'EXPORT',job.id))?.job.organization_id).toBe(a);

      const ownLineage=await dna.lineage(a,aChild,new Date().toISOString(),50);
      expect(ownLineage.length).toBeGreaterThan(0);
      const foreignLineage=await dna.lineage(a,bChild,new Date().toISOString(),50);
      expect(foreignLineage).toEqual([]);
    }finally{
      await projection.close(); await privacy.close(); await dna.close(); await admin.end({timeout:5});
    }
  });
});
