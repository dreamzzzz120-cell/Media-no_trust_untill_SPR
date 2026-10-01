import postgres from 'postgres';
import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { CustomerProjectionStore } from '../src/customer-projections.js';
import { PrivacyExecutionStore } from '../src/privacy-execution.js';
import { StarDnaStore } from '../src/star-dna.js';

const url=process.env.DATABASE_URL;
const ROLLBACK='__SEARCH_EXPORT_ATTACK_ROLLBACK__';

describe.skipIf(!url)('search/filter/export tenant isolation',()=>{
  it('prevents foreign records from appearing in projections, exports, and lineage',async()=>{
    const admin=postgres(url!,{prepare:false});
    try{
      await expect(admin.begin(async tx=>{
        const a=randomUUID(),b=randomUUID(),ea=randomUUID(),eb=randomUUID();
        await tx`INSERT INTO organizations(id,name) VALUES(${a},'Search A'),(${b},'Search B')`;
        await tx`INSERT INTO constellation_entities(id,organization_id,identity_key,entity_type,name,evidence_state,evidence_hash,source,first_observed_at,last_observed_at,metadata) VALUES
          (${ea},${a},'search-a','SYSTEM','Search A','OBSERVED',${'a'.repeat(64)},'test',now(),now(),'{}'),
          (${eb},${b},'search-b','SYSTEM','Search B','OBSERVED',${'b'.repeat(64)},'test',now(),now(),'{}')`;
        const srcA=randomUUID(),srcB=randomUUID(),obsA=randomUUID(),obsB=randomUUID(),evA=randomUUID(),evB=randomUUID();
        await tx`INSERT INTO evidence_sources(id,organization_id,source_type,name,collector) VALUES(${srcA},${a},'TEST','A','test'),(${srcB},${b},'TEST','B','test')`;
        await tx`INSERT INTO canonical_observations(id,organization_id,source_id,subject_type,subject_id,observation_type,content,content_digest,observed_at,collected_at,validation_state) VALUES
          (${obsA},${a},${srcA},'SYSTEM','shared-subject','TEST','{"tenant":"A"}',${'c'.repeat(64)},now(),now(),'OBSERVED'),
          (${obsB},${b},${srcB},'SYSTEM','shared-subject','TEST','{"tenant":"B"}',${'d'.repeat(64)},now(),now(),'OBSERVED')`;
        await tx`INSERT INTO canonical_evidence(id,organization_id,observation_id,evidence_type,digest,validation_state) VALUES
          (${evA},${a},${obsA},'TEST',${'e'.repeat(64)},'OBSERVED'),
          (${evB},${b},${obsB},'TEST',${'f'.repeat(64)},'OBSERVED')`;
        const edgeA=randomUUID(),edgeB=randomUUID();
        await tx`INSERT INTO universe_provenance_edges(id,organization_id,parent_entity_id,child_entity_id,edge_type,evidence_hash,source,occurred_at,observed_at) VALUES
          (${edgeA},${a},${ea},${ea},'OTHER',${'1'.repeat(64)},'test',now(),now()),
          (${edgeB},${b},${eb},${eb},'OTHER',${'2'.repeat(64)},'test',now(),now())`.catch(()=>undefined);
        const projection=new CustomerProjectionStore(url!);
        const privacy=new PrivacyExecutionStore(url!);
        const dna=new StarDnaStore(url!);
        try{
          const dash=await projection.dashboard(a,new Date().toISOString(),500);
          expect(dash.evidence.every((x:any)=>x.id!==evB)).toBe(true);
          const passport=await projection.passport(a,'SYSTEM','shared-subject',new Date().toISOString());
          expect(passport.evidence.every((x:any)=>x.id!==evB)).toBe(true);
          const job=await privacy.requestExport(a,'FULL',new Date().toISOString(),'attack-test');
          const foreign=await privacy.job(b,'EXPORT',job.id);
          expect(foreign).toBeNull();
          const local=await privacy.job(a,'EXPORT',job.id);
          expect(local?.job.organization_id).toBe(a);
          const lineage=await dna.lineage(a,eb,new Date().toISOString(),50);
          expect(lineage).toEqual([]);
        }finally{
          await projection.close(); await privacy.close(); await dna.close();
        }
        throw new Error(ROLLBACK);
      })).rejects.toThrow(ROLLBACK);
    }finally{await admin.end({timeout:5})}
  });
});
