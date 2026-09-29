import { createHash, randomUUID } from 'node:crypto';
import { executionGate, type AuthorityResult } from './authority.js';
export type ExecutionOutcome='OBSERVED_SUCCEEDED'|'OBSERVED_FAILED'|'BLOCKED'|'UNKNOWN';
export interface ExecutionRequest{organizationId:string;actorEntityId:string;actionType:string;targetReference?:string|null;payload:unknown;authority:AuthorityResult;idempotencyKey?:string}
export interface ExecutionReceipt{id:string;organizationId:string;actorEntityId:string;actionType:string;targetReference:string|null;payloadDigest:string;idempotencyKey:string|null;gate:'ALLOW_EXECUTION'|'DENY_EXECUTION'|'HOLD_UNKNOWN';outcome:ExecutionOutcome;authorityDecision:AuthorityResult['decision'];authorityEvaluationId:string;occurredAt:string;evidenceState:'OBSERVED'|'UNKNOWN';receiptDigest:string}
const canonical=(v:unknown):string=>{if(v===null||typeof v==='string'||typeof v==='boolean')return JSON.stringify(v);if(typeof v==='number'){if(!Number.isFinite(v))throw Error('NON_FINITE_VALUE');return JSON.stringify(v)}if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';if(typeof v==='object'){const o=v as Record<string,unknown>;return '{'+Object.keys(o).sort().map(k=>JSON.stringify(k)+':'+canonical(o[k])).join(',')+'}'}throw Error('UNSUPPORTED_VALUE')};
const digest=(v:unknown)=>createHash('sha256').update(canonical(v)).digest('hex');
const seal=(x:Omit<ExecutionReceipt,'receiptDigest'>):ExecutionReceipt=>({...x,receiptDigest:digest(x)});
export async function executeGoverned(req:ExecutionRequest,executor:(payload:unknown)=>Promise<void>,now=()=>new Date()):Promise<ExecutionReceipt>{
 const gate=executionGate(req.authority), base={id:randomUUID(),organizationId:req.organizationId,actorEntityId:req.actorEntityId,actionType:req.actionType,targetReference:req.targetReference??null,payloadDigest:digest(req.payload),idempotencyKey:req.idempotencyKey??null,gate,authorityDecision:req.authority.decision,authorityEvaluationId:req.authority.id,occurredAt:now().toISOString()};
 if(gate==='DENY_EXECUTION')return seal({...base,outcome:'BLOCKED',evidenceState:'OBSERVED'});
 if(gate==='HOLD_UNKNOWN')return seal({...base,outcome:'UNKNOWN',evidenceState:'UNKNOWN'});
 try{await executor(req.payload);return seal({...base,outcome:'OBSERVED_SUCCEEDED',evidenceState:'OBSERVED'})}catch{return seal({...base,outcome:'OBSERVED_FAILED',evidenceState:'OBSERVED'})}
}
