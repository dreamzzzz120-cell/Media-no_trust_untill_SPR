import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
const url=process.env.DATABASE_URL;

describe.skipIf(!url)('wormhole M2M PostgreSQL adversarial gate',()=>{
  it('rejects replay, invalid expiry, cross-tenant proof references, and missing signatures independently',async()=>{
    const sql=postgres(url!,{prepare:false});
    try{
      const a=randomUUID(),b=randomUUID(),a1=randomUUID(),a2=randomUUID(),b1=randomUUID(),b2=randomUUID();
      await sql`INSERT INTO organizations(id,name) VALUES(${a},'M2M A'),(${b},'M2M B')`;
      for(const [id,org,key] of [[a1,a,'m2m-a1'],[a2,a,'m2m-a2'],[b1,b,'m2m-b1'],[b2,b,'m2m-b2']] as const)
        await sql`INSERT INTO constellation_entities(id,organization_id,identity_key,entity_type,name,evidence_state,evidence_hash,source,first_observed_at,last_observed_at,metadata) VALUES(${id},${org},${key},'API',${key},'OBSERVED',${'a'.repeat(64)},'m2m-test',now(),now(),'{}')`;
      await sql`INSERT INTO universe_wormhole_proofs(id,organization_id,issuer_entity_id,subject_entity_id,scope,authority_statement,freshness_at,evidence_digest,signature,expires_at,verification_state,verification_evidence_hash,transaction_id,protocol,direction) VALUES(${randomUUID()},${a},${a1},${a2},'{}','{}',now(),${'b'.repeat(64)},'sig-placeholder',now()+interval '10 minutes','SUPPORTED',${'c'.repeat(64)},'txn-1','SPR-M2M','OUTBOUND')`;

      await expect(sql`INSERT INTO universe_wormhole_proofs(id,organization_id,issuer_entity_id,subject_entity_id,scope,authority_statement,freshness_at,evidence_digest,signature,expires_at,verification_state,verification_evidence_hash,transaction_id,protocol,direction) VALUES(${randomUUID()},${a},${a1},${a2},'{}','{}',now(),${'d'.repeat(64)},'other',now()+interval '10 minutes','SUPPORTED',${'e'.repeat(64)},'txn-1','SPR-M2M','OUTBOUND')`).rejects.toThrow();

      await expect(sql`INSERT INTO universe_wormhole_proofs(id,organization_id,issuer_entity_id,subject_entity_id,scope,authority_statement,freshness_at,evidence_digest,signature,expires_at,verification_state,verification_evidence_hash,transaction_id,protocol,direction) VALUES(${randomUUID()},${a},${a1},${a2},'{}','{}',now(),${'f'.repeat(64)},'expired',now()-interval '1 second','SUPPORTED',${'1'.repeat(64)},'txn-expired','SPR-M2M','OUTBOUND')`).rejects.toThrow();

      await expect(sql`INSERT INTO universe_wormhole_proofs(id,organization_id,issuer_entity_id,subject_entity_id,scope,authority_statement,freshness_at,evidence_digest,signature,expires_at,verification_state,verification_evidence_hash,transaction_id,protocol,direction) VALUES(${randomUUID()},${a},${b1},${a2},'{}','{}',now(),${'2'.repeat(64)},'cross-tenant',now()+interval '10 minutes','SUPPORTED',${'3'.repeat(64)},'txn-cross','SPR-M2M','OUTBOUND')`).rejects.toThrow();

      await expect(sql`INSERT INTO universe_wormhole_proofs(id,organization_id,issuer_entity_id,subject_entity_id,scope,authority_statement,freshness_at,evidence_digest,signature,expires_at,verification_state,verification_evidence_hash,transaction_id,protocol,direction) VALUES(${randomUUID()},${a},${a1},${a2},'{}','{}',now(),${'4'.repeat(64)},NULL,now()+interval '10 minutes','SUPPORTED',${'5'.repeat(64)},'txn-nosig','SPR-M2M','OUTBOUND')`).rejects.toThrow();
    }finally{await sql.end({timeout:5})}
  });
});
