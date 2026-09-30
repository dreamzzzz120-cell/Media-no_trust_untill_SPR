import postgres from 'postgres';
import { randomUUID } from 'node:crypto';

export interface M2MGrant {
  id:string; organizationId:string; envelopeDigest:string; issuerMachineId:string; subjectMachineId:string; subjectPassportId:string;
  requestedAction:string; authorityEvaluationId:string; authorityDecision:'AUTHORIZED'|'NOT_AUTHORIZED'|'UNKNOWN';
  trustDecision:'VERIFIED'|'PARTIAL'|'UNKNOWN'|'DENIED'|'REVOKED'|'EXPIRED'; expiresAt:string; createdAt:string; completedAt:string|null;
}

export class M2MStore {
  private readonly sql: postgres.Sql | null;
  constructor(url?:string){this.sql=url?postgres(url,{prepare:false}):null}
  async ready(){if(!this.sql)return false;try{await this.sql\`SELECT 1 FROM m2m_trust_grants LIMIT 0\`;return true}catch{return false}}
  async claimNonce(org:string,issuerMachineId:string,nonce:string,expiresAt:string){
    if(!this.sql)return false;
    try{await this.sql\`INSERT INTO m2m_trust_nonces(id,organization_id,issuer_machine_id,nonce,expires_at) VALUES(\${randomUUID()},\${org},\${issuerMachineId},\${nonce},\${expiresAt})\`;return true}
    catch(e:any){if(String(e?.code)==='23505')return false;throw e}
  }
  async createGrant(input:Omit<M2MGrant,'id'|'createdAt'|'completedAt'>){
    if(!this.sql)throw Error('M2M_STORE_UNAVAILABLE');
    const id=randomUUID();
    const rows=await this.sql<any[]>\`INSERT INTO m2m_trust_grants(id,organization_id,envelope_digest,issuer_machine_id,subject_machine_id,subject_passport_id,requested_action,authority_evaluation_id,authority_decision,trust_decision,expires_at) VALUES(\${id},\${input.organizationId},\${input.envelopeDigest},\${input.issuerMachineId},\${input.subjectMachineId},\${input.subjectPassportId},\${input.requestedAction},\${input.authorityEvaluationId},\${input.authorityDecision},\${input.trustDecision},\${input.expiresAt}) RETURNING created_at\`;
    return{id,...input,createdAt:new Date(rows[0].created_at).toISOString(),completedAt:null};
  }
  async grant(org:string,id:string){
    if(!this.sql)return null;
    const r=await this.sql<any[]>\`SELECT * FROM m2m_trust_grants WHERE organization_id=\${org} AND id=\${id} LIMIT 1\`;
    const x=r[0];if(!x)return null;
    return{id:x.id,organizationId:x.organization_id,envelopeDigest:x.envelope_digest,issuerMachineId:x.issuer_machine_id,subjectMachineId:x.subject_machine_id,subjectPassportId:x.subject_passport_id,requestedAction:x.requested_action,authorityEvaluationId:x.authority_evaluation_id,authorityDecision:x.authority_decision,trustDecision:x.trust_decision,expiresAt:new Date(x.expires_at).toISOString(),createdAt:new Date(x.created_at).toISOString(),completedAt:x.completed_at?new Date(x.completed_at).toISOString():null} as M2MGrant;
  }
  async complete(org:string,id:string,input:{executionOutcome:string;evidenceDigest:string|null;receiptDigest:string;observedAt:string;sprReceiptId:string|null;sprAckDigest:string|null}){
    if(!this.sql)throw Error('M2M_STORE_UNAVAILABLE');
    const rows=await this.sql<any[]>\`UPDATE m2m_trust_grants SET completed_at=\${input.observedAt} WHERE organization_id=\${org} AND id=\${id} AND completed_at IS NULL AND expires_at>CURRENT_TIMESTAMP RETURNING id\`;
    if(!rows.length)return false;
    await this.sql\`INSERT INTO m2m_trust_receipts(id,organization_id,grant_id,execution_outcome,evidence_digest,receipt_digest,observed_at,spr_receipt_id,spr_ack_digest) VALUES(\${randomUUID()},\${org},\${id},\${input.executionOutcome},\${input.evidenceDigest},\${input.receiptDigest},\${input.observedAt},\${input.sprReceiptId},\${input.sprAckDigest})\`;
    return true;
  }
  async close(){if(this.sql)await this.sql.end({timeout:5})}
}
