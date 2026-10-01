import postgres from 'postgres';
import { withTenant } from './db-tenant.js';

export type WormholeProofExpectation={
  proofId:string;
  issuerEntityId:string;
  subjectEntityId:string;
  transactionId:string;
  protocol:string;
  direction:'OUTBOUND'|'INBOUND'|'BIDIRECTIONAL';
  evidenceDigest:string;
};

export interface WormholeProofVerifier{
  ready():Promise<boolean>;
  verify(org:string,expected:WormholeProofExpectation):Promise<boolean>;
  close():Promise<void>;
}

export function createWormholeProofVerifier(url?:string):WormholeProofVerifier{
  return url?new PgVerifier(postgres(url,{prepare:false})):new UnavailableVerifier();
}
class UnavailableVerifier implements WormholeProofVerifier{
  async ready(){return false}
  async verify(){return false}
  async close(){}
}
class PgVerifier implements WormholeProofVerifier{
  constructor(private sql:postgres.Sql){}
  async ready(){try{await this.sql`SELECT 1 FROM universe_wormhole_proofs LIMIT 0`;return true}catch{return false}}
  async verify(org:string,e:WormholeProofExpectation){
    return withTenant(this.sql,org,async tx=>{
      const rows=await tx<any[]>`SELECT id
        FROM universe_wormhole_proofs
        WHERE organization_id=${org}
          AND id=${e.proofId}::uuid
          AND issuer_entity_id=${e.issuerEntityId}::uuid
          AND subject_entity_id=${e.subjectEntityId}::uuid
          AND transaction_id=${e.transactionId}
          AND protocol=${e.protocol}
          AND direction=${e.direction}
          AND evidence_digest=${e.evidenceDigest}
          AND verification_state='SUPPORTED'
          AND signature IS NOT NULL
          AND verification_evidence_hash IS NOT NULL
          AND freshness_at<=now()
          AND expires_at>now()
        LIMIT 1`;
      return rows.length===1;
    });
  }
  async close(){await this.sql.end({timeout:5})}
}
