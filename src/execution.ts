import { createHash, randomUUID } from 'node:crypto';
import { executionGate, type AuthorityResult } from './authority.js';

export type ExecutionOutcome='OBSERVED_SUCCEEDED'|'OBSERVED_FAILED'|'DENIED_NOT_EXECUTED'|'UNKNOWN';
export interface ExternalExecutionReceipt {
 externalEventId:string;
 status:'SUCCEEDED'|'FAILED';
 occurredAt:string;
 providerIdentity?:string;
 proof?:string;
}
export type ExecutionReceiptVerifier=(receipt:ExternalExecutionReceipt,context:{
 organizationId:string;actorEntityId:string;actionType:string;payloadDigest:string;idempotencyKey:string;
})=>Promise<boolean>|boolean;
export interface ExecutionRequest{organizationId:string;actorEntityId:string;actionType:string;targetReference?:string|null;payload:unknown;authority:AuthorityResult;idempotencyKey?:string}
export interface ExecutionReceipt{
 id:string;organizationId:string;actorEntityId:string;actionType:string;targetReference:string|null;
 payloadDigest:string;idempotencyKey:string|null;gate:'ALLOW_EXECUTION'|'DENY_EXECUTION'|'HOLD_UNKNOWN';
 outcome:ExecutionOutcome;authorityDecision:AuthorityResult['decision'];authorityEvaluationId:string;
 occurredAt:string;evidenceState:'OBSERVED'|'UNKNOWN';externalEventId:string|null;receiptDigest:string;
}
const canonical=(v:unknown):string=>{if(v===null||typeof v==='string'||typeof v==='boolean')return JSON.stringify(v);if(typeof v==='number'){if(!Number.isFinite(v))throw Error('NON_FINITE_VALUE');return JSON.stringify(v)}if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';if(typeof v==='object'){const o=v as Record<string,unknown>;return '{'+Object.keys(o).sort().map(k=>JSON.stringify(k)+':'+canonical(o[k])).join(',')+'}'}throw Error('UNSUPPORTED_VALUE')};
const digest=(v:unknown)=>createHash('sha256').update(canonical(v)).digest('hex');
const seal=(x:Omit<ExecutionReceipt,'receiptDigest'>):ExecutionReceipt=>({...x,receiptDigest:digest(x)});

export async function executeGoverned(
 req:ExecutionRequest,
 executor:(payload:unknown)=>Promise<ExternalExecutionReceipt>,
 now=()=>new Date(),
 verifyReceipt?:ExecutionReceiptVerifier,
):Promise<ExecutionReceipt>{
 if(!req.idempotencyKey||!req.idempotencyKey.trim()||req.idempotencyKey.length>200)throw Error('EXECUTION_IDEMPOTENCY_KEY_REQUIRED');
 const gate=executionGate(req.authority);
 const base={
  id:randomUUID(),organizationId:req.organizationId,actorEntityId:req.actorEntityId,actionType:req.actionType,
  targetReference:req.targetReference??null,payloadDigest:digest(req.payload),idempotencyKey:req.idempotencyKey,
  gate,authorityDecision:req.authority.decision,authorityEvaluationId:req.authority.id,occurredAt:now().toISOString(),
  externalEventId:null as string|null,
 };
 if(gate==='DENY_EXECUTION')return seal({...base,outcome:'DENIED_NOT_EXECUTED',evidenceState:'OBSERVED'});
 if(gate==='HOLD_UNKNOWN')return seal({...base,outcome:'UNKNOWN',evidenceState:'UNKNOWN'});
 try{
  const external=await executor(req.payload);
  if(!external||typeof external.externalEventId!=='string'||!external.externalEventId||
     !['SUCCEEDED','FAILED'].includes(external.status)||!Number.isFinite(Date.parse(external.occurredAt)))
   return seal({...base,outcome:'UNKNOWN',evidenceState:'UNKNOWN'});
  const occurred=Date.parse(external.occurredAt),started=Date.parse(base.occurredAt);
  if(occurred<started||occurred>Date.now()+300000)return seal({...base,outcome:'UNKNOWN',evidenceState:'UNKNOWN'});
  if(verifyReceipt){
   const verified=await verifyReceipt(external,{
    organizationId:req.organizationId,actorEntityId:req.actorEntityId,actionType:req.actionType,
    payloadDigest:base.payloadDigest,idempotencyKey:req.idempotencyKey,
   });
   if(!verified)return seal({...base,outcome:'UNKNOWN',evidenceState:'UNKNOWN'});
  }
  return seal({...base,occurredAt:external.occurredAt,externalEventId:external.externalEventId,
   outcome:external.status==='SUCCEEDED'?'OBSERVED_SUCCEEDED':'OBSERVED_FAILED',evidenceState:'OBSERVED'});
 }catch{return seal({...base,outcome:'UNKNOWN',evidenceState:'UNKNOWN'})}
}
