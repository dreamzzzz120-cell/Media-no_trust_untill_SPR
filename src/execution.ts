import { createHash, randomUUID } from 'node:crypto';
import { executionGate, type AuthorityResult } from './authority.js';
export type ExecutionOutcome='OBSERVED_SUCCEEDED'|'OBSERVED_FAILED'|'BLOCKED'|'UNKNOWN';
export interface ExecutionRequest{organizationId:string;actorEntityId:string;actionType:string;targetReference?:string|null;payload:unknown;authority:AuthorityResult}
export interface ExecutionReceipt{id:string;organizationId:string;actorEntityId:string;actionType:string;targetReference:string|null;payloadDigest:string;gate:'ALLOW_EXECUTION'|'DENY_EXECUTION'|'HOLD_UNKNOWN';outcome:ExecutionOutcome;authorityDecision:AuthorityResult['decision'];authorityEvaluationId:string;occurredAt:string;evidenceState:'OBSERVED'|'UNKNOWN'}
const digest=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
export async function executeGoverned(req:ExecutionRequest,executor:(payload:unknown)=>Promise<void>,now=()=>new Date()):Promise<ExecutionReceipt>{
 const gate=executionGate(req.authority), base={id:randomUUID(),organizationId:req.organizationId,actorEntityId:req.actorEntityId,actionType:req.actionType,targetReference:req.targetReference??null,payloadDigest:digest(req.payload),gate,authorityDecision:req.authority.decision,authorityEvaluationId:req.authority.id,occurredAt:now().toISOString()};
 if(gate==='DENY_EXECUTION')return{...base,outcome:'BLOCKED',evidenceState:'OBSERVED'};
 if(gate==='HOLD_UNKNOWN')return{...base,outcome:'UNKNOWN',evidenceState:'UNKNOWN'};
 try{await executor(req.payload);return{...base,outcome:'OBSERVED_SUCCEEDED',evidenceState:'OBSERVED'}}catch{return{...base,outcome:'OBSERVED_FAILED',evidenceState:'OBSERVED'}}
}
